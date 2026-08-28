import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prismaClient.js";
import { requireAuth } from "../middleware/auth.js";
import {
  createRazorpayOrder,
  refundPayment,
} from "../services/paymentService.js";
import {
  calculateCouponDiscount,
  isCouponUsable,
} from "../utils/pricing.js";

const router = Router();

router.use(requireAuth);

// ============================================================
// ORDER NUMBER
// ============================================================

async function nextOrderNumber() {
  const today = new Date()
    .toISOString()
    .slice(0, 10)
    .replace(/-/g, "");

  const countToday = await prisma.order.count({
    where: {
      orderNumber: {
        startsWith: `FS-${today}`,
      },
    },
  });

  return `FS-${today}-${String(countToday + 1).padStart(4, "0")}`;
}

// ============================================================
// RELEASE STOCK
// ============================================================

export async function releaseStockForOrder(orderId) {
  const items = await prisma.orderItem.findMany({
    where: {
      orderId,
    },
  });

  if (items.length === 0) {
    return;
  }

  await prisma.$transaction(
    items.map((item) =>
      prisma.product.update({
        where: {
          id: item.productId,
        },
        data: {
          stockQty: {
            increment: item.quantity,
          },
        },
      })
    )
  );
}

// ============================================================
// CHECKOUT
// ============================================================
//
// FINAL PRICE RULE:
//
// subtotal
// - coupon discount
// - Store Cash
// = final payable
//
// DELIVERY FEE = 0
//
// The frontend NEVER supplies the final price.
// The backend calculates the authoritative amount.
//
// ============================================================

