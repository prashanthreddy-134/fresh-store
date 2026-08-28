import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prismaClient.js";
import { requireAuth } from "../middleware/auth.js";

import {
  verifyCheckoutSignature,
  verifyWebhookSignature,
  fetchRazorpayPayment,
  fetchRazorpayCardDetails,
  refundPayment,
} from "../services/paymentService.js";

import { notifyOrderStatus } from "../services/notificationService.js";
import { releaseStockForOrder } from "./orders.js";

const router = Router();

export const webhookRouter = Router();

// ============================================================
// REFUND STORE CASH
// ============================================================

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

        amount,

        balanceBefore: before,

        balanceAfter: after,

        description:
          "Store Cash refunded for order " +
          order.orderNumber,

        orderId: order.id,

        reference:
          "REFUND-" + order.orderNumber,
      },
    });
  });
}

// ============================================================
// NORMALIZE PAYMENT METHOD
// ============================================================

function normalizePaymentMethod(value) {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, "_");
}

// ============================================================
// GET ACTUAL PAYMENT INFORMATION
// ============================================================
//
// This information comes from Razorpay, not from the browser.
//

async function getActualPaymentInformation(
  paymentId
) {
  const payment =
    await fetchRazorpayPayment(paymentId);

  let cardDetails = null;

  const method =
    normalizePaymentMethod(
      payment?.method
    );

  if (method === "CARD") {
    cardDetails =
      payment?.card ||
      (await fetchRazorpayCardDetails(
        paymentId
      ));
  }

  return {
    payment,

    method,

    cardType: normalizePaymentMethod(
      cardDetails?.type
    ),

    cardNetwork: normalizePaymentMethod(
      cardDetails?.network
    ),

    cardIssuer: normalizePaymentMethod(
      cardDetails?.issuer
    ),
  };
}

// ============================================================
// CHECK WHETHER ACTUAL PAYMENT MATCHES COUPON
// ============================================================
//
// IMPORTANT:
//
// The browser is NOT trusted.
//
// The customer may say:
//
// paymentMethod = "DEBIT_CARD"
//
// But the backend checks Razorpay's actual payment.
//
// ============================================================

