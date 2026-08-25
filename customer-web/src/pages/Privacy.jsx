import NavBar from "../components/NavBar";

// TEMPLATE ONLY — not legal advice. Have a lawyer review before publishing,
// especially if you operate somewhere with specific data-protection law
// (India's DPDP Act, EU GDPR, etc.) — the obligations differ meaningfully.
export default function Privacy() {
  return (
    <div className="min-h-screen bg-cream">
      <NavBar />
      <div className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="font-display font-800 text-2xl mb-1">Privacy Policy</h1>
        <p className="text-sm text-ink/50 mb-6">Last updated: [DATE] · [YOUR BUSINESS LEGAL NAME]</p>

        <div className="space-y-5 text-sm text-ink/80 leading-relaxed">
          <section>
            <h2 className="font-display font-700 text-base text-ink mb-1">What we collect</h2>
            <p>Mobile number (for OTP login), name and email if you provide them, delivery addresses, order history, and approximate location if you grant location permission in the app.</p>
          </section>
          <section>
            <h2 className="font-display font-700 text-base text-ink mb-1">What we don't collect</h2>
            <p>We never store your card number, UPI PIN, or netbanking credentials — those go directly to Razorpay, our payment processor, and never touch our servers.</p>
          </section>
          <section>
            <h2 className="font-display font-700 text-base text-ink mb-1">How we use it</h2>
            <p>To process and deliver your orders, send order-status updates (SMS/email/push), and improve the product catalog based on what people search for and buy.</p>
          </section>
          <section>
            <h2 className="font-display font-700 text-base text-ink mb-1">Who we share it with</h2>
            <p>Razorpay (payments), our SMS/OTP provider, and — for orders only — the personnel who pack and deliver them. We do not sell your data to advertisers.</p>
          </section>
          <section>
            <h2 className="font-display font-700 text-base text-ink mb-1">Your rights</h2>
            <p>You can request a copy of your data, ask us to delete your account, or update your saved information at any time by contacting [SUPPORT EMAIL].</p>
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
