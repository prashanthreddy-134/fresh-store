import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prismaClient.js";
import { requireAuth } from "../middleware/auth.js";
import { verifyCheckoutSignature, verifyWebhookSignature } from "../services/paymentService.js";
import { notifyOrderStatus } from "../services/notificationService.js";
import { releaseStockForOrder } from "./orders.js";

const router = Router(); // JSON routes — mounted AFTER express.json()
export const webhookRouter = Router(); // raw-body route — mounted BEFORE express.json()

async function markOrderPaidAndConfirmed(order, { paymentId, signature }) {
  if (order.paymentStatus === "PAID") return order; // idempotent

  // Stock was already reserved atomically at checkout time (see routes/orders.js) —
  // it is NOT decremented again here. Decrementing twice would silently oversell
  // in the opposite direction (undercounting available stock).
  const updated = await prisma.order.update({
    where: { id: order.id },
    data: {
      paymentStatus: "PAID",
      status: "CONFIRMED",
      razorpayPaymentId: paymentId,
      razorpaySignature: signature,
      statusHistory: { create: { status: "CONFIRMED", changedBy: "SYSTEM", note: "Payment verified" } },
    },
    include: { items: true, user: true },
  });

  await prisma.cartItem.deleteMany({ where: { userId: updated.userId } });
  if (updated.couponId) {
    await prisma.coupon.update({ where: { id: updated.couponId }, data: { usedCount: { increment: 1 } } });
  }

  await notifyOrderStatus(updated, updated.user);
  return updated;
}

// Development-only payment confirmation.
// Disabled completely in production.
router.post("/payments/dev-confirm", requireAuth, async (req, res) => {
  if (process.env.NODE_ENV === "production") {
    return res.status(404).json({ error: "Not found" });
  }

  const schema = z.object({
    orderId: z.string().uuid(),
  });

  const parsed = schema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      error: "Invalid order ID",
    });
  }

  const order = await prisma.order.findFirst({
    where: {
      id: parsed.data.orderId,
      userId: req.user.id,
    },
  });

  if (!order) {
    return res.status(404).json({
      error: "Order not found",
    });
  }

  if (order.paymentStatus === "PAID") {
    return res.json({
      message: "Development payment already confirmed",
      order,
    });
  }

  const updatedOrder = await markOrderPaidAndConfirmed(order, {
    paymentId: `dev_payment_${Date.now()}`,
    signature: "development",
  });

  return res.json({
    message: "Development payment confirmed",
    order: updatedOrder,
  });
});

// Called by the frontend immediately after Razorpay Checkout succeeds client-side.
// This gives the user instant feedback, but it is NOT fully trusted on its own —
// the webhook below is the authoritative confirmation in case this call is skipped or spoofed.
router.post("/payments/verify", requireAuth, async (req, res) => {

  // Development-only payment confirmation.
// This must never be available in production.
router.post("/payments/dev-confirm", requireAuth, async (req, res) => {
  if (process.env.NODE_ENV === "production") {
    return res.status(404).json({ error: "Not found" });
  }

  const schema = z.object({
    orderId: z.string().uuid(),
  });

  const parsed = schema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      error: parsed.error.errors[0].message,
    });
  }

  const order = await prisma.order.findFirst({
    where: {
      id: parsed.data.orderId,
      userId: req.user.id,
    },
  });

  if (!order) {
    return res.status(404).json({
      error: "Order not found",
    });
  }

  if (order.paymentStatus === "PAID") {
    return res.json({
      message: "Development payment already confirmed",
      order,
    });
  }

  const updated = await markOrderPaidAndConfirmed(order, {
    paymentId: `dev_payment_${Date.now()}`,
    signature: "development",
  });

  res.json({
    message: "Development payment confirmed",
    order: updated,
  });
});


  const schema = z.object({
    razorpayOrderId: z.string(),
    razorpayPaymentId: z.string(),
    razorpaySignature: z.string(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.errors[0].message });

  const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = parsed.data;

  const valid = verifyCheckoutSignature({ orderId: razorpayOrderId, paymentId: razorpayPaymentId, signature: razorpaySignature });
  if (!valid) return res.status(400).json({ error: "Payment signature verification failed" });

  const order = await prisma.order.findFirst({ where: { razorpayOrderId, userId: req.user.id } });
  if (!order) return res.status(404).json({ error: "Order not found" });

  const updated = await markOrderPaidAndConfirmed(order, { paymentId: razorpayPaymentId, signature: razorpaySignature });
  res.json({ message: "Payment verified", order: updated });
});

// Razorpay webhook — the source of truth. Configure this URL in the Razorpay dashboard
// as https://yourdomain.com/api/payments/webhook and set RAZORPAY_WEBHOOK_SECRET to match.
// Mounted with express.raw() in index.js so the raw body is available for signature checking.
webhookRouter.post("/", async (req, res) => {
  const signature = req.headers["x-razorpay-signature"];
  const valid = verifyWebhookSignature({ rawBody: req.body, signature });
  if (!valid) return res.status(400).json({ error: "Invalid webhook signature" });

  const event = JSON.parse(req.body.toString());

  if (event.event === "payment.captured") {
    const payment = event.payload.payment.entity;
    const order = await prisma.order.findFirst({ where: { razorpayOrderId: payment.order_id } });
    if (order) {
      await markOrderPaidAndConfirmed(order, { paymentId: payment.id, signature: "webhook" });
    }
  }

  if (event.event === "payment.failed") {
    const payment = event.payload.payment.entity;
    const order = await prisma.order.findFirst({ where: { razorpayOrderId: payment.order_id } });
    if (order && order.paymentStatus !== "PAID") {
      // Release the stock this order was holding — it never actually got paid for,
      // so those units need to go back on the shelf for other customers.
      await releaseStockForOrder(order.id);
      await prisma.order.update({
        where: { id: order.id },
        data: {
          paymentStatus: "FAILED",
          status: "CANCELLED",
          cancelledAt: new Date(),
          cancelReason: "Payment failed",
          statusHistory: { create: { status: "CANCELLED", changedBy: "SYSTEM", note: "Payment failed" } },
        },
      });
    }
  }

  res.json({ received: true });
});

export default router;