function checkCouponPaymentRequirement({
  coupon,
  paymentInfo,
}) {
  if (!coupon) {
    return {
      ok: true,
      reason: null,
    };
  }

  const required =
    normalizePaymentMethod(
      coupon.paymentMethod || "ANY"
    );

  const actual =
    paymentInfo?.method || "";

  // ----------------------------------------------------------
  // ANY PAYMENT METHOD
  // ----------------------------------------------------------

  if (
    !required ||
    required === "ANY"
  ) {
    return {
      ok: true,
      reason: null,
    };
  }

  // ----------------------------------------------------------
  // UPI
  // ----------------------------------------------------------

  if (required === "UPI") {
    if (actual === "UPI") {
      return {
        ok: true,
        reason: null,
      };
    }

    return {
      ok: false,
      reason:
        "This coupon is valid only when paying with UPI.",
    };
  }

  // ----------------------------------------------------------
  // NETBANKING
  // ----------------------------------------------------------

  if (
    required === "NETBANKING" ||
    required === "NET_BANKING"
  ) {
    if (actual === "NETBANKING") {
      return {
        ok: true,
        reason: null,
      };
    }

    return {
      ok: false,
      reason:
        "This coupon is valid only when paying with Netbanking.",
    };
  }

  // ----------------------------------------------------------
  // CARD
  // ----------------------------------------------------------

  if (required === "CARD") {
    if (actual === "CARD") {
      return {
        ok: true,
        reason: null,
      };
    }

    return {
      ok: false,
      reason:
        "This coupon is valid only when paying with a card.",
    };
  }

  // ----------------------------------------------------------
  // DEBIT CARD
  // ----------------------------------------------------------

  if (
    required === "DEBIT_CARD" ||
    required === "DEBITCARD"
  ) {
    if (
      actual === "CARD" &&
      paymentInfo.cardType ===
        "DEBIT"
    ) {
      return {
        ok: true,
        reason: null,
      };
    }

    return {
      ok: false,
      reason:
        "This coupon is valid only with a debit card.",
    };
  }

  // ----------------------------------------------------------
  // CREDIT CARD
  // ----------------------------------------------------------

  if (
    required === "CREDIT_CARD" ||
    required === "CREDITCARD"
  ) {
    if (
      actual === "CARD" &&
      paymentInfo.cardType ===
        "CREDIT"
    ) {
      return {
        ok: true,
        reason: null,
      };
    }

    return {
      ok: false,
      reason:
        "This coupon is valid only with a credit card.",
    };
  }

  // ----------------------------------------------------------
  // VISA
  // ----------------------------------------------------------

  if (required === "VISA") {
    if (
      actual === "CARD" &&
      paymentInfo.cardNetwork ===
        "VISA"
    ) {
      return {
        ok: true,
        reason: null,
      };
    }

    return {
      ok: false,
      reason:
        "This coupon is valid only with a Visa card.",
    };
  }

  // ----------------------------------------------------------
  // VISA DEBIT
  // ----------------------------------------------------------

  if (
    required === "VISA_DEBIT" ||
    required === "VISA_DEBIT_CARD"
  ) {
    if (
      actual === "CARD" &&
      paymentInfo.cardNetwork ===
        "VISA" &&
      paymentInfo.cardType ===
        "DEBIT"
    ) {
      return {
        ok: true,
        reason: null,
      };
    }

    return {
      ok: false,
      reason:
        "This coupon is valid only with a Visa debit card.",
    };
  }

  // ----------------------------------------------------------
  // VISA CREDIT
  // ----------------------------------------------------------

  if (
    required === "VISA_CREDIT" ||
    required === "VISA_CREDIT_CARD"
  ) {
    if (
      actual === "CARD" &&
      paymentInfo.cardNetwork ===
        "VISA" &&
      paymentInfo.cardType ===
        "CREDIT"
    ) {
      return {
        ok: true,
        reason: null,
      };
    }

    return {
      ok: false,
      reason:
        "This coupon is valid only with a Visa credit card.",
    };
  }

  // ----------------------------------------------------------
  // MASTERCARD
  // ----------------------------------------------------------

  if (
    required === "MASTERCARD" ||
    required === "MASTER_CARD"
  ) {
    if (
      actual === "CARD" &&
      paymentInfo.cardNetwork ===
        "MASTERCARD"
    ) {
      return {
        ok: true,
        reason: null,
      };
    }

    return {
      ok: false,
      reason:
        "This coupon is valid only with a Mastercard.",
    };
  }

  // ----------------------------------------------------------
  // MASTERCARD DEBIT
  // ----------------------------------------------------------

  if (
    required === "MASTERCARD_DEBIT" ||
    required ===
      "MASTERCARD_DEBIT_CARD"
  ) {
    if (
      actual === "CARD" &&
      paymentInfo.cardNetwork ===
        "MASTERCARD" &&
      paymentInfo.cardType ===
        "DEBIT"
    ) {
      return {
        ok: true,
        reason: null,
      };
    }

    return {
      ok: false,
      reason:
        "This coupon is valid only with a Mastercard debit card.",
    };
  }

  // ----------------------------------------------------------
  // RUPAY
  // ----------------------------------------------------------

  if (required === "RUPAY") {
    if (
      actual === "CARD" &&
      paymentInfo.cardNetwork ===
        "RUPAY"
    ) {
      return {
        ok: true,
        reason: null,
      };
    }

    return {
      ok: false,
      reason:
        "This coupon is valid only with a RuPay card.",
    };
  }

  // ----------------------------------------------------------
  // RUPAY DEBIT
  // ----------------------------------------------------------

  if (
    required === "RUPAY_DEBIT" ||
    required === "RUPAY_DEBIT_CARD"
  ) {
    if (
      actual === "CARD" &&
      paymentInfo.cardNetwork ===
        "RUPAY" &&
      paymentInfo.cardType ===
        "DEBIT"
    ) {
      return {
        ok: true,
        reason: null,
      };
    }

    return {
      ok: false,
      reason:
        "This coupon is valid only with a RuPay debit card.",
    };
  }

  // ----------------------------------------------------------
  // AMEX
  // ----------------------------------------------------------

  if (
    required === "AMEX" ||
    required === "AMERICAN_EXPRESS"
  ) {
    if (
      actual === "CARD" &&
      paymentInfo.cardNetwork ===
        "AMEX"
    ) {
      return {
        ok: true,
        reason: null,
      };
    }

    return {
      ok: false,
      reason:
        "This coupon is valid only with an American Express card.",
    };
  }

  // ----------------------------------------------------------
  // UNKNOWN REQUIREMENT
  // ----------------------------------------------------------
  //
  // Fail closed.
  //
  // If Admin creates a payment requirement that this backend
  // doesn't understand, the coupon must NOT be consumed.
  //

  return {
    ok: false,
    reason:
      "This coupon has an unsupported payment requirement.",
  };
}

