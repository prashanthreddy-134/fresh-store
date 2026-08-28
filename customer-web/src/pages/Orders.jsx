import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api/client";
import NavBar from "../components/NavBar";

const ORDER_REFRESH_INTERVAL = 10000;

const STATUS_COLORS = {
  PENDING_PAYMENT: "bg-ink/10 text-ink/60",
  CONFIRMED: "bg-leaf-light text-leaf",
  PACKED: "bg-leaf-light text-leaf",
  OUT_FOR_DELIVERY: "bg-mango/10 text-mango",
  DELIVERED: "bg-leaf text-cream",
  CANCELLED: "bg-red-100 text-red-600",
};

function formatStatus(status) {
  return String(status || "")
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase()
    );
}

function money(value) {
  return `₹${Number(value || 0).toFixed(2)}`;
}

export default function Orders() {
  const navigate = useNavigate();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadOrders = useCallback(
    async (showLoading = false) => {
      if (showLoading) {
        setLoading(true);
      }

      try {
        const res = await api.get("/orders");
        setOrders(
          Array.isArray(res.data)
            ? res.data
            : []
        );
      } catch (err) {
        console.error(
          "Could not load orders:",
          err
        );
      } finally {
        if (showLoading) {
          setLoading(false);
        }
      }
    },
    []
  );

  // Initial load
  useEffect(() => {
    loadOrders(true);
  }, [loadOrders]);

  // Automatically refresh order status
  useEffect(() => {
    const interval = setInterval(() => {
      loadOrders(false);
    }, ORDER_REFRESH_INTERVAL);

    return () => {
      clearInterval(interval);
    };
  }, [loadOrders]);

  // Refresh when customer returns to tab
  useEffect(() => {
    function handleVisibilityChange() {
      if (
        document.visibilityState ===
        "visible"
      ) {
        loadOrders(false);
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
  }, [loadOrders]);

  // Refresh when internet returns
  useEffect(() => {
    function handleOnline() {
      loadOrders(false);
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
  }, [loadOrders]);

  return (
    <div className="min-h-screen bg-cream">
      <NavBar />

      <div className="max-w-2xl mx-auto px-4 py-6">

        {/* ==================================================
            HEADER
           ================================================== */}

        <button
          type="button"
          onClick={() =>
            navigate("/profile")
          }
          className="flex items-center gap-2 text-sm font-medium text-leaf hover:opacity-70 transition mb-6"
        >
          <span className="text-lg">
            ←
          </span>
          Back to Profile
        </button>

        <div className="flex items-center justify-between mb-5">
          <h1 className="font-display font-800 text-xl">
            My Orders
          </h1>

          <button
            type="button"
            onClick={() =>
              loadOrders(false)
            }
            className="text-xs font-semibold text-leaf"
          >
            Refresh
          </button>
        </div>

        {/* ==================================================
            LOADING
           ================================================== */}

        {loading && (
          <div className="text-center py-12 text-ink/40">
            Loading your orders...
          </div>
        )}

        {/* ==================================================
            EMPTY
           ================================================== */}

        {!loading &&
          orders.length === 0 && (
            <div className="bg-white rounded-xl2 border border-ink/10 p-8 text-center">
              <div className="text-4xl mb-3">
                🛍️
              </div>

              <h2 className="font-display font-800 text-lg">
                No orders yet
              </h2>

              <p className="text-sm text-ink/50 mt-1 mb-5">
                Your completed orders will
                appear here.
              </p>

              <Link
                to="/"
                className="inline-block bg-leaf text-cream rounded-xl px-5 py-3 font-semibold"
              >
                Start Shopping
              </Link>
            </div>
          )}

        {/* ==================================================
            ORDER LIST
           ================================================== */}

        {!loading &&
          orders.length > 0 && (
            <div className="space-y-4">
              {orders.map((order) => {
                const status =
                  String(
                    order.status || ""
                  ).toUpperCase();

                const statusClass =
                  STATUS_COLORS[status] ||
                  "bg-ink/10 text-ink/60";

                return (
                  <div
                    key={order.id}
                    className="bg-white rounded-xl2 border border-ink/10 p-4"
                  >

                    {/* ----------------------------------------
                        ORDER HEADER
                       ---------------------------------------- */}

                    <div className="flex justify-between items-start gap-3">

                      <div>
                        <h2 className="font-display font-800 text-base">
                          {order.orderNumber}
                        </h2>

                        <p className="text-xs text-ink/50 mt-1">
                          {order.placedAt
                            ? new Date(
                                order.placedAt
                              ).toLocaleString()
                            : "Date unavailable"}
                        </p>
                      </div>

                      <span
                        className={`text-[11px] px-2.5 py-1 rounded-full font-semibold ${statusClass}`}
                      >
                        {formatStatus(status)}
                      </span>
                    </div>

                    {/* ----------------------------------------
                        ITEMS PREVIEW
                       ---------------------------------------- */}

                    <div className="mt-4 border-t border-ink/5 pt-3">
                      {Array.isArray(
                        order.items
                      ) &&
                        order.items
                          .slice(0, 3)
                          .map((item) => (
                            <div
                              key={item.id}
                              className="flex justify-between text-sm py-1"
                            >
                              <span className="text-ink/70">
                                {item.name} ×{" "}
                                {item.quantity}
                              </span>

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
                          ))}

                      {Array.isArray(
                        order.items
                      ) &&
                        order.items.length >
                          3 && (
                          <p className="text-xs text-ink/40 mt-1">
                            +
                            {order.items.length -
                              3}{" "}
                            more item
                            {order.items.length -
                              3 ===
                            1
                              ? ""
                              : "s"}
                          </p>
                        )}
                    </div>

                    {/* ----------------------------------------
                        TOTAL
                       ---------------------------------------- */}

                    <div className="flex justify-between items-center border-t border-ink/10 mt-3 pt-3">
                      <span className="text-sm text-ink/60">
                        Total
                      </span>

                      <span className="font-display font-800">
                        {money(
                          order.total
                        )}
                      </span>
                    </div>

                    {/* ----------------------------------------
                        ACTIONS
                       ---------------------------------------- */}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-4">

                      <Link
                        to={`/orders/${order.id}`}
                        className="w-full text-center border border-leaf text-leaf rounded-xl py-2.5 text-sm font-semibold hover:bg-leaf hover:text-cream transition"
                      >
                        View Order
                      </Link>

                      <Link
                        to={`/orders/${order.id}/invoice`}
                        className="w-full text-center bg-leaf text-cream rounded-xl py-2.5 text-sm font-semibold hover:opacity-90 transition"
                      >
                        Download Invoice
                      </Link>

                    </div>
                  </div>
                );
              })}
            </div>
          )}

      </div>
    </div>
  );
}