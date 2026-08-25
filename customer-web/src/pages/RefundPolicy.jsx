import NavBar from "../components/NavBar";

// TEMPLATE ONLY — not legal advice. This describes how the app's cancel/refund
// code actually behaves (see backend/src/routes/orders.js and admin.js), so it's
// accurate to the software, but the business policy choices (time windows, which
// items are non-returnable, etc.) are yours to set and have reviewed.
export default function RefundPolicy() {
  return (
    <div className="min-h-screen bg-cream">
      <NavBar />
      <div className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="font-display font-800 text-2xl mb-1">Cancellation & Refund Policy</h1>
        <p className="text-sm text-ink/50 mb-6">Last updated: [DATE] · [YOUR BUSINESS LEGAL NAME]</p>

        <div className="space-y-5 text-sm text-ink/80 leading-relaxed">
          <section>
            <h2 className="font-display font-700 text-base text-ink mb-1">Cancelling an order</h2>
            <p>You can cancel an order yourself from the Orders page any time before it's marked "Out for delivery." Once it's out for delivery, cancellation isn't available in-app — contact us directly at [SUPPORT EMAIL/PHONE].</p>
          </section>
          <section>
            <h2 className="font-display font-700 text-base text-ink mb-1">Refund timing</h2>
            <p>If you cancel an order you've already paid for, we issue a refund through Razorpay to your original payment method immediately on our end. Razorpay's own settlement timelines typically take 5–7 business days to reflect in your account, depending on your bank/UPI app.</p>
          </section>
          <section>
            <h2 className="font-display font-700 text-base text-ink mb-1">If an item is out of stock after you order</h2>
            <p>If we can't fulfil part of your order, we'll refund that portion — you're never charged for items you don't receive.</p>
          </section>
          <section>
            <h2 className="font-display font-700 text-base text-ink mb-1">Damaged or wrong items</h2>
            <p>[DESCRIBE YOUR POLICY — e.g. "Report within 24 hours of delivery with a photo, and we'll refund or replace the item."]</p>
          </section>
          <section>
            <h2 className="font-display font-700 text-base text-ink mb-1">Contact</h2>
            <p>[SUPPORT EMAIL] · [SUPPORT PHONE]</p>
          </section>
        </div>
      </div>
    </div>
  );
}