// ============================================================
// MARK ORDER PAID + RECORD COUPON USAGE
// ============================================================

async function markOrderPaidAndConfirmed(
  order,
  {
    paymentId,
    signature,
    paymentInfo = null,
    skipPaymentValidation = false,
  }
) {
  const result =
    await prisma.$transaction(
      async (tx) => {
        // ------------------------------------------------------
        // GET LATEST ORDER
        // ------------------------------------------------------

        const currentOrder =
          await tx.order.findUnique({
            where: {
              id: order.id,
            },

            include: {
              items: true,

              user: true,

              coupon: true,
            },
          });

        if (!currentOrder) {
          throw new Error(
            "Order not found"
          );
        }

        // ------------------------------------------------------
        // ALREADY PAID
        // ------------------------------------------------------

        if (
          currentOrder.paymentStatus ===
          "PAID"
        ) {
          return currentOrder;
        }

        // ------------------------------------------------------
        // DO NOT PROCESS CANCELLED ORDERS
        // ------------------------------------------------------

        if (
          currentOrder.status ===
          "CANCELLED"
        ) {
          throw new Error(
            "This order has already been cancelled."
          );
        }

        // ------------------------------------------------------
        // COUPON PAYMENT VALIDATION
        // ------------------------------------------------------

        if (
          currentOrder.coupon &&
          !skipPaymentValidation
        ) {
          if (!paymentInfo) {
            throw new Error(
              "Unable to verify the payment method required by this coupon."
            );
          }

          const couponCheck =
            checkCouponPaymentRequirement({
              coupon:
                currentOrder.coupon,

              paymentInfo,
            });

          if (!couponCheck.ok) {
            throw new Error(
              couponCheck.reason
            );
          }
        }

        // ------------------------------------------------------
        // MARK ORDER AS PAID
        // ------------------------------------------------------

        const updated =
          await tx.order.update({
            where: {
              id: currentOrder.id,
            },

            data: {
              paymentStatus: "PAID",

              status: "CONFIRMED",

              razorpayPaymentId:
                paymentId,

              razorpaySignature:
                signature,

              statusHistory: {
                create: {
                  status: "CONFIRMED",

                  changedBy:
                    "SYSTEM",

                  note:
                    "Payment verified",
                },
              },
            },

            include: {
              items: true,

              user: true,

              coupon: true,
            },
          });

        // ------------------------------------------------------
        // CLEAR CUSTOMER CART
        // ------------------------------------------------------

        await tx.cartItem.deleteMany({
          where: {
            userId:
              updated.userId,
          },
        });

        // ------------------------------------------------------
        // COUPON USAGE
        // ------------------------------------------------------

        if (updated.couponId) {
          const now =
            new Date();

          const usageYear =
            now.getFullYear();

          const usageMonth =
            now.getMonth() + 1;

          // ----------------------------------------------------
          // PROTECT AGAINST DUPLICATE USAGE
          // ----------------------------------------------------

          const existingUsage =
            await tx.couponUsage.findUnique(
              {
                where: {
                  orderId:
                    updated.id,
                },
              }
            );

          if (!existingUsage) {
            // --------------------------------------------------
            // CREATE CUSTOMER USAGE
            // --------------------------------------------------

            await tx.couponUsage.create({
              data: {
                userId:
                  updated.userId,

                couponId:
                  updated.couponId,

                orderId:
                  updated.id,

                usedAt: now,

                usageYear,

                usageMonth,
              },
            });

            // --------------------------------------------------
            // INCREMENT GLOBAL USAGE
            // --------------------------------------------------

            await tx.coupon.update({
              where: {
                id:
                  updated.couponId,
              },

              data: {
                usedCount: {
                  increment: 1,
                },
              },
            });
          }
        }

        return updated;
      }
    );

  // ----------------------------------------------------------
  // ORDER NOTIFICATION
  // ----------------------------------------------------------

  await notifyOrderStatus(
    result,
    result.user
  );

  return result;
}