router.post("/orders/checkout", async (req, res) => {
  const schema = z.object({
    addressId: z.string().uuid(),

    couponCode: z
      .string()
      .optional(),

    storeCashToUse: z
      .coerce
      .number()
      .min(0)
      .optional(),
  });

  const parsed = schema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      error:
        parsed.error.errors[0]?.message ||
        "Invalid checkout request",
    });
  }

  const {
    addressId,
    couponCode,
    storeCashToUse = 0,
  } = parsed.data;

  // ==========================================================
  // ADDRESS
  // ==========================================================

  const address =
    await prisma.address.findFirst({
      where: {
        id: addressId,
        userId: req.user.id,
      },
    });

  if (!address) {
    return res.status(404).json({
      error: "Address not found",
    });
  }

  // ==========================================================
  // CART
  // ==========================================================

  const cartItems =
    await prisma.cartItem.findMany({
      where: {
        userId: req.user.id,
      },
      include: {
        product: true,
      },
    });

  if (cartItems.length === 0) {
    return res.status(400).json({
      error: "Cart is empty",
    });
  }

  // ==========================================================
  // PRODUCT VALIDATION
  // ==========================================================

  for (const item of cartItems) {
    if (!item.product.isActive) {
      return res.status(400).json({
        error: `${item.product.name} is no longer available`,
      });
    }

    if (
      Number(item.quantity) <= 0
    ) {
      return res.status(400).json({
        error: `Invalid quantity for ${item.product.name}`,
      });
    }
  }

  // ==========================================================
  // SUBTOTAL
  // ==========================================================

  const subtotal = cartItems.reduce(
    (sum, item) =>
      sum +
      Number(item.product.sellingPrice) *
        item.quantity,
    0
  );

  // ==========================================================
  // COUPON
  // ==========================================================

  let discount = 0;
  let coupon = null;

  if (
    couponCode &&
    couponCode.trim()
  ) {
    const normalizedCoupon =
      couponCode
        .trim()
        .toUpperCase();

    coupon =
      await prisma.coupon.findUnique({
        where: {
          code: normalizedCoupon,
        },
      });

    const usable =
      isCouponUsable(
        coupon,
        subtotal
      );

    if (!usable.ok) {
      return res.status(400).json({
        error: usable.reason,
      });
    }

    discount =
      calculateCouponDiscount(
        subtotal,
        coupon
      );
  }

  // ==========================================================
  // STORE CASH
  // ==========================================================

  const requestedStoreCash =
    Math.max(
      0,
      Number(storeCashToUse || 0)
    );

  const storeCash =
    await prisma.storeCash.findUnique({
      where: {
        userId: req.user.id,
      },
    });

  const availableStoreCash =
    storeCash
      ? Math.max(
          0,
          Number(storeCash.balance)
        )
      : 0;

  // Store Cash cannot exceed:
  //
  // 1. Requested amount
  // 2. Actual account balance
  // 3. Amount remaining after coupon

  const maximumStoreCash =
    Math.max(
      0,
      subtotal - discount
    );

  const storeCashUsed =
    Math.min(
      requestedStoreCash,
      availableStoreCash,
      maximumStoreCash
    );

  // ==========================================================
  // FINAL TOTAL
  // ==========================================================
  //
  // NO DELIVERY FEE.
  //
  // subtotal - discount - Store Cash
  //

  const total = Math.max(
    0,
    subtotal -
      discount -
      storeCashUsed
  );

  console.log(
    "================================================"
  );

  console.log(
    "FRESH STORE CHECKOUT CALCULATION"
  );

  console.log({
    subtotal,
    couponCode:
      coupon?.code || null,
    discount,
    requestedStoreCash,
    availableStoreCash,
    storeCashUsed,
    deliveryFee: 0,
    total,
  });

  console.log(
    "================================================"
  );

  // ==========================================================
  // ORDER NUMBER
  // ==========================================================

  const orderNumber =
    await nextOrderNumber();

  let order;

  // ==========================================================
  // CREATE ORDER TRANSACTION
  // ==========================================================

  try {
    order =
      await prisma.$transaction(
        async (tx) => {
          // ----------------------------------------------------
          // RE-CHECK STORE CASH INSIDE TRANSACTION
          // ----------------------------------------------------

          let finalStoreCashUsed =
            storeCashUsed;

          if (
            finalStoreCashUsed > 0
          ) {
            const currentStoreCash =
              await tx.storeCash.findUnique(
                {
                  where: {
                    userId:
                      req.user.id,
                  },
                }
              );

            if (!currentStoreCash) {
              finalStoreCashUsed = 0;
            } else {
              const currentBalance =
                Math.max(
                  0,
                  Number(
                    currentStoreCash.balance
                  )
                );

              finalStoreCashUsed =
                Math.min(
                  finalStoreCashUsed,
                  currentBalance,
                  Math.max(
                    0,
                    subtotal - discount
                  )
                );

              if (
                finalStoreCashUsed >
                0
              ) {
                const balanceBefore =
                  currentBalance;

                const balanceAfter =
                  balanceBefore -
                  finalStoreCashUsed;

                // ----------------------------------------------
                // DEDUCT STORE CASH
                // ----------------------------------------------

                await tx.storeCash.update(
                  {
                    where: {
                      id:
                        currentStoreCash.id,
                    },

                    data: {
                      balance:
                        balanceAfter,
                    },
                  }
                );

                // ----------------------------------------------
                // CREATE STORE CASH TRANSACTION
                // ----------------------------------------------

                await tx.storeCashTransaction.create(
                  {
                    data: {
                      storeCashId:
                        currentStoreCash.id,

                      type: "DEBIT",

                      amount:
                        finalStoreCashUsed,

                      balanceBefore,

                      balanceAfter,

                      description:
                        `Store Cash used for order ${orderNumber}`,

                      reference:
                        orderNumber,
                    },
                  }
                );
              }
            }
          }

          // ----------------------------------------------------
          // RESERVE STOCK
          // ----------------------------------------------------

          for (const item of cartItems) {
            const result =
              await tx.product.updateMany(
                {
                  where: {
                    id:
                      item.productId,

                    stockQty: {
                      gte:
                        item.quantity,
                    },
                  },

                  data: {
                    stockQty: {
                      decrement:
                        item.quantity,
                    },
                  },
                }
              );

            if (
              result.count === 0
            ) {
              const fresh =
                await tx.product.findUnique(
                  {
                    where: {
                      id:
                        item.productId,
                    },
                  }
                );

              throw new Error(
                `Only ${
                  fresh?.stockQty ?? 0
                } left for ${
                  item.product.name
                }`
              );
            }
          }

          // ----------------------------------------------------
          // FINAL AUTHORITATIVE TOTAL
          // ----------------------------------------------------

          const finalTotal =
            Math.max(
              0,
              subtotal -
                discount -
                finalStoreCashUsed
            );

          console.log(
            "FINAL ORDER TOTAL:",
            finalTotal
          );

          // ----------------------------------------------------
          // CREATE ORDER
          // ----------------------------------------------------

          return tx.order.create({
            data: {
              orderNumber,

              userId:
                req.user.id,

              addressId,

              subtotal,

              discount,

              // Delivery completely removed.
              deliveryFee: 0,

              total:
                finalTotal,

              storeCashUsed:
                finalStoreCashUsed,

              couponId:
                coupon?.id || null,

              items: {
                create:
                  cartItems.map(
                    (item) => ({
                      productId:
                        item.productId,

                      name:
                        item.product.name,

                      unit:
                        item.product.unit,

                      price:
                        item.product
                          .sellingPrice,

                      quantity:
                        item.quantity,
                    })
                  ),
              },

              statusHistory: {
                create: {
                  status:
                    "PENDING_PAYMENT",

                  changedBy:
                    "SYSTEM",
                },
              },
            },

            include: {
              items: true,
            },
          });
        }
      );
  } catch (err) {
    console.error(
      "Checkout transaction error:",
      err
    );

    return res.status(400).json({
      error:
        err.message ||
        "Could not create checkout order",
    });
  }

  // ==========================================================
  // DEVELOPMENT / NON-RAZORPAY MODE
  // ==========================================================

  if (
    process.env.RAZORPAY_TEST_MODE !==
    "true"
  ) {
    return res.status(201).json({
      order,

      devPayment: true,
    });
  }

  // ==========================================================
  // RAZORPAY ORDER
  // ==========================================================

  let razorpayOrder;

  try {
    const amountInPaise =
      Math.round(
        Number(order.total) *
          100
      );

    console.log(
      "================================================"
    );

    console.log(
      "CREATING RAZORPAY ORDER"
    );

    console.log({
      orderNumber:
        order.orderNumber,

      orderTotal:
        Number(order.total),

      amountInPaise,

      currency: "INR",
    });

    console.log(
      "================================================"
    );

    razorpayOrder =
      await createRazorpayOrder({
        amountInPaise,

        receipt:
          order.orderNumber,

        notes: {
          orderId:
            order.id,

          userId:
            req.user.id,

          orderTotal:
            String(
              Number(
                order.total
              )
            ),
        },
      });
  } catch (err) {
    console.error(
      "Razorpay order creation failed:",
      err
    );

    // Release reserved stock.
    await releaseStockForOrder(
      order.id
    );

    // Refund Store Cash if it was consumed.
    if (
      Number(
        order.storeCashUsed || 0
      ) > 0
    ) {
      try {
        await prisma.$transaction(
          async (tx) => {
            const cash =
              await tx.storeCash.findUnique(
                {
                  where: {
                    userId:
                      req.user.id,
                  },
                }
              );

            if (!cash) {
              return;
            }

            const amount =
              Number(
                order.storeCashUsed
              );

            const balanceBefore =
              Number(
                cash.balance
              );

            const balanceAfter =
              balanceBefore +
              amount;

            await tx.storeCash.update(
              {
                where: {
                  id: cash.id,
                },

                data: {
                  balance:
                    balanceAfter,
                },
              }
            );

            await tx.storeCashTransaction.create(
              {
                data: {
                  storeCashId:
                    cash.id,

                  type: "CREDIT",

                  amount,

                  balanceBefore,

                  balanceAfter,

                  description:
                    `Store Cash refunded because payment could not be initiated for order ${order.orderNumber}`,

                  reference:
                    order.orderNumber,
                },
              }
            );
          }
        );
      } catch (refundCashError) {
        console.error(
          "Store Cash rollback failed:",
          refundCashError
        );
      }
    }

    // Cancel order.
    await prisma.order.update({
      where: {
        id: order.id,
      },

      data: {
        status:
          "CANCELLED",

        cancelReason:
          "Payment gateway error",
      },
    });

    return res.status(502).json({
      error:
        "Could not initiate payment. Please try again.",
    });
  }

  // ==========================================================
  // SAVE RAZORPAY ORDER ID
  // ==========================================================

  await prisma.order.update({
    where: {
      id: order.id,
    },

    data: {
      razorpayOrderId:
        razorpayOrder.id,
    },
  });

  // ==========================================================
  // FINAL RESPONSE
  // ==========================================================

  console.log(
    "RAZORPAY ORDER CREATED:",
    {
      razorpayOrderId:
        razorpayOrder.id,

      amount:
        razorpayOrder.amount,

      expectedAmount:
        Math.round(
          Number(order.total) *
            100
        ),
    }
  );

  return res.status(201).json({
    order,

    devPayment: false,

    razorpay: {
      orderId:
        razorpayOrder.id,

      amount:
        razorpayOrder.amount,

      currency:
        razorpayOrder.currency,

      keyId:
        process.env.RAZORPAY_KEY_ID,
    },
  });
});

