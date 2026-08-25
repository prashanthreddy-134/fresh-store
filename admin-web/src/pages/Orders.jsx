import { useEffect, useState } from "react";
import { api } from "../api/client";
import Layout from "../components/Layout";

const NEXT_STATUS = {
  CONFIRMED: ["PACKED", "CANCELLED"],
  PACKED: ["OUT_FOR_DELIVERY", "CANCELLED"],
  OUT_FOR_DELIVERY: ["DELIVERED", "CANCELLED"],
};

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [statusFilter, setStatusFilter] = useState("");

  function load() {
    api.get("/admin/orders", { params: statusFilter ? { status: statusFilter } : {} }).then((res) => setOrders(res.data.orders));
  }

  useEffect(load, [statusFilter]);

  // Light polling so new incoming orders and payment confirmations appear without
  // a manual refresh — the admin screen customers' orders actually depend on staff seeing.
  useEffect(() => {
    const interval = setInterval(load, 10000);
    return () => clearInterval(interval);
  }, [statusFilter]);

  async function updateStatus(id, status) {
    await api.patch(`/admin/orders/${id}/status`, { status });
    load();
  }

  return (
    <Layout>
      <div className="flex justify-between items-center mb-5">
        <h1 className="font-display font-800 text-xl">Orders</h1>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="text-sm border border-ink/15 rounded-full px-3 py-1.5 bg-white">
          <option value="">All statuses</option>
          {["PENDING_PAYMENT", "CONFIRMED", "PACKED", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED"].map((s) => (
            <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
          ))}
        </select>
      </div>

      <div className="space-y-3">
        {orders.map((o) => (
          <div key={o.id} className="bg-white rounded-xl2 border border-ink/10 p-4">
            <div className="flex justify-between items-start mb-2">
              <div>
                <div className="font-semibold text-sm">{o.orderNumber}</div>
                <div className="text-xs text-ink/50">{o.user?.name || o.user?.phone} · {new Date(o.placedAt).toLocaleString()}</div>
              </div>
              <div className="text-right">
                <div className="font-display font-800">₹{Number(o.total).toFixed(0)}</div>
                <div className="text-xs text-ink/50">{o.paymentStatus}</div>
              </div>
            </div>
            <div className="text-xs text-ink/60 mb-2">
              {o.items.map((i) => `${i.name} ×${i.quantity}`).join(", ")}
            </div>
            <div className="text-xs text-ink/60 mb-3">
              Deliver to: {o.address.line1}, {o.address.city} - {o.address.pincode}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium bg-leaf-light text-leaf px-2 py-1 rounded-full">{o.status.replace(/_/g, " ")}</span>
              {(NEXT_STATUS[o.status] || []).map((next) => (
                <button
                  key={next}
                  onClick={() => updateStatus(o.id, next)}
                  className={`text-xs font-semibold px-3 py-1 rounded-full ${next === "CANCELLED" ? "border border-red-300 text-red-600" : "bg-leaf text-cream"}`}
                >
                  Mark {next.replace(/_/g, " ")}
                </button>
              ))}
            </div>
          </div>
        ))}
        {orders.length === 0 && <p className="text-ink/40 text-center py-16">No orders match this filter.</p>}
      </div>
    </Layout>
  );
}
