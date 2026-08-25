import { prisma } from "../prismaClient.js";
import { releaseStockForOrder } from "../routes/orders.js";

const STALE_AFTER_MINUTES = 20;

// Orders sit in PENDING_PAYMENT holding reserved stock the moment checkout starts.
// If a customer closes the tab/app before paying, Razorpay never sends a webhook at
// all (no payment attempt happened), so nothing else in this codebase would ever
// release that reservation. This sweep finds and releases those, so inventory doesn't
// slowly "leak" away from real stock over time.
export async function sweepStaleReservations() {
  const cutoff = new Date(Date.now() - STALE_AFTER_MINUTES * 60 * 1000);

  const stale = await prisma.order.findMany({
    where: { status: "PENDING_PAYMENT", paymentStatus: "CREATED", placedAt: { lt: cutoff } },
  });

  for (const order of stale) {
    await releaseStockForOrder(order.id);
    await prisma.order.update({
      where: { id: order.id },
      data: {
        status: "CANCELLED",
        cancelledAt: new Date(),
        cancelReason: "Checkout abandoned — payment never completed",
        statusHistory: { create: { status: "CANCELLED", changedBy: "SYSTEM", note: "Stale reservation released" } },
      },
    });
  }

  if (stale.length > 0) {
    console.log(`Released stock for ${stale.length} abandoned checkout(s).`);
  }
}

export function startStaleReservationSweep() {
  // Run once at startup, then every 5 minutes.
  sweepStaleReservations().catch((err) => console.error("Stale reservation sweep failed:", err.message));
  setInterval(() => {
    sweepStaleReservations().catch((err) => console.error("Stale reservation sweep failed:", err.message));
  }, 5 * 60 * 1000);
}
