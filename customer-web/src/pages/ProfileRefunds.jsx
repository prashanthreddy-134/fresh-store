import { useNavigate } from "react-router-dom";
import NavBar from "../components/NavBar";

export default function ProfileRefunds() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-cream">
      <NavBar />

      <main className="max-w-2xl mx-auto px-4 py-6 pb-12">

        {/* Back to Profile */}
        <button
          type="button"
          onClick={() => navigate("/profile")}
          className="flex items-center gap-2 text-sm font-medium text-leaf hover:opacity-70 transition mb-6"
        >
          <span className="text-lg">←</span>
          Back to Profile
        </button>

        {/* Header */}
        <div className="mb-6">
          <h1 className="font-display font-800 text-2xl text-ink">
            Your Refunds
          </h1>

          <p className="text-sm text-ink/45 mt-1">
            Check the status of your refunds.
          </p>
        </div>

        {/* Empty State */}
        <div className="bg-white rounded-[24px] border border-ink/10 p-6 text-center">

          <div className="w-16 h-16 mx-auto rounded-2xl bg-leaf-light grid place-items-center text-3xl mb-4">
            ↩️
          </div>

          <h2 className="font-display font-800 text-lg text-ink">
            No refunds yet
          </h2>

          <p className="text-sm text-ink/45 mt-2 max-w-sm mx-auto">
            Your refund information will appear here when applicable.
          </p>

        </div>

        {/* Refund Information */}
        <div className="bg-white rounded-[24px] border border-ink/10 p-5 mt-5">

          <h2 className="font-display font-800 text-lg mb-4">
            About refunds
          </h2>

          <div className="space-y-4">

            {/* Refund processing */}
            <div className="flex gap-3">
              <div className="w-9 h-9 rounded-xl bg-leaf-light grid place-items-center shrink-0">
                ↩️
              </div>

              <div>
                <p className="font-semibold text-sm text-ink">
                  Refund processing
                </p>

                <p className="text-xs text-ink/45 mt-1 leading-5">
                  Refund information will be shown here when a refund is
                  initiated for an eligible order.
                </p>
              </div>
            </div>

            {/* Payment refund */}
            <div className="flex gap-3">
              <div className="w-9 h-9 rounded-xl bg-leaf-light grid place-items-center shrink-0">
                💳
              </div>

              <div>
                <p className="font-semibold text-sm text-ink">
                  Payment refunds
                </p>

                <p className="text-xs text-ink/45 mt-1 leading-5">
                  Eligible refunds may be returned through the applicable
                  payment method used for the order.
                </p>
              </div>
            </div>

            {/* Store Cash */}
            <div className="flex gap-3">
              <div className="w-9 h-9 rounded-xl bg-leaf-light grid place-items-center shrink-0">
                💰
              </div>

              <div>
                <p className="font-semibold text-sm text-ink">
                  Store Cash refunds
                </p>

                <p className="text-xs text-ink/45 mt-1 leading-5">
                  Eligible Store Cash amounts may be returned to your Store
                  Cash balance.
                </p>
              </div>
            </div>

          </div>
        </div>

      </main>
    </div>
  );
}