// ============================================================
// DEVELOPMENT PAYMENT CONFIRM
// ============================================================

router.post(
  "/payments/dev-confirm",
  requireAuth,
  async (req, res) => {
    try {
      if (
        process.env.NODE_ENV ===
        "production"
      ) {
        return res.status(404).json({
          error: "Not found",
        });
      }

      const schema = z.object({
        orderId:
          z.string().uuid(),
      });

      const parsed =
        schema.safeParse(
          req.body
        );

      if (!parsed.success) {
        return res.status(400).json({
          error:
            "Invalid order ID",
        });
      }

      const order =
        await prisma.order.findFirst({
          where: {
            id:
              parsed.data.orderId,

            userId:
              req.user.id,
          },
        });

      if (!order) {
        return res.status(404).json({
          error:
            "Order not found",
        });
      }

      if (
        order.paymentStatus ===
        "PAID"
      ) {
        return res.json({
          message:
            "Development payment already confirmed",

          order,
        });
      }

      // --------------------------------------------------------
      // DEVELOPMENT MODE
      // --------------------------------------------------------
      //
      // There is no real Razorpay payment here.
      // Therefore payment-method validation is skipped.
      //
      // Real Razorpay payments ALWAYS go through the actual
      // payment verification path below.
      //

      const updatedOrder =
        await markOrderPaidAndConfirmed(
          order,
          {
            paymentId:
              "dev_payment_" +
              Date.now(),

            signature:
              "development",

            skipPaymentValidation:
              true,
          }
        );

      return res.json({
        message:
          "Development payment confirmed",

        order:
          updatedOrder,
      });
    } catch (err) {
      console.error(
        "Development payment confirmation error:",
        err
      );

      return res.status(500).json({
        error:
          err.message ||
          "Could not confirm development payment",
      });
    }
  }
);

// ============================================================
// RAZORPAY PAYMENT VERIFICATION
// ============================================================

