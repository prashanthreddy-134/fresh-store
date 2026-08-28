import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import NavBar from "../components/NavBar";
import { api } from "../api/client";

function formatDiscount(coupon) {
  const type = String(
    coupon.discountType || ""
  ).toUpperCase();

  const value = Number(
    coupon.discountValue || 0
  );

  if (type === "PERCENT") {
    return `${value}% OFF`;
  }

  return `₹${value.toFixed(0)} OFF`;
}

function formatUsageRule(rule) {
  const value = String(
    rule || "UNLIMITED"
  ).toUpperCase();

  if (value === "FIRST_ORDER") {
    return "First order only";
  }

  if (value === "ONCE_EVER") {
    return "Use once";
  }

  if (value === "ONCE_PER_MONTH") {
    return "Use once every month";
  }

  return "Available for eligible orders";
}

function formatPaymentMethod(method) {
  const value = String(
    method || "ANY"
  ).toUpperCase();

  if (value === "DEBIT_CARD") {
    return "Valid with Debit Card";
  }

  if (value === "CREDIT_CARD") {
    return "Valid with Credit Card";
  }

  if (value === "CARD") {
    return "Valid with Card";
  }

  if (value === "UPI") {
    return "Valid with UPI";
  }

  if (value === "NETBANKING") {
    return "Valid with Netbanking";
  }

  return "Valid on all payment methods";
}

