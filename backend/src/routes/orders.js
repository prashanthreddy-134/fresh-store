import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prismaClient.js";
import { requireAuth } from "../middleware/auth.js";
import { createRazorpayOrder, refundPayment } from "../services/paymentService.js";
import { calculateCouponDiscount, calculateDeliveryFee, calculateOrderTotal, isCouponUsable } from "../utils/pricing.js";

const router = Router();
router.use(requireAuth);

async function nextOrderNumber() {
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const countToday = await prisma.order.count({
    where: { orderNumber: { startsWith: `FS-${today}` } },
  });
  return `FS-${today}-${String(countToday + 1).padStart(4, "0")}`;
}

// Releases a stock reservation back to inventory. Used when an order is cancelled,
// when its payment fails, or when it's swept up as a stale abandoned reservation.
// Exported so payments.js (webhook) and the stale-order sweep can reuse it —
// stock accounting must go through exactly one code path or it will drift.
export async function releaseStockForOrder(orderId) {
  const items = await prisma.orderItem.findMany({ where: { orderId } });
  await prisma.$transaction(
    items.map((i) => prisma.product.update({ where: { id: i.productId }, data: { stockQty: { increment: i.quantity } } }))
  );
}

// Create an order from the current cart + chosen address + optional coupon.
// Stock is RESERVED atomically here (not just checked) — this is what actually
// prevents overselling when two customers check out the same last-unit item at once.
// The order is created in PENDING_PAYMENT with stock already decremented; if payment
// never completes, the reservation is released (see releaseStockForOrder below,
// called from payment failure webhook, order cancellation, and the stale-order sweep).
router.post("/orders/checkout", async (req, res) => {
  const schema = z.object({ addressId: z.string().uuid(), couponCode: z.string().optional() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.errors[0].message });

  const { addressId, couponCode } = parsed.data;

  const address = await prisma.address.findFirst({ where: { id: addressId, userId: req.user.id } });
  if (!address) return res.status(404).json({ error: "Address not found" });

  const cartItems = await prisma.cartItem.findMany({
    where: { userId: req.user.id },
    include: { product: true },
  });
  if (cartItems.length === 0) return res.status(400).json({ error: "Cart is empty" });

  for (const item of cartItems) {
    if (!item.product.isActive) return res.status(400).json({ error: `${item.product.name} is no longer available` });
  }

  const subtotal = cartItems.reduce((sum, i) => sum + Number(i.product.sellingPrice) * i.quantity, 0);

  let discount = 0;
  let coupon = null;
  if (couponCode) {
    coupon = await prisma.coupon.findUnique({ where: { code: couponCode.toUpperCase() } });
    const usable = isCouponUsable(coupon, subtotal);
    if (!usable.ok) return res.status(400).json({ error: usable.reason });
    discount = calculateCouponDiscount(subtotal, coupon);
  }

  const deliveryFee = calculateDeliveryFee(subtotal - discount, {
    flatFee: Number(process.env.DELIVERY_FEE_FLAT || 25),
    freeAbove: Number(process.env.FREE_DELIVERY_ABOVE || 499),
  });
  const total = calculateOrderTotal(subtotal, discount, deliveryFee);

  const orderNumber = await nextOrderNumber();

  let order;
  try {
    order = await prisma.$transaction(async (tx) => {
      // Atomically reserve stock for every item. updateMany's WHERE clause makes this
      // a single conditional UPDATE per item at the database level — if another
      // concurrent checkout already dropped stockQty below what's needed, the
      // affected-row count comes back 0 and we abort the whole transaction, so the
      // customer sees a clear error instead of silently overselling.
      for (const item of cartItems) {
        const result = await tx.product.updateMany({
          where: { id: item.productId, stockQty: { gte: item.quantity } },
          data: { stockQty: { decrement: item.quantity } },
        });
        if (result.count === 0) {
          const fresh = await tx.product.findUnique({ where: { id: item.productId } });
          throw new Error(`Only ${fresh?.stockQty ?? 0} left for ${item.product.name}`);
        }
      }

      return tx.order.create({
        data: {
          orderNumber,
          userId: req.user.id,
          addressId,
          subtotal,
          discount,
          deliveryFee,
          total,
          couponId: coupon?.id,
          items: {
            create: cartItems.map((i) => ({
              productId: i.productId,
              name: i.product.name,
              unit: i.product.unit,
              price: i.product.sellingPrice,
              quantity: i.quantity,
            })),
          },
          statusHistory: { create: { status: "PENDING_PAYMENT", changedBy: "SYSTEM" } },
        },
        include: { items: true },
      });
    });
  } catch (err) {
    return res.status(400).json({ error: err.message || "Could not reserve items for checkout" });
  }

 // Development payment mode.
// No real Razorpay order is created while running locally.
if (process.env.NODE_ENV !== "production") {
  return res.status(201).json({
    order,
    devPayment: true,
  });
}

let razorpayOrder;

try {
  razorpayOrder = await createRazorpayOrder({
    amountInPaise: Math.round(total * 100),
    receipt: order.orderNumber,
    notes: {
      orderId: order.id,
      userId: req.user.id,
    },
  });
} catch (err) {
  // Razorpay order creation failed after stock was reserved.
  // Release the reservation immediately.
  await releaseStockForOrder(order.id);

  await prisma.order.update({
    where: { id: order.id },
    data: {
      status: "CANCELLED",
      cancelReason: "Payment gateway error",
    },
  });

  return res.status(502).json({
    error: "Could not initiate payment. Please try again.",
  });
}

await prisma.order.update({
  where: { id: order.id },
  data: {
    razorpayOrderId: razorpayOrder.id,
  },
});

res.status(201).json({
  order,
  devPayment: false,
  razorpay: {
    orderId: razorpayOrder.id,
    amount: razorpayOrder.amount,
    currency: razorpayOrder.currency,
    keyId: process.env.RAZORPAY_KEY_ID,
  },
});
});

