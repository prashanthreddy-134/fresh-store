import { Router } from "express";
import { prisma } from "../prismaClient.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth);

// ============================================================
// CUSTOMER COUPONS
// ============================================================
//
// Admin creates and manages coupons from:
//
// /api/admin/coupons
//
// Customer only reads coupons from:
//
// GET /api/coupons
//
// The database is the single source of truth.
//
// Customer-specific rules are calculated here:
// - FIRST_ORDER
// - ONCE_EVER
// - ONCE_PER_MONTH
// - global usage limit
// - active status
// - validity dates
//
// ============================================================

router.get("/", async (req, res) => {
  try {
    const now = new Date();

    // --------------------------------------------------------
    // LOAD ACTIVE + CURRENTLY VALID COUPONS
    // --------------------------------------------------------

    const coupons =
      await prisma.coupon.findMany({
        where: {
          isActive: true,

          validFrom: {
            lte: now,
          },

          OR: [
            {
              validTill: null,
            },
            {
              validTill: {
                gte: now,
              },
            },
          ],
        },

        orderBy: [
          {
            createdAt: "desc",
          },
        ],
      });

    const result = [];

    // --------------------------------------------------------
    // CHECK EACH COUPON
    // --------------------------------------------------------

    for (const coupon of coupons) {
      // ------------------------------------------------------
      // GLOBAL USAGE LIMIT
      // ------------------------------------------------------

      if (
        coupon.usageLimit !== null &&
        coupon.usageLimit !== undefined &&
        coupon.usedCount >=
          coupon.usageLimit
      ) {
        continue;
      }

      const usageRule = String(
        coupon.usageRule ||
          "UNLIMITED"
      ).toUpperCase();

      let usedByCustomer = false;

      // ------------------------------------------------------
      // CHECK CUSTOMER'S PREVIOUS USAGE
      // ------------------------------------------------------

      if (
        usageRule === "FIRST_ORDER" ||
        usageRule === "ONCE_EVER"
      ) {
        const previousUsage =
          await prisma.couponUsage.findFirst(
            {
              where: {
                userId: req.user.id,

                couponId:
                  coupon.id,
              },

              select: {
                id: true,
              },
            }
          );

        usedByCustomer =
          Boolean(previousUsage);
      }

      // ------------------------------------------------------
      // ONCE PER MONTH
      // ------------------------------------------------------

      if (
        usageRule ===
        "ONCE_PER_MONTH"
      ) {
        const currentYear =
          now.getFullYear();

        const currentMonth =
          now.getMonth() + 1;

        const monthlyUsage =
          await prisma.couponUsage.findFirst(
            {
              where: {
                userId:
                  req.user.id,

                couponId:
                  coupon.id,

                usageYear:
                  currentYear,

                usageMonth:
                  currentMonth,
              },

              select: {
                id: true,
              },
            }
          );

        usedByCustomer =
          Boolean(monthlyUsage);
      }

      // ------------------------------------------------------
      // FIRST ORDER CHECK
      // ------------------------------------------------------

      let hasPaidOrder = false;

      if (
        usageRule ===
        "FIRST_ORDER"
      ) {
        const paidOrder =
          await prisma.order.findFirst(
            {
              where: {
                userId:
                  req.user.id,

                paymentStatus:
                  "PAID",
              },

              select: {
                id: true,
              },
            }
          );

        hasPaidOrder =
          Boolean(paidOrder);
      }

      // ------------------------------------------------------
      // CUSTOMER ELIGIBILITY
      // ------------------------------------------------------

      let available = true;

      if (usedByCustomer) {
        available = false;
      }

      if (
        usageRule ===
          "FIRST_ORDER" &&
        hasPaidOrder
      ) {
        available = false;
      }

      // ------------------------------------------------------
      // RESPONSE
      // ------------------------------------------------------

      result.push({
        id: coupon.id,

        code: coupon.code,

        description:
          coupon.description,

        discountType:
          coupon.discountType,

        discountValue:
          coupon.discountValue,

        minOrderValue:
          coupon.minOrderValue,

        maxDiscount:
          coupon.maxDiscount,

        usageLimit:
          coupon.usageLimit,

        usedCount:
          coupon.usedCount,

        usageRule:
          coupon.usageRule,

        paymentMethod:
          coupon.paymentMethod,

        validFrom:
          coupon.validFrom,

        validTill:
          coupon.validTill,

        isActive:
          coupon.isActive,

        available,

        usedByCustomer,

        firstOrderEligible:
          usageRule !==
            "FIRST_ORDER" ||
          !hasPaidOrder,
      });
    }

    return res.json(result);
  } catch (err) {
    console.error(
      "Customer coupons load error:",
      err
    );

    return res.status(500).json({
      error:
        "Could not load coupons.",
    });
  }
});

export default router;