export default function Coupons() {
  const navigate = useNavigate();
  const location = useLocation();

  const previousCoupon =
    location.state?.selectedCoupon || null;

  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] =
    useState(true);
  const [error, setError] = useState("");
  const [addingCode, setAddingCode] =
    useState("");

  // ==========================================================
  // LOAD COUPONS FROM BACKEND
  // ==========================================================

  useEffect(() => {
    let mounted = true;

    async function loadCoupons() {
      try {
        setLoading(true);
        setError("");

        const response =
          await api.get("/coupons");

        if (!mounted) {
          return;
        }

        const data = Array.isArray(
          response.data
        )
          ? response.data
          : [];

        setCoupons(data);
      } catch (err) {
        console.error(
          "Could not load coupons:",
          err
        );

        if (!mounted) {
          return;
        }

        setError(
          err.response?.data?.error ||
            "Could not load coupons."
        );
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadCoupons();

    return () => {
      mounted = false;
    };
  }, []);

  // ==========================================================
  // ADD COUPON
  // ==========================================================

  function handleAddCoupon(coupon) {
    if (!coupon || !coupon.available) {
      return;
    }

    setAddingCode(coupon.code);

    /*
     * IMPORTANT:
     *
     * Checkout already reads the selected coupon from
     * React Router location.state.
     *
     * Therefore we MUST navigate like this:
     *
     * /coupons
     *      ↓
     * /checkout + state.selectedCoupon
     *
     * Do not use sessionStorage here.
     */

    navigate("/checkout", {
      state: {
        selectedCoupon: coupon,
      },
    });
  }

  // ==========================================================
  // BACK TO CHECKOUT
  // ==========================================================

  function handleBack() {
    navigate("/checkout", {
      state: {
        selectedCoupon:
          previousCoupon || null,
      },
    });
  }

  // ==========================================================
  // PAGE
  // ==========================================================

  return (
    <div className="min-h-screen bg-cream">
      <NavBar />

      <div className="max-w-2xl mx-auto px-4 py-6 pb-10">

        {/* ==================================================
            HEADER
           ================================================== */}

        <div className="flex items-center justify-between mb-6">

          <button
            type="button"
            onClick={handleBack}
            className="text-sm font-semibold text-leaf hover:underline"
          >
            ← Back
          </button>

          <h1 className="font-display font-800 text-xl">
            Coupons
          </h1>

          <div className="w-12" />

        </div>

        {/* ==================================================
            INTRO
           ================================================== */}

        <div className="mb-5">
          <h2 className="font-display font-800 text-lg">
            Available offers
          </h2>

          <p className="text-sm text-ink/50 mt-1">
            Select an offer to apply it to your
            order.
          </p>
        </div>

        {/* ==================================================
            LOADING
           ================================================== */}

        {loading && (
          <div className="bg-white rounded-xl2 border border-ink/10 p-8 text-center">
            <p className="font-semibold">
              Loading coupons...
            </p>

            <p className="text-xs text-ink/40 mt-1">
              Getting the latest offers.
            </p>
          </div>
        )}

        {/* ==================================================
            ERROR
           ================================================== */}

        {!loading && error && (
          <div className="bg-red-50 border border-red-100 rounded-xl2 p-5">
            <p className="text-sm text-red-600">
              {error}
            </p>

            <button
              type="button"
              onClick={() =>
                window.location.reload()
              }
              className="mt-3 text-sm font-semibold text-red-600 underline"
            >
              Try again
            </button>
          </div>
        )}

        {/* ==================================================
            EMPTY
           ================================================== */}

        {!loading &&
          !error &&
          coupons.length === 0 && (
            <div className="bg-white rounded-xl2 border border-ink/10 p-8 text-center">
              <div className="text-4xl mb-3">
                🏷️
              </div>

              <h2 className="font-display font-800 text-lg">
                No coupons available
              </h2>

              <p className="text-sm text-ink/50 mt-1">
                New offers will appear here when
                they are added.
              </p>
            </div>
          )}

        {/* ==================================================
            COUPON LIST
           ================================================== */}

        {!loading &&
          !error &&
          coupons.length > 0 && (
            <div className="space-y-4">

              {coupons.map((coupon) => {
                const isSelected =
                  previousCoupon?.id ===
                    coupon.id ||
                  previousCoupon?.code ===
                    coupon.code;

                return (
                  <div
                    key={coupon.id}
                    className={`bg-white rounded-xl2 border p-4 transition ${
                      coupon.available
                        ? "border-ink/10"
                        : "border-ink/5 opacity-65"
                    } ${
                      isSelected
                        ? "ring-1 ring-leaf border-leaf"
                        : ""
                    }`}
                  >

                    {/* ==================================================
                        TOP ROW
                       ================================================== */}

                    <div className="flex items-start justify-between gap-4">

                      <div className="min-w-0">

                        <div className="flex items-center gap-2 flex-wrap">

                          <span className="font-display font-800 text-lg">
                            {coupon.code}
                          </span>

                          <span className="text-xs font-bold bg-leaf/10 text-leaf px-2 py-1 rounded-full">
                            {formatDiscount(
                              coupon
                            )}
                          </span>

                        </div>

                        {coupon.description && (
                          <p className="text-sm text-ink/70 mt-1">
                            {
                              coupon.description
                            }
                          </p>
                        )}

                      </div>

                      {/* ADD BUTTON */}

                      <button
                        type="button"
                        disabled={
                          !coupon.available ||
                          addingCode ===
                            coupon.code
                        }
                        onClick={() =>
                          handleAddCoupon(
                            coupon
                          )
                        }
                        className={`shrink-0 rounded-full px-5 py-2.5 text-sm font-semibold ${
                          coupon.available
                            ? "bg-leaf text-cream"
                            : "bg-ink/10 text-ink/40"
                        }`}
                      >
                        {addingCode ===
                        coupon.code
                          ? "Adding..."
                          : isSelected
                          ? "Added"
                          : coupon.available
                          ? "Add"
                          : "Unavailable"}
                      </button>

                    </div>

                    {/* ==================================================
                        DETAILS
                       ================================================== */}

                    <div className="mt-4 pt-3 border-t border-ink/5 space-y-2">

                      <div className="text-xs text-ink/60">
                        ✓{" "}
                        {formatUsageRule(
                          coupon.usageRule
                        )}
                      </div>

                      <div className="text-xs text-ink/60">
                        💳{" "}
                        {formatPaymentMethod(
                          coupon.paymentMethod
                        )}
                      </div>

                      {coupon.minOrderValue !==
                        null &&
                        coupon.minOrderValue !==
                          undefined && (
                          <div className="text-xs text-ink/60">
                            ✓ Minimum order: ₹
                            {Number(
                              coupon.minOrderValue
                            ).toFixed(0)}
                          </div>
                        )}

                      {coupon.maxDiscount !==
                        null &&
                        coupon.maxDiscount !==
                          undefined &&
                        String(
                          coupon.discountType
                        ).toUpperCase() ===
                          "PERCENT" && (
                          <div className="text-xs text-ink/60">
                            ✓ Maximum discount:
                            {" "}
                            ₹
                            {Number(
                              coupon.maxDiscount
                            ).toFixed(0)}
                          </div>
                        )}

                      {coupon.validTill && (
                        <div className="text-xs text-ink/60">
                          📅 Valid until{" "}
                          {new Date(
                            coupon.validTill
                          ).toLocaleDateString(
                            "en-IN",
                            {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            }
                          )}
                        </div>
                      )}

                    </div>

                    {/* ==================================================
                        UNAVAILABLE REASON
                       ================================================== */}

                    {!coupon.available &&
                      coupon.unavailableReason && (
                        <div className="mt-3 bg-red-50 rounded-lg p-3 text-xs text-red-600">
                          {
                            coupon.unavailableReason
                          }
                        </div>
                      )}

                  </div>
                );
              })}

            </div>
          )}

        {/* ==================================================
            BOTTOM BACK BUTTON
           ================================================== */}

        <button
          type="button"
          onClick={handleBack}
          className="w-full mt-6 border border-ink/10 bg-white rounded-xl py-3 text-sm font-semibold"
        >
          Back to Checkout
        </button>

      </div>
    </div>
  );
}