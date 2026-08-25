import Razorpay from "razorpay";
import crypto from "crypto";

// Key ID / Secret live only on the server via env vars. They are NEVER sent to any frontend.
// The frontend only ever receives: razorpayOrderId, amount, currency, and the public key ID
// (the key ID is safe to expose — it's not a secret, only the key SECRET is).
const razorpay =
  process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET
    ? new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET,
      })
    : null;
export async function createRazorpayOrder({ amountInPaise, receipt, notes }) {
  if (!razorpay) {
    throw new Error("Razorpay is not configured");
  }

  return razorpay.orders.create({
    amount: amountInPaise,
    currency: "INR",
    receipt,
    notes,
  });
}

// Issues a real refund through Razorpay for a captured payment. Amount is optional —
// omit it (or pass the full original amount) for a full refund, or pass a smaller
// amountInPaise for a partial refund. Razorpay pushes the refunded amount back to
// whatever method the customer originally paid with, on their own settlement timeline.
export async function refundPayment({ paymentId, amountInPaise, notes }) {
  if (!razorpay) {
    throw new Error("Razorpay is not configured");
  }

  return razorpay.payments.refund(paymentId, {
    ...(amountInPaise && { amount: amountInPaise }),
    ...(notes && { notes }),
  });
}

// Verifies the signature returned by Razorpay Checkout after a successful payment.
// This MUST pass before an order is ever marked as paid/confirmed.
export function verifyCheckoutSignature({ orderId, paymentId, signature }) {
  const expected = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");
  return expected === signature;
}

// Verifies the webhook signature Razorpay sends on payment.captured / payment.failed events.
// Webhooks are the source of truth — always trust the webhook over the client-side callback,
// since a client callback can be spoofed but a correctly-signed webhook cannot.
export function verifyWebhookSignature({ rawBody, signature }) {
  const expected = crypto
    .createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET)
    .update(rawBody)
    .digest("hex");
  return expected === signature;
}
