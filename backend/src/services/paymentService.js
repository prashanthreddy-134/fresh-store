import Razorpay from "razorpay";
import crypto from "crypto";

// ============================================================
// RAZORPAY CLIENT
// ============================================================
//
// Secret keys stay ONLY on the backend.
// Never expose RAZORPAY_KEY_SECRET to the frontend.
//

const razorpay =
  process.env.RAZORPAY_KEY_ID &&
  process.env.RAZORPAY_KEY_SECRET
    ? new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET,
      })
    : null;

// ============================================================
// CREATE RAZORPAY ORDER
// ============================================================

export async function createRazorpayOrder({
  amountInPaise,
  receipt,
  notes,
}) {
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

// ============================================================
// FETCH RAZORPAY PAYMENT
// ============================================================
//
// Used by the backend after Checkout verification.
//
// IMPORTANT:
// Never trust the payment method sent by the browser.
// Fetch the payment directly from Razorpay.
//

export async function fetchRazorpayPayment(
  paymentId
) {
  if (!razorpay) {
    throw new Error("Razorpay is not configured");
  }

  if (!paymentId) {
    throw new Error(
      "Razorpay payment ID is required"
    );
  }

  return razorpay.payments.fetch(
    paymentId
  );
}

// ============================================================
// FETCH RAZORPAY CARD DETAILS
// ============================================================
//
// Used when the payment was made using a card.
//
// This can provide information such as:
// - card type
// - card network
// - issuer
//
// We DO NOT assume that Razorpay provides a generic
// "PLATINUM" property.
//

export async function fetchRazorpayCardDetails(
  paymentId
) {
  if (!razorpay) {
    throw new Error("Razorpay is not configured");
  }

  if (!paymentId) {
    throw new Error(
      "Razorpay payment ID is required"
    );
  }

  try {
    return await razorpay.payments.fetchCardDetails(
      paymentId
    );
  } catch (err) {
    // Some payment/account configurations may not
    // expose expanded card details.
    console.error(
      "Could not fetch Razorpay card details:",
      err?.message || err
    );

    return null;
  }
}

// ============================================================
// REFUND PAYMENT
// ============================================================
//
// Amount is optional.
// If omitted, Razorpay performs a full refund.
//

export async function refundPayment({
  paymentId,
  amountInPaise,
  notes,
}) {
  if (!razorpay) {
    throw new Error("Razorpay is not configured");
  }

  return razorpay.payments.refund(
    paymentId,
    {
      ...(amountInPaise && {
        amount: amountInPaise,
      }),

      ...(notes && {
        notes,
      }),
    }
  );
}

// ============================================================
// VERIFY CHECKOUT SIGNATURE
// ============================================================
//
// This MUST pass before an order can be marked PAID.
//

export function verifyCheckoutSignature({
  orderId,
  paymentId,
  signature,
}) {
  if (
    !orderId ||
    !paymentId ||
    !signature ||
    !process.env.RAZORPAY_KEY_SECRET
  ) {
    return false;
  }

  const expected = crypto
    .createHmac(
      "sha256",
      process.env.RAZORPAY_KEY_SECRET
    )
    .update(
      `${orderId}|${paymentId}`
    )
    .digest("hex");

  return crypto.timingSafeEqual(
    Buffer.from(expected),
    Buffer.from(signature)
  );
}

// ============================================================
// VERIFY WEBHOOK SIGNATURE
// ============================================================
//
// Razorpay webhook requests are verified using the
// webhook secret.
//

export function verifyWebhookSignature({
  rawBody,
  signature,
}) {
  if (
    !rawBody ||
    !signature ||
    !process.env
      .RAZORPAY_WEBHOOK_SECRET
  ) {
    return false;
  }

  const expected = crypto
    .createHmac(
      "sha256",
      process.env.RAZORPAY_WEBHOOK_SECRET
    )
    .update(rawBody)
    .digest("hex");

  return crypto.timingSafeEqual(
    Buffer.from(expected),
    Buffer.from(signature)
  );
}

// ============================================================
// NORMALIZE ACTUAL RAZORPAY PAYMENT
// ============================================================
//
// Converts Razorpay's payment response into a small,
// predictable object for coupon validation.
//

export function getActualPaymentMethod(
  payment
) {
  if (!payment) {
    return {
      method: null,
      cardType: null,
      cardNetwork: null,
      cardIssuer: null,
    };
  }

  const method = String(
    payment.method || ""
  ).toUpperCase();

  const card = payment.card || {};

  return {
    method,
    cardType: card.type
      ? String(card.type).toUpperCase()
      : null,

    cardNetwork: card.network
      ? String(card.network).toUpperCase()
      : null,

    cardIssuer: card.issuer
      ? String(card.issuer).toUpperCase()
      : null,
  };
}