router.post(
  "/payments/verify",
  requireAuth,
  async (req, res) => {
    try {
      const schema = z.object({
        razorpayOrderId:
          z.string(),

        razorpayPaymentId:
          z.string(),

        razorpaySignature:
          z.string(),
      });

      const parsed =
        schema.safeParse(
          req.body
        );

      if (!parsed.success) {
        return res.status(400).json({
          error:
            parsed.error
              .errors[0]?.message ||
            "Invalid payment data",
        });
      }

      const razorpayOrderId =
        parsed.data
          .razorpayOrderId;

      const razorpayPaymentId =
        parsed.data
          .razorpayPaymentId;

      const razorpaySignature =
        parsed.data
          .razorpaySignature;

      // --------------------------------------------------------
      // VERIFY RAZORPAY SIGNATURE
      // --------------------------------------------------------

      const valid =
        verifyCheckoutSignature({
          orderId:
            razorpayOrderId,

          paymentId:
            razorpayPaymentId,

          signature:
            razorpaySignature,
        });

      if (!valid) {
        return res.status(400).json({
          error:
            "Payment signature verification failed",
        });
      }

      // --------------------------------------------------------
      // FIND CUSTOMER ORDER
      // --------------------------------------------------------

      const order =
        await prisma.order.findFirst({
          where: {
            razorpayOrderId:
              razorpayOrderId,

            userId:
              req.user.id,
          },

          include: {
            coupon: true,
          },
        });

      if (!order) {
        return res.status(404).json({
          error:
            "Order not found",
        });
      }

      // --------------------------------------------------------
      // ALREADY PAID
      // --------------------------------------------------------

      if (
        order.paymentStatus ===
        "PAID"
      ) {
        return res.json({
          message:
            "Payment already verified",

          order,
        });
      }

      // --------------------------------------------------------
      // FETCH ACTUAL RAZORPAY PAYMENT
      // --------------------------------------------------------
      //
      // IMPORTANT:
      //
      // Do NOT trust paymentMethod from the frontend.
      //
      // Razorpay is the source for the actual payment method.
      //

      let paymentInfo;

      try {
        paymentInfo =
          await getActualPaymentInformation(
            razorpayPaymentId
          );
      } catch (err) {
        console.error(
          "Razorpay payment fetch failed:",
          err
        );

        return res.status(400).json({
          error:
            "Could not verify the actual Razorpay payment method. Please try again.",
        });
      }

      // --------------------------------------------------------
      // VERIFY PAYMENT BELONGS TO OUR RAZORPAY ORDER
      // --------------------------------------------------------

      const actualPaymentOrderId =
        paymentInfo.payment
          ?.order_id;

      if (
        actualPaymentOrderId !==
        razorpayOrderId
      ) {
        return res.status(400).json({
          error:
            "Payment does not belong to this order.",
        });
      }

      // --------------------------------------------------------
      // VERIFY PAYMENT AMOUNT
      // --------------------------------------------------------

      const expectedAmount =
        Math.round(
          Number(order.total) *
            100
        );

      const actualAmount =
        Number(
          paymentInfo.payment
            ?.amount || 0
        );

      if (
        actualAmount !==
        expectedAmount
      ) {
        return res.status(400).json({
          error:
            "Payment amount does not match the order amount.",
        });
      }

      // --------------------------------------------------------
      // VERIFY PAYMENT STATUS
      // --------------------------------------------------------

      const paymentStatus =
        normalizePaymentMethod(
          paymentInfo.payment
            ?.status
        );

      if (
        paymentStatus !==
        "CAPTURED"
      ) {
        return res.status(400).json({
          error:
            "Payment has not been captured yet.",
        });
      }

      // --------------------------------------------------------
      // COUPON PAYMENT METHOD VALIDATION
      // --------------------------------------------------------

      if (order.coupon) {
        const couponCheck =
          checkCouponPaymentRequirement({
            coupon:
              order.coupon,

            paymentInfo,
          });

        if (!couponCheck.ok) {
          // ----------------------------------------------------
          // IMPORTANT:
          //
          // Payment already happened, but the coupon requirement
          // was not satisfied.
          //
          // We MUST NOT consume the coupon.
          //
          // Since the order amount included the coupon discount,
          // we cannot simply mark the order paid.
          //
          // Refund the captured payment and cancel the order.
          // ----------------------------------------------------

          console.warn(
            "Coupon/payment mismatch:",
            {
              orderId:
                order.id,

              orderNumber:
                order.orderNumber,

              coupon:
                order.coupon.code,

              required:
                order.coupon
                  .paymentMethod,

              actual:
                paymentInfo.method,

              cardType:
                paymentInfo.cardType,

              cardNetwork:
                paymentInfo.cardNetwork,

              cardIssuer:
                paymentInfo.cardIssuer,
            }
          );

          try {
            await refundPayment({
              paymentId:
                razorpayPaymentId,

              notes: {
                reason:
                  "Coupon payment method mismatch",

                orderNumber:
                  order.orderNumber,
              },
            });
          } catch (refundErr) {
            console.error(
              "Coupon mismatch refund failed:",
              refundErr
            );

            return res.status(500).json({
              error:
                "The payment method does not satisfy the selected coupon and the automatic refund could not be completed. Please contact support.",
            });
          }

          // ----------------------------------------------------
          // RELEASE RESERVED STOCK
          // ----------------------------------------------------

          try {
            await releaseStockForOrder(
              order.id
            );
          } catch (stockErr) {
            console.error(
              "Stock release after coupon mismatch failed:",
              stockErr
            );
          }

          // ----------------------------------------------------
          // REFUND STORE CASH
          // ----------------------------------------------------

          if (
            Number(
              order.storeCashUsed ||
                0
            ) > 0
          ) {
            try {
              await refundStoreCashForOrder(
                order
              );
            } catch (cashErr) {
              console.error(
                "Store Cash refund after coupon mismatch failed:",
                cashErr
              );
            }
          }

          // ----------------------------------------------------
          // CANCEL ORDER
          // ----------------------------------------------------

          await prisma.order.update({
            where: {
              id: order.id,
            },

            data: {
              paymentStatus:
                "REFUNDED",

              status:
                "CANCELLED",

              cancelledAt:
                new Date(),

              cancelReason:
                couponCheck.reason,

              statusHistory: {
                create: {
                  status:
                    "CANCELLED",

                  changedBy:
                    "SYSTEM",

                  note:
                    couponCheck.reason,
                },
              },
            },
          });

          return res.status(400).json({
            error:
              couponCheck.reason,

            couponRejected:
              true,

            paymentRefunded:
              true,

            message:
              "Your payment method did not satisfy the selected coupon. The coupon was not used and the payment has been refunded. Please retry using an eligible payment method or remove the coupon.",
          });
        }
      }

      // --------------------------------------------------------
      // EVERYTHING MATCHES
      // --------------------------------------------------------

      const updated =
        await markOrderPaidAndConfirmed(
          order,
          {
            paymentId:
              razorpayPaymentId,

            signature:
              razorpaySignature,

            paymentInfo,
          }
        );

      return res.json({
        message:
          "Payment verified",

        order:
          updated,
      });
    } catch (err) {
      console.error(
        "Payment verification error:",
        err
      );

      return res.status(500).json({
        error:
          err.message ||
          "Payment verification failed",
      });
    }
  }
);

