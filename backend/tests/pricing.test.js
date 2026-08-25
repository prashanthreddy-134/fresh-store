import { describe, test, expect } from "@jest/globals";
import {
  calculateCouponDiscount,
  calculateDeliveryFee,
  calculateOrderTotal,
  calculateDiscountPct,
  slugify,
  isCouponUsable,
} from "../src/utils/pricing.js";

describe("calculateCouponDiscount", () => {
  test("returns 0 with no coupon", () => {
    expect(calculateCouponDiscount(500, null)).toBe(0);
  });

  test("flat discount", () => {
    expect(calculateCouponDiscount(500, { discountType: "FLAT", discountValue: 50 })).toBe(50);
  });

  test("percent discount", () => {
    expect(calculateCouponDiscount(500, { discountType: "PERCENT", discountValue: 10 })).toBe(50);
  });

  test("percent discount respects max cap", () => {
    expect(calculateCouponDiscount(1000, { discountType: "PERCENT", discountValue: 50, maxDiscount: 100 })).toBe(100);
  });

  test("never discounts more than the subtotal itself", () => {
    expect(calculateCouponDiscount(30, { discountType: "FLAT", discountValue: 500 })).toBe(30);
  });
});

describe("calculateDeliveryFee", () => {
  test("charges flat fee below free-delivery threshold", () => {
    expect(calculateDeliveryFee(200, { flatFee: 25, freeAbove: 499 })).toBe(25);
  });

  test("waives fee at or above threshold", () => {
    expect(calculateDeliveryFee(499, { flatFee: 25, freeAbove: 499 })).toBe(0);
    expect(calculateDeliveryFee(600, { flatFee: 25, freeAbove: 499 })).toBe(0);
  });
});

describe("calculateOrderTotal", () => {
  test("subtracts discount and adds delivery fee", () => {
    expect(calculateOrderTotal(500, 50, 25)).toBe(475);
  });

  test("never goes negative even with an oversized discount", () => {
    expect(calculateOrderTotal(30, 30, 25)).toBe(25); // discount already capped upstream in practice
  });
});

describe("calculateDiscountPct", () => {
  test("computes percentage off MRP", () => {
    expect(calculateDiscountPct(60, 45)).toBe(25);
  });

  test("returns 0 when selling price is not below MRP", () => {
    expect(calculateDiscountPct(45, 45)).toBe(0);
    expect(calculateDiscountPct(40, 45)).toBe(0);
  });
});

describe("slugify", () => {
  test("lowercases and hyphenates", () => {
    expect(slugify("Fresh Tomato")).toBe("fresh-tomato");
  });

  test("strips special characters", () => {
    expect(slugify("Atta, Rice & Dal!")).toBe("atta-rice-dal");
  });

  test("trims leading/trailing hyphens", () => {
    expect(slugify("  -Milk-  ")).toBe("milk");
  });
});

describe("isCouponUsable", () => {
  const baseCoupon = { isActive: true, discountType: "FLAT", discountValue: 50, usedCount: 0 };

  test("rejects missing or inactive coupon", () => {
    expect(isCouponUsable(null, 500).ok).toBe(false);
    expect(isCouponUsable({ ...baseCoupon, isActive: false }, 500).ok).toBe(false);
  });

  test("rejects expired coupon", () => {
    const expired = { ...baseCoupon, validTill: new Date("2020-01-01") };
    expect(isCouponUsable(expired, 500).ok).toBe(false);
  });

  test("rejects when usage limit reached", () => {
    const usedUp = { ...baseCoupon, usageLimit: 5, usedCount: 5 };
    expect(isCouponUsable(usedUp, 500).ok).toBe(false);
  });

  test("rejects below minimum order value", () => {
    const minOrder = { ...baseCoupon, minOrderValue: 300 };
    expect(isCouponUsable(minOrder, 200).ok).toBe(false);
    expect(isCouponUsable(minOrder, 300).ok).toBe(true);
  });

  test("accepts a valid, active coupon", () => {
    expect(isCouponUsable(baseCoupon, 500).ok).toBe(true);
  });
});
