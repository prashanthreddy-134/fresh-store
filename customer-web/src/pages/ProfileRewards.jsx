import { useNavigate } from "react-router-dom";
import NavBar from "../components/NavBar";

export default function ProfileRewards() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-cream">
      <NavBar />

      <main className="max-w-2xl mx-auto px-4 py-6 pb-12">
        <button
          onClick={() => navigate("/profile")}
          className="flex items-center gap-2 text-sm font-medium text-leaf hover:opacity-70 transition mb-6"
        >
          <span className="text-lg">←</span>
          Back to Profile
        </button>

        <h1 className="font-display font-800 text-2xl text-ink">
          Rewards
        </h1>

        <p className="text-sm text-ink/45 mt-1 mb-6">
          View your rewards and benefits
        </p>

        <div className="bg-leaf rounded-[24px] p-6 text-cream mb-5">
          <p className="text-sm opacity-75">
            Available rewards
          </p>

          <div className="font-display font-800 text-4xl mt-2">
            0
          </div>

          <p className="text-xs opacity-70 mt-2">
            Rewards earned from eligible Fresh Store activities.
          </p>
        </div>

        <div className="bg-white rounded-[24px] border border-ink/10 p-5">
          <h2 className="font-display font-800 text-lg mb-4">
            How rewards work
          </h2>

          <div className="space-y-4">
            <div className="flex gap-3">
              <div className="w-9 h-9 rounded-xl bg-leaf-light grid place-items-center shrink-0">
                ⭐
              </div>

              <div>
                <p className="font-semibold text-sm">
                  Earn rewards
                </p>

                <p className="text-xs text-ink/45 mt-1">
                  Complete eligible activities and purchases.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="w-9 h-9 rounded-xl bg-leaf-light grid place-items-center shrink-0">
                🎁
              </div>

              <div>
                <p className="font-semibold text-sm">
                  Get benefits
                </p>

                <p className="text-xs text-ink/45 mt-1">
                  Available rewards can provide eligible benefits.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}