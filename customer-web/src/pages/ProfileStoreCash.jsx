import { useNavigate } from "react-router-dom";
import NavBar from "../components/NavBar";

export default function ProfileStoreCash() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-cream">
      <NavBar />

      <main className="max-w-2xl mx-auto px-4 py-6 pb-12">

        {/* Back */}
        <button
          onClick={() => navigate("/profile")}
          className="flex items-center gap-2 text-sm font-medium text-leaf hover:opacity-70 transition mb-6"
        >
          <span className="text-lg">←</span>
          Back to Profile
        </button>

        {/* Header */}
        <div className="mb-6">
          <h1 className="font-display font-800 text-2xl text-ink">
            Store Cash
          </h1>

          <p className="text-sm text-ink/45 mt-1">
            Use your Store Cash while shopping on Fresh Store
          </p>
        </div>

        {/* Balance */}
        <div className="bg-leaf rounded-[24px] p-6 text-cream mb-5">
          <p className="text-sm opacity-75">
            Available Store Cash
          </p>

          <div className="font-display font-800 text-4xl mt-2">
            ₹0.00
          </div>

          <p className="text-xs opacity-70 mt-3">
            Store Cash can be used toward eligible purchases.
          </p>
        </div>

        {/* Information */}
        <div className="bg-white rounded-[24px] border border-ink/10 p-5">

          <h2 className="font-display font-800 text-lg mb-4">
            How Store Cash works
          </h2>

          <div className="space-y-4">

            <div className="flex gap-3">
              <div className="w-9 h-9 rounded-xl bg-leaf-light grid place-items-center shrink-0">
                💰
              </div>

              <div>
                <p className="font-semibold text-sm">
                  Get Store Cash
                </p>

                <p className="text-xs text-ink/45 mt-1">
                  Store Cash may be added to your account by Fresh Store.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="w-9 h-9 rounded-xl bg-leaf-light grid place-items-center shrink-0">
                🛒
              </div>

              <div>
                <p className="font-semibold text-sm">
                  Use it while shopping
                </p>

                <p className="text-xs text-ink/45 mt-1">
                  Your available balance can be applied during checkout.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="w-9 h-9 rounded-xl bg-leaf-light grid place-items-center shrink-0">
                🎁
              </div>

              <div>
                <p className="font-semibold text-sm">
                  Receive promotional cash
                </p>

                <p className="text-xs text-ink/45 mt-1">
                  Fresh Store may provide promotional Store Cash to customers.
                </p>
              </div>
            </div>

          </div>
        </div>

        {/* Empty transaction history */}
        <div className="bg-white rounded-[24px] border border-ink/10 p-5 mt-5">

          <h2 className="font-display font-800 text-lg mb-2">
            Store Cash history
          </h2>

          <p className="text-sm text-ink/40 text-center py-8">
            No Store Cash transactions yet.
          </p>

        </div>

      </main>
    </div>
  );
}