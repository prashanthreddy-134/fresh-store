import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api/client";
import NavBar from "../components/NavBar";

const ORDER_REFRESH_INTERVAL = 5000;

const STEPS = [
  "CONFIRMED",
  "PACKED",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
];

function money(value) {
  return `₹${Number(value || 0).toFixed(2)}`;
}

function formatStatus(status) {
  return String(status || "")
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase()
    );
}

export default function OrderDetail() {
  const { id } = useParams();

  const [order, setOrder] = useState(null);
  const [cancelling, setCancelling] =
    useState(false);

  const load = useCallback(async () => {
    try {
      const res =
        await api.get(`/orders/${id}`);

      setOrder(res.data);
    } catch (err) {
      console.error(
        "Could not load order:",
        err
      );
    }
  }, [id]);

  // ==========================================================
  // INITIAL LOAD
  // ==========================================================

  useEffect(() => {
    load();
  }, [load]);

  // ==========================================================
  // AUTOMATIC STATUS REFRESH
  // ==========================================================

  useEffect(() => {
    if (
      !order ||
      [
        "DELIVERED",
        "CANCELLED",
      ].includes(order.status)
    ) {
      return;
    }

    const interval = setInterval(
      () => {
        load();
      },
      ORDER_REFRESH_INTERVAL
    );

    return () => {
      clearInterval(interval);
    };
  }, [order?.status, load]);

  // ==========================================================
  // REFRESH WHEN TAB RETURNS
  // ==========================================================

  useEffect(() => {
    function handleVisibilityChange() {
      if (
        document.visibilityState ===
        "visible"
      ) {
        load();
      }
    }

    document.addEventListener(
      "visibilitychange",
      handleVisibilityChange
    );

    return () => {
      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange
      );
    };
  }, [load]);

  // ==========================================================
  // REFRESH WHEN INTERNET RETURNS
  // ==========================================================

  useEffect(() => {
    function handleOnline() {
      load();
    }

    window.addEventListener(
      "online",
      handleOnline
    );

    return () => {
      window.removeEventListener(
        "online",
        handleOnline
      );
    };
  }, [load]);

  // ==========================================================
  // CANCEL ORDER
  // ==========================================================

  async function cancelOrder() {
    setCancelling(true);

    try {
      await api.post(
        `/orders/${id}/cancel`,
        {
          reason:
            "Changed my mind",
        }
      );

      await load();
    } catch (err) {
      console.error(
        "Could not cancel order:",
        err
      );
    } finally {
      setCancelling(false);
    }
  }

  // ==========================================================
  // LOADING
  // ==========================================================

  if (!order) {
    return (
      <div className="min-h-screen bg-cream">
        <NavBar />

        <div className="text-center py-16 text-ink/40">
          Loading order...
        </div>
      </div>
    );
  }

  const currentStepIndex =
    STEPS.indexOf(
      order.status
    );

  const cancellable =
    ![
      "OUT_FOR_DELIVERY",
      "DELIVERED",
      "CANCELLED",
    ].includes(order.status);

  return (
    <div className="min-h-screen bg-cream">
      <NavBar />

      <div className="max-w-2xl mx-auto px-4 py-6">

        {/* ==================================================
            BACK
           ================================================== */}

        <Link
          to="/orders"
          className="inline-flex items-center gap-2 text-sm font-semibold text-leaf mb-5"
        >
          ← Back to Orders
        </Link>

        {/* ==================================================
            ORDER HEADING
           ================================================== */}

        <div className="flex justify-between items-start gap-3 mb-1">

          <div>
            <h1 className="font-display font-800 text-xl">
              {order.orderNumber}
            </h1>

            <p className="text-sm text-ink/50 mt-1">
              {order.placedAt
                ? new Date(
                    order.placedAt
                  ).toLocaleString()
                : ""}
            </p>
          </div>

          {/* INVOICE BUTTON */}

          <Link
            to={`/orders/${order.id}/invoice`}
            className="shrink-0 bg-leaf text-cream rounded-xl px-3 py-2 text-xs font-semibold hover:opacity-90 transition"
          >
            Invoice
          </Link>
        </div>

        {/* ==================================================
            CANCELLED
           ================================================== */}

        {order.status ===
        "CANCELLED" ? (
          <div className="bg-red-50 text-red-600 rounded-xl2 p-4 mb-6 text-sm mt-5">
            <div className="font-semibold">
              Order cancelled
            </div>

            {order.cancelReason && (
              <div className="mt-1">
                Reason:{" "}
                {order.cancelReason}
              </div>
            )}
          </div>
        ) : (
          <>
            {/* ==============================================
                ORDER PROGRESS
               ============================================== */}

            <div className="flex items-center mt-5 mb-6">
              {STEPS.map(
                (step, i) => (
                  <div
                    key={step}
                    className="flex-1 flex items-center"
                  >
                    <div
                      className={`w-3 h-3 rounded-full ${
                        i <=
                        currentStepIndex
                          ? "bg-leaf"
                          : "bg-ink/15"
                      }`}
                    />

                    {i <
                      STEPS.length -
                        1 && (
                      <div
                        className={`flex-1 h-0.5 ${
                          i <
                          currentStepIndex
                            ? "bg-leaf"
                            : "bg-ink/15"
                        }`}
                      />
                    )}
                  </div>
                )
              )}
            </div>

            {/* ==============================================
                STATUS LABELS
               ============================================== */}

            <div className="flex justify-between text-[10px] text-ink/50 mb-6 -mt-4">
              {STEPS.map(
                (step) => (
                  <span
                    key={step}
                    className="w-16 text-center"
                  >
                    {formatStatus(
                      step
                    )}
                  </span>
                )
              )}
            </div>
          </>
        )}

        {/* ==================================================
            ITEMS
           ================================================== */}

        <div className="bg-white rounded-xl2 border border-ink/10 p-4 mb-4">

          <h2 className="font-semibold text-sm mb-3">
            Items
          </h2>

          {order.items.map(
            (item) => (
              <div
                key={item.id}
                className="flex justify-between text-sm py-2 border-b border-ink/5 last:border-0"
              >
                <div>
                  <div>
                    {item.name} ×{" "}
                    {item.quantity}
                  </div>

                  {item.unit && (
                    <div className="text-xs text-ink/40">
                      {item.unit}
                    </div>
                  )}
                </div>

                <span>
                  {money(
                    Number(
                      item.price
                    ) *
                      Number(
                        item.quantity
                      )
                  )}
                </span>
              </div>
            )
          )}

          {/* SUBTOTAL */}

          <div className="flex justify-between text-sm pt-3 mt-2 border-t border-ink/10">
            <span className="text-ink/60">
              Subtotal
            </span>

            <span>
              {money(
                order.subtotal
              )}
            </span>
          </div>

          {/* DISCOUNT */}

          {Number(
            order.discount
          ) > 0 && (
            <div className="flex justify-between text-sm text-leaf mt-2">
              <span>
                Coupon Discount
              </span>

              <span>
                -{money(
                  order.discount
                )}
              </span>
            </div>
          )}

          {/* STORE CASH */}

          {Number(
            order.storeCashUsed
          ) > 0 && (
            <div className="flex justify-between text-sm text-leaf mt-2">
              <span>
                Store Cash
              </span>

              <span>
                -{money(
                  order.storeCashUsed
                )}
              </span>
            </div>
          )}

          {/* DELIVERY */}

          <div className="flex justify-between text-sm mt-2">
            <span className="text-ink/60">
              Delivery fee
            </span>

            <span>
              {Number(
                order.deliveryFee
              ) === 0
                ? "Free"
                : money(
                    order.deliveryFee
                  )}
            </span>
          </div>

          {/* TOTAL */}

          <div className="flex justify-between font-display font-800 text-base pt-3 mt-2 border-t border-ink/10">
            <span>
              Total
            </span>

            <span>
              {money(order.total)}
            </span>
          </div>
        </div>

        {/* ==================================================
            DELIVERY ADDRESS
           ================================================== */}

        <div className="bg-white rounded-xl2 border border-ink/10 p-4 mb-4 text-sm">

          <div className="font-semibold mb-2">
            Delivering to
          </div>

          {order.address && (
            <div className="text-ink/70">
              <div>
                {order.address.label}
              </div>

              <div>
                {order.address.line1}
              </div>

              {order.address.line2 && (
                <div>
                  {order.address.line2}
                </div>
              )}

              {order.address.landmark && (
                <div>
                  {order.address.landmark}
                </div>
              )}

              <div>
                {order.address.city},{" "}
                {order.address.state} -{" "}
                {order.address.pincode}
              </div>
            </div>
          )}
        </div>

        {/* ==================================================
            PAYMENT
           ================================================== */}

        <div className="bg-white rounded-xl2 border border-ink/10 p-4 mb-6 text-sm">

          <div className="font-semibold mb-2">
            Payment
          </div>

          <div>
            <span className="text-ink/60">
              Payment status:{" "}
            </span>

            <span className="font-medium">
              {formatStatus(
                order.paymentStatus
              )}
            </span>
          </div>

          {order.razorpayPaymentId && (
            <div className="mt-2">
              <span className="text-ink/60">
                Payment ID:{" "}
              </span>

              <span className="font-mono text-xs">
                {order.razorpayPaymentId}
              </span>
            </div>
          )}

          {order.coupon && (
            <div className="mt-2">
              <span className="text-ink/60">
                Coupon:{" "}
              </span>

              <span className="font-semibold text-leaf">
                {order.coupon.code}
              </span>
            </div>
          )}
        </div>

        {/* ==================================================
            DOWNLOAD INVOICE
           ================================================== */}

        <Link
          to={`/orders/${order.id}/invoice`}
          className="w-full flex items-center justify-center bg-leaf text-cream rounded-xl py-3 font-semibold hover:opacity-90 transition"
        >
          Download Invoice
        </Link>

        {/* ==================================================
            CANCEL
           ================================================== */}

        {cancellable && (
          <button
            type="button"
            onClick={
              cancelOrder
            }
            disabled={
              cancelling
            }
            className="w-full border border-red-300 text-red-600 rounded-xl py-3 font-semibold disabled:opacity-60 mt-3"
          >
            {cancelling
              ? "Cancelling..."
              : "Cancel order"}
          </button>
        )}

        {/* ==================================================
            NAVIGATION
           ================================================== */}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">

          <Link
            to="/"
            className="w-full text-center border border-leaf text-leaf rounded-xl py-3 font-semibold hover:bg-leaf hover:text-cream transition"
          >
            Home
          </Link>

          <Link
            to="/orders"
            className="w-full text-center border border-leaf text-leaf rounded-xl py-3 font-semibold hover:bg-leaf hover:text-cream transition"
          >
            My Orders
          </Link>

        </div>

      </div>
    </div>
  );
}