// ============================================================
// GET ORDERS
// ============================================================

router.get(
  "/orders",
  async (req, res) => {
    const orders =
      await prisma.order.findMany({
        where: {
          userId:
            req.user.id,
        },

        include: {
          items: true,
          address: true,
        },

        orderBy: {
          placedAt: "desc",
        },
      });

    res.json(orders);
  }
);

// ============================================================
// GET SINGLE ORDER
// ============================================================

router.get(
  "/orders/:id",
  async (req, res) => {
    const order =
      await prisma.order.findFirst({
        where: {
          id:
            req.params.id,

          userId:
            req.user.id,
        },

        include: {
          items: true,
          address: true,

          statusHistory: {
            orderBy: {
              createdAt:
                "asc",
            },
          },
        },
      });

    if (!order) {
      return res.status(404).json({
        error:
          "Order not found",
      });
    }

    res.json(order);
  }
);

// ============================================================
// CANCEL ORDER
// ============================================================

router.post(
  "/orders/:id/cancel",
  async (req, res) => {
    const order =
      await prisma.order.findFirst({
        where: {
          id:
            req.params.id,

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
      [
        "OUT_FOR_DELIVERY",
        "DELIVERED",
        "CANCELLED",
      ].includes(order.status)
    ) {
      return res.status(400).json({
        error: `Order cannot be cancelled once ${order.status.toLowerCase()}`,
      });
    }

    const updated =
      await prisma.order.update({
        where: {
          id:
            order.id,
        },

        data: {
          status:
            "CANCELLED",

          cancelledAt:
            new Date(),

          cancelReason:
            req.body?.reason ||
            "Cancelled by customer",

          statusHistory: {
            create: {
              status:
                "CANCELLED",

              changedBy:
                req.user.id,

              note:
                "Cancelled by customer",
            },
          },
        },
      });

    await releaseStockForOrder(
      order.id
    );

    // ========================================================
    // REFUND PAID RAZORPAY PAYMENT
    // ========================================================

    if (
      order.paymentStatus ===
        "PAID" &&
      order.razorpayPaymentId
    ) {
      try {
        await refundPayment({
          paymentId:
            order.razorpayPaymentId,

          amountInPaise:
            Math.round(
              Number(
                order.total
              ) * 100
            ),
        });

        await prisma.order.update({
          where: {
            id:
              order.id,
          },

          data: {
            paymentStatus:
              "REFUNDED",
          },
        });
      } catch (err) {
        console.error(
          `Refund failed for order ${order.orderNumber}:`,
          err.message
        );
      }
    }

    // ========================================================
    // REFUND STORE CASH
    // ========================================================

    if (
      Number(
        order.storeCashUsed || 0
      ) > 0
    ) {
      try {
        await prisma.$transaction(
          async (tx) => {
            const cash =
              await tx.storeCash.findUnique(
                {
                  where: {
                    userId:
                      order.userId,
                  },
                }
              );

            if (!cash) {
              return;
            }

            const amount =
              Number(
                order.storeCashUsed
              );

            const balanceBefore =
              Number(
                cash.balance
              );

            const balanceAfter =
              balanceBefore +
              amount;

            await tx.storeCash.update({
              where: {
                id:
                  cash.id,
              },

              data: {
                balance:
                  balanceAfter,
              },
            });

            await tx.storeCashTransaction.create(
              {
                data: {
                  storeCashId:
                    cash.id,

                  type:
                    "CREDIT",

                  amount,

                  balanceBefore,

                  balanceAfter,

                  description:
                    `Store Cash refunded for cancelled order ${order.orderNumber}`,

                  reference:
                    order.orderNumber,
                },
              }
            );
          }
        );
      } catch (err) {
        console.error(
          "Store Cash refund failed:",
          err
        );
      }
    }

    res.json(updated);
  }
);

export default router;