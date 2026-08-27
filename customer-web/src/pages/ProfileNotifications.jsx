import { useNavigate } from "react-router-dom";
import NavBar from "../components/NavBar";

export default function ProfileNotifications() {
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
          Notifications
        </h1>

        <p className="text-sm text-ink/45 mt-1 mb-6">
          Manage how Fresh Store keeps you updated
        </p>

        <div className="bg-white rounded-[24px] border border-ink/10 overflow-hidden">

          <div className="p-5 flex items-center justify-between border-b border-ink/5">
            <div>
              <h2 className="font-semibold text-sm">
                Order updates
              </h2>

              <p className="text-xs text-ink/45 mt-1">
                Updates about your orders and deliveries
              </p>
            </div>

            <input
              type="checkbox"
              defaultChecked
              className="w-5 h-5 accent-leaf"
            />
          </div>

          <div className="p-5 flex items-center justify-between border-b border-ink/5">
            <div>
              <h2 className="font-semibold text-sm">
                Offers & promotions
              </h2>

              <p className="text-xs text-ink/45 mt-1">
                Get updates about offers and discounts
              </p>
            </div>

            <input
              type="checkbox"
              defaultChecked
              className="w-5 h-5 accent-leaf"
            />
          </div>

          <div className="p-5 flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-sm">
                Product updates
              </h2>

              <p className="text-xs text-ink/45 mt-1">
                Updates about products and availability
              </p>
            </div>

            <input
              type="checkbox"
              defaultChecked
              className="w-5 h-5 accent-leaf"
            />
          </div>

        </div>
      </main>
    </div>
  );
}