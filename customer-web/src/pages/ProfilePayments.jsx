import { useNavigate } from "react-router-dom";
import NavBar from "../components/NavBar";

export default function ProfilePayments() {
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
          Payment management
        </h1>

        <p className="text-sm text-ink/45 mt-1 mb-6">
          Manage your saved payment methods
        </p>

        <div className="bg-white rounded-[24px] border border-ink/10 p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-leaf-light grid place-items-center text-2xl">
              💳
            </div>

            <div>
              <h2 className="font-display font-800 text-lg">
                Payment methods
              </h2>

              <p className="text-sm text-ink/45 mt-1">
                No saved payment methods
              </p>
            </div>
          </div>

          <div className="mt-6 pt-5 border-t border-ink/5">
            <p className="text-xs text-ink/45 leading-5">
              Your payment information is handled securely through the
              supported payment gateway. We do not display or store your
              complete card details here.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}