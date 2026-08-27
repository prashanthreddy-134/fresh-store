import { useNavigate } from "react-router-dom";
import NavBar from "../components/NavBar";

export default function ProfileRefunds() {
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
          Your refunds
        </h1>

        <p className="text-sm text-ink/45 mt-1 mb-6">
          Track refunds from your cancelled or returned orders
        </p>

        <div className="bg-white rounded-[24px] border border-ink/10 p-8 text-center">

          <div className="w-16 h-16 mx-auto rounded-2xl bg-leaf-light grid place-items-center text-3xl mb-4">
            ↩️
          </div>

          <h2 className="font-display font-800 text-lg">
            No refunds yet
          </h2>

          <p className="text-sm text-ink/45 mt-2">
            Your refund information will appear here when applicable.
          </p>

        </div>

      </main>
    </div>
  );
}