// ============================================================
// RAZORPAY WEBHOOK
// ============================================================

webhookRouter.post(
  "/",
  async (req, res) => {
    try {
      const signature =
        req.headers[
          "x-razorpay-signature"
        ];

      // --------------------------------------------------------
      // VERIFY WEBHOOK SIGNATURE
      // --------------------------------------------------------

      const valid =
        verifyWebhookSignature({
          rawBody:
            req.body,

          signature:
            signature,
        });

      if (!valid) {
        return res.status(400).json({
          error:
            "Invalid webhook signature",
        });
      }

      // --------------------------------------------------------
      // PARSE WEBHOOK
      // --------------------------------------------------------

      let event;

      try {
        event = JSON.parse(
          req.body.toString()
        );
      } catch (err) {
        return res.status(400).json({
          error:
            "Invalid webhook payload",
        });
      }

      // ========================================================
      // PAYMENT CAPTURED
      // ========================================================

      if (
        event.event ===
        "payment.captured"
      ) {
        const payment =
          event.payload
            ?.payment?.entity;

        if (!payment) {
          return res.status(400).json({
            error:
              "Invalid payment payload",
          });
        }

        const order =
          await prisma.order.findFirst({
            where: {
              razorpayOrderId:
                payment.order_id,
            },

            include: {
              coupon: true,
            },
          });

        if (order) {
          // ----------------------------------------------------
          // ALREADY PROCESSED
          // ----------------------------------------------------

          if (
            order.paymentStatus ===
            "PAID"
          ) {
            return res.json({
              received: true,
            });
          }

          // ----------------------------------------------------
          // GET ACTUAL PAYMENT INFORMATION
          // ----------------------------------------------------

          let paymentInfo;

          try {
            paymentInfo =
              await getActualPaymentInformation(
                payment.id
              );
          } catch (err) {
            console.error(
              "Webhook payment details fetch failed:",
              err
            );

            return res.status(500).json({
              error:
                "Could not verify webhook payment details",
            });
          }

          // ----------------------------------------------------
          // COUPON VALIDATION
          // ----------------------------------------------------

          if (order.coupon) {
            const couponCheck =
              checkCouponPaymentRequirement({
                coupon:
                  order.coupon,

                paymentInfo,
              });

            if (!couponCheck.ok) {
              console.warn(
                "Webhook coupon/payment mismatch:",
                {
                  orderId:
                    order.id,

                  coupon:
                    order.coupon.code,

                  required:
                    order.coupon
                      .paymentMethod,

                  actual:
                    paymentInfo.method,

                  cardType:
                    paymentInfo.cardType,

                  cardNetwork:
                    paymentInfo.cardNetwork,

                  cardIssuer:
                    paymentInfo.cardIssuer,
                }
              );

              // ------------------------------------------------
              // REFUND PAYMENT
              // ------------------------------------------------

              try {
                await refundPayment({
                  paymentId:
                    payment.id,

                  notes: {
                    reason:
                      "Coupon payment method mismatch",

                    orderNumber:
                      order.orderNumber,
                  },
                });
              } catch (refundErr) {
                console.error(
                  "Webhook coupon mismatch refund failed:",
                  refundErr
                );

                return res.status(500).json({
                  error:
                    "Coupon mismatch refund failed",
                });
              }

              // ------------------------------------------------
              // RELEASE STOCK
              // ------------------------------------------------

              try {
                await releaseStockForOrder(
                  order.id
                );
              } catch (stockErr) {
                console.error(
                  "Webhook stock release failed:",
                  stockErr
                );
              }

              // ------------------------------------------------
              // REFUND STORE CASH
              // ------------------------------------------------

              if (
                Number(
                  order.storeCashUsed ||
                    0
                ) > 0
              ) {
                try {
                  await refundStoreCashForOrder(
                    order
                  );
                } catch (cashErr) {
                  console.error(
                    "Webhook Store Cash refund failed:",
                    cashErr
                  );
                }
              }

              // ------------------------------------------------
              // CANCEL ORDER
              // ------------------------------------------------

              await prisma.order.update({
                where: {
                  id: order.id,
                },

                data: {
                  paymentStatus:
                    "REFUNDED",

                  status:
                    "CANCELLED",

                  cancelledAt:
                    new Date(),

                  cancelReason:
                    couponCheck.reason,

                  statusHistory: {
                    create: {
                      status:
                        "CANCELLED",

                      changedBy:
                        "SYSTEM",

                      note:
                        couponCheck.reason,
                    },
                  },
                },
              });

              return res.json({
                received: true,

                couponRejected:
                  true,
              });
            }
          }

          // ----------------------------------------------------
          // PAYMENT IS VALID
          // ----------------------------------------------------

          await markOrderPaidAndConfirmed(
            order,
            {
              paymentId:
                payment.id,

              signature:
                "webhook",

              paymentInfo,
            }
          );
        }
      }

      // ========================================================
      // PAYMENT FAILED
      // ========================================================

      if (
        event.event ===
        "payment.failed"
      ) {
        const payment =
          event.payload
            ?.payment?.entity;

        if (!payment) {
          return res.status(400).json({
            error:
              "Invalid payment payload",
          });
        }

        const order =
          await prisma.order.findFirst({
            where: {
              razorpayOrderId:
                payment.order_id,
            },
          });

        if (
          order &&
          order.paymentStatus !==
            "PAID"
        ) {
          // ----------------------------------------------------
          // RELEASE STOCK
          // ----------------------------------------------------

          try {
            await releaseStockForOrder(
              order.id
            );
          } catch (err) {
            console.error(
              "Stock release failed:",
              err
            );
          }

          // ----------------------------------------------------
          // REFUND STORE CASH
          // ----------------------------------------------------

          if (
            Number(
              order.storeCashUsed ||
                0
            ) > 0
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

          // ----------------------------------------------------
          // MARK PAYMENT FAILED
          // ----------------------------------------------------

          await prisma.order.update({
            where: {
              id: order.id,
            },

            data: {
              paymentStatus:
                "FAILED",

              status:
                "CANCELLED",

              cancelledAt:
                new Date(),

              cancelReason:
                "Payment failed",

              statusHistory: {
                create: {
                  status:
                    "CANCELLED",

                  changedBy:
                    "SYSTEM",

                  note:
                    "Payment failed",
                },
              },
            },
          });
        }
      }

      return res.json({
        received: true,
      });
    } catch (err) {
      console.error(
        "Razorpay webhook error:",
        err
      );

      return res.status(500).json({
        error:
          "Webhook processing failed",
      });
    }
  }
);

export default router;