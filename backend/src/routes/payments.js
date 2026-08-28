import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prismaClient.js";
import { requireAuth } from "../middleware/auth.js";
import {
  verifyCheckoutSignature,
  verifyWebhookSignature,
} from "../services/paymentService.js";
import { notifyOrderStatus } from "../services/notificationService.js";
import { releaseStockForOrder } from "./orders.js";

const router = Router();
export const webhookRouter = Router();

async function refundStoreCashForOrder(order) {
  const amount = Number(order.storeCashUsed || 0);

  if (amount <= 0) {
    return;
  }

  await prisma.$transaction(async (tx) => {
    const storeCash = await tx.storeCash.findUnique({
      where: {
        userId: order.userId,
      },
    });

    if (!storeCash) {
      return;
    }

    const before = Number(storeCash.balance);
    const after = before + amount;

    await tx.storeCash.update({
      where: {
        id: storeCash.id,
      },
      data: {
        balance: after,
      },
    });

    await tx.storeCashTransaction.create({
      data: {
        userId: order.userId,
        storeCashId: storeCash.id,
        type: "REFUND",
        amount: amount,
        balanceBefore: before,
        balanceAfter: after,
        description:
          "Store Cash refunded for order " + order.orderNumber,
        orderId: order.id,
        reference:
          "REFUND-" + order.orderNumber,
      },
    });
  });
}

async function markOrderPaidAndConfirmed(
  order,
  { paymentId, signature }
) {
  if (order.paymentStatus === "PAID") {
    return order;
  }

  const updated = await prisma.order.update({
    where: {
      id: order.id,
    },
    data: {
      paymentStatus: "PAID",
      status: "CONFIRMED",
      razorpayPaymentId: paymentId,
      razorpaySignature: signature,
      statusHistory: {
        create: {
          status: "CONFIRMED",
          changedBy: "SYSTEM",
          note: "Payment verified",
        },
      },
    },
    include: {
      items: true,
      user: true,
    },
  });

  await prisma.cartItem.deleteMany({
    where: {
      userId: updated.userId,
    },
  });

  if (updated.couponId) {
    await prisma.coupon.update({
      where: {
        id: updated.couponId,
      },
      data: {
        usedCount: {
          increment: 1,
        },
      },
    });
  }

  await notifyOrderStatus(
    updated,
    updated.user
  );

  return updated;
}

router.post(
  "/payments/dev-confirm",
  requireAuth,
  async (req, res) => {
    if (process.env.NODE_ENV === "production") {
      return res.status(404).json({
        error: "Not found",
      });
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
        order: order,
      });
    }

    const updatedOrder =
      await markOrderPaidAndConfirmed(
        order,
        {
          paymentId:
            "dev_payment_" + Date.now(),
          signature: "development",
        }
      );

    return res.json({
      message: "Development payment confirmed",
      order: updatedOrder,
    });
  }
);

router.post(
  "/payments/verify",
  requireAuth,
  async (req, res) => {
    const schema = z.object({
      razorpayOrderId: z.string(),
      razorpayPaymentId: z.string(),
      razorpaySignature: z.string(),
    });

    const parsed = schema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        error: parsed.error.errors[0].message,
      });
    }

    const razorpayOrderId =
      parsed.data.razorpayOrderId;

    const razorpayPaymentId =
      parsed.data.razorpayPaymentId;

    const razorpaySignature =
      parsed.data.razorpaySignature;

    const valid = verifyCheckoutSignature({
      orderId: razorpayOrderId,
      paymentId: razorpayPaymentId,
      signature: razorpaySignature,
    });

    if (!valid) {
      return res.status(400).json({
        error: "Payment signature verification failed",
      });
    }

    const order = await prisma.order.findFirst({
      where: {
        razorpayOrderId: razorpayOrderId,
        userId: req.user.id,
      },
    });

    if (!order) {
      return res.status(404).json({
        error: "Order not found",
      });
    }

    const updated =
      await markOrderPaidAndConfirmed(
        order,
        {
          paymentId: razorpayPaymentId,
          signature: razorpaySignature,
        }
      );

    return res.json({
      message: "Payment verified",
      order: updated,
    });
  }
);

webhookRouter.post(
  "/",
  async (req, res) => {
    const signature =
      req.headers["x-razorpay-signature"];

    const valid = verifyWebhookSignature({
      rawBody: req.body,
      signature: signature,
    });

    if (!valid) {
      return res.status(400).json({
        error: "Invalid webhook signature",
      });
    }

    let event;

    try {
      event = JSON.parse(
        req.body.toString()
      );
    } catch (err) {
      return res.status(400).json({
        error: "Invalid webhook payload",
      });
    }

    if (event.event === "payment.captured") {
      const payment =
        event.payload.payment.entity;

      const order =
        await prisma.order.findFirst({
          where: {
            razorpayOrderId:
              payment.order_id,
          },
        });

      if (order) {
        await markOrderPaidAndConfirmed(
          order,
          {
            paymentId: payment.id,
            signature: "webhook",
          }
        );
      }
    }

    if (event.event === "payment.failed") {
      const payment =
        event.payload.payment.entity;

      const order =
        await prisma.order.findFirst({
          where: {
            razorpayOrderId:
              payment.order_id,
          },
        });

      if (
        order &&
        order.paymentStatus !== "PAID"
      ) {
        await releaseStockForOrder(
          order.id
        );

        if (
          Number(order.storeCashUsed || 0) > 0
        ) {
          try {
            await refundStoreCashForOrder(
              order
            );
          } catch (err) {
            console.error(
              "Store Cash refund failed for " +
                order.orderNumber +
                ":",
              err.message
            );
          }
        }

        await prisma.order.update({
          where: {
            id: order.id,
          },
          data: {
            paymentStatus: "FAILED",
            status: "CANCELLED",
            cancelledAt: new Date(),
            cancelReason: "Payment failed",
            statusHistory: {
              create: {
                status: "CANCELLED",
                changedBy: "SYSTEM",
                note: "Payment failed",
              },
            },
          },
        });
      }
    }

    return res.json({
      received: true,
    });
  }
);

export default router;