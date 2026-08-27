import { useNavigate } from "react-router-dom";
import NavBar from "../components/NavBar";

export default function ProfileSuggestProducts() {
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
          Suggest Products
        </h1>

        <p className="text-sm text-ink/45 mt-1 mb-6">
          Tell us what products you'd like to see
        </p>

        <div className="bg-white rounded-[24px] border border-ink/10 p-5">
          <div className="w-12 h-12 rounded-2xl bg-leaf-light grid place-items-center text-2xl mb-4">
            💡
          </div>

          <h2 className="font-display font-800 text-lg">
            What should we add?
          </h2>

          <p className="text-sm text-ink/45 mt-1 mb-5">
            Suggest a product you'd like Fresh Store to offer.
          </p>

          <textarea
            placeholder="Enter product name or suggestion..."
            rows="5"
            className="w-full border border-ink/15 rounded-xl px-3 py-3 text-sm outline-none focus:border-leaf resize-none"
          />

          <button
            type="button"
            className="w-full mt-4 bg-leaf text-cream rounded-xl py-3 text-sm font-semibold"
          >
            Submit suggestion
          </button>
        </div>
      </main>
    </div>
  );
}
