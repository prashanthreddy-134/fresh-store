import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import NavBar from "../components/NavBar";
import { api } from "../api/client";

export default function ProfileStoreCash() {
  const navigate = useNavigate();

  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    async function loadStoreCash() {
      try {
        setLoading(true);
        setError("");

        const res = await api.get("/store-cash");

        if (!mounted) return;

        setBalance(Number(res.data?.balance || 0));
        setTransactions(res.data?.transactions || []);
      } catch (err) {
        console.error("Failed to load Store Cash:", err);

        if (!mounted) return;

        setBalance(0);
        setTransactions([]);

        setError(
          err.response?.data?.error ||
            "Could not load Store Cash."
        );
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadStoreCash();

    return () => {
      mounted = false;
    };
  }, []);

  function formatAmount(amount) {
    return `₹${Number(amount || 0).toFixed(2)}`;
  }

  function formatDate(date) {
    if (!date) return "";

    return new Date(date).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

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
            {loading
              ? "Loading..."
              : formatAmount(balance)}
          </div>

          <p className="text-xs opacity-70 mt-3">
            Store Cash can be used toward eligible purchases.
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-[20px] p-4 mb-5">
            <p className="text-sm text-red-600">
              {error}
            </p>
          </div>
        )}

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

        {/* Transaction History */}
        <div className="bg-white rounded-[24px] border border-ink/10 p-5 mt-5">

          <h2 className="font-display font-800 text-lg mb-4">
            Store Cash history
          </h2>

          {loading ? (
            <p className="text-sm text-ink/40 text-center py-8">
              Loading transactions...
            </p>
          ) : transactions.length === 0 ? (
            <p className="text-sm text-ink/40 text-center py-8">
              No Store Cash transactions yet.
            </p>
          ) : (
            <div className="space-y-3">

              {transactions.map((transaction) => {

                const isCredit =
                  transaction.type === "CREDIT" ||
                  transaction.type === "REFUND" ||
                  transaction.type === "ADJUSTMENT";

                return (
                  <div
                    key={transaction.id}
                    className="flex items-center justify-between gap-4 border-b border-ink/10 pb-3 last:border-b-0 last:pb-0"
                  >

                    <div className="min-w-0">
                      <p className="font-semibold text-sm text-ink">
                        {transaction.description ||
                          transaction.type ||
                          "Store Cash"}
                      </p>

                      <p className="text-xs text-ink/40 mt-1">
                        {formatDate(transaction.createdAt)}
                      </p>
                    </div>

                    <div
                      className={`font-semibold text-sm shrink-0 ${
                        isCredit
                          ? "text-leaf"
                          : "text-red-500"
                      }`}
                    >
                      {isCredit ? "+" : "-"}
                      {formatAmount(transaction.amount)}
                    </div>

                  </div>
                );
              })}

            </div>
          )}

        </div>

      </main>
    </div>
  );
}