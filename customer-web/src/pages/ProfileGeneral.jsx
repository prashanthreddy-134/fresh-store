import { useNavigate } from "react-router-dom";
import NavBar from "../components/NavBar";

export default function ProfileGeneral() {
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
          General Information
        </h1>

        <p className="text-sm text-ink/45 mt-1 mb-6">
          Fresh Store information and policies
        </p>

        <div className="space-y-3">

          <button
            onClick={() => navigate("/terms")}
            className="w-full bg-white rounded-[22px] border border-ink/10 p-5 flex items-center text-left"
          >
            <div className="w-11 h-11 rounded-2xl bg-leaf-light grid place-items-center text-xl">
              📄
            </div>

            <div className="ml-4 flex-1">
              <h2 className="font-semibold text-sm">
                Terms & Conditions
              </h2>

              <p className="text-xs text-ink/45 mt-1">
                Read the terms for using Fresh Store
              </p>
            </div>

            <span className="text-ink/30 text-xl">
              →
            </span>
          </button>

          <button
            onClick={() => navigate("/privacy")}
            className="w-full bg-white rounded-[22px] border border-ink/10 p-5 flex items-center text-left"
          >
            <div className="w-11 h-11 rounded-2xl bg-leaf-light grid place-items-center text-xl">
              🔒
            </div>

            <div className="ml-4 flex-1">
              <h2 className="font-semibold text-sm">
                Privacy Policy
              </h2>

              <p className="text-xs text-ink/45 mt-1">
                Learn how your information is handled
              </p>
            </div>

            <span className="text-ink/30 text-xl">
              →
            </span>
          </button>

          <button
            onClick={() => navigate("/refund-policy")}
            className="w-full bg-white rounded-[22px] border border-ink/10 p-5 flex items-center text-left"
          >
            <div className="w-11 h-11 rounded-2xl bg-leaf-light grid place-items-center text-xl">
              ↩️
            </div>

            <div className="ml-4 flex-1">
              <h2 className="font-semibold text-sm">
                Refund Policy
              </h2>

              <p className="text-xs text-ink/45 mt-1">
                Learn about refunds and cancellations
              </p>
            </div>

            <span className="text-ink/30 text-xl">
              →
            </span>
          </button>

        </div>
      </main>
    </div>
  );
}