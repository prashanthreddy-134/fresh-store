// Pure functions with no DB/network dependency — the actual money-math of the app.
// Kept separate from routes/orders.js specifically so they can be unit tested directly.

export function calculateCouponDiscount(subtotal, coupon) {
  if (!coupon) return 0;
  let discount = coupon.discountType === "PERCENT" ? (subtotal * Number(coupon.discountValue)) / 100 : Number(coupon.discountValue);
  if (coupon.maxDiscount) discount = Math.min(discount, Number(coupon.maxDiscount));
  return Math.min(discount, subtotal); // never discount more than the order is worth
}

export function calculateDeliveryFee(amountAfterDiscount, { flatFee, freeAbove }) {
  return amountAfterDiscount >= freeAbove ? 0 : flatFee;
}

export function calculateOrderTotal(subtotal, discount, deliveryFee) {
  return Math.max(subtotal - discount + deliveryFee, 0);
}

export function calculateDiscountPct(mrp, sellingPrice) {
  if (!(mrp > sellingPrice)) return 0;
  return ((mrp - sellingPrice) / mrp) * 100;
}

export function slugify(text) {
  return text.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export function isCouponUsable(coupon, subtotal, now = new Date()) {
  if (!coupon || !coupon.isActive) return { ok: false, reason: "Invalid coupon" };
  if (coupon.validTill && new Date(coupon.validTill) < now) return { ok: false, reason: "Coupon expired" };
  if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) return { ok: false, reason: "Coupon usage limit reached" };
  if (coupon.minOrderValue && subtotal < Number(coupon.minOrderValue)) {
    return { ok: false, reason: `Minimum order value for this coupon is ₹${coupon.minOrderValue}` };
  }
  return { ok: true };
}