router.get("/orders", async (req, res) => {
  const orders = await prisma.order.findMany({
    where: { userId: req.user.id },
    include: { items: true, address: true },
    orderBy: { placedAt: "desc" },
  });
  res.json(orders);
});

router.get("/orders/:id", async (req, res) => {
  const order = await prisma.order.findFirst({
    where: { id: req.params.id, userId: req.user.id },
    include: { items: true, address: true, statusHistory: { orderBy: { createdAt: "asc" } } },
  });
  if (!order) return res.status(404).json({ error: "Order not found" });
  res.json(order);
});

router.post("/orders/:id/cancel", async (req, res) => {
  const order = await prisma.order.findFirst({ where: { id: req.params.id, userId: req.user.id } });
  if (!order) return res.status(404).json({ error: "Order not found" });
  if (["OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED"].includes(order.status)) {
    return res.status(400).json({ error: `Order cannot be cancelled once ${order.status.toLowerCase()}` });
  }

  const updated = await prisma.order.update({
    where: { id: order.id },
    data: {
      status: "CANCELLED",
      cancelledAt: new Date(),
      cancelReason: req.body?.reason || "Cancelled by customer",
      statusHistory: { create: { status: "CANCELLED", changedBy: req.user.id, note: "Cancelled by customer" } },
    },
  });

  await releaseStockForOrder(order.id);

  // If the order was already paid, issue a real refund via Razorpay rather than
  // just marking it cancelled and leaving the customer's money sitting with you.
  if (order.paymentStatus === "PAID" && order.razorpayPaymentId) {
    try {
      await refundPayment({ paymentId: order.razorpayPaymentId, amountInPaise: Math.round(Number(order.total) * 100) });
      await prisma.order.update({ where: { id: order.id }, data: { paymentStatus: "REFUNDED" } });
    } catch (err) {
      // Don't fail the cancellation over a refund API hiccup — log it clearly so
      // it can be handled manually from the Razorpay dashboard instead of silently lost.
      console.error(`Refund failed for order ${order.orderNumber}:`, err.message);
    }
  }

  res.json(updated);
});

export default router;
