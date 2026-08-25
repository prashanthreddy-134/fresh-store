import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import NavBar from "../components/NavBar";

const STATUS_COLORS = {
  PENDING_PAYMENT: "bg-ink/10 text-ink/60",
  CONFIRMED: "bg-leaf-light text-leaf",
  PACKED: "bg-leaf-light text-leaf",
  OUT_FOR_DELIVERY: "bg-mango/10 text-mango",
  DELIVERED: "bg-leaf text-cream",
  CANCELLED: "bg-red-100 text-red-600",
};

export default function Orders() {
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    api.get("/orders").then((res) => setOrders(res.data));
  }, []);

  return (
    <div className="min-h-screen bg-cream">
      <NavBar />
      <div className="max-w-2xl mx-auto px-4 py-6">
        <h1 className="font-display font-800 text-xl mb-4">Your orders</h1>
        {orders.length === 0 ? (
          <p className="text-ink/40 text-center py-16">No orders yet.</p>
        ) : (
          <div className="space-y-3">
            {orders.map((o) => (
              <Link key={o.id} to={`/orders/${o.id}`} className="block bg-white rounded-xl2 border border-ink/10 p-4">
                <div className="flex justify-between items-start mb-1">
                  <span className="font-semibold text-sm">{o.orderNumber}</span>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[o.status]}`}>
                    {o.status.replace(/_/g, " ")}
                  </span>
                </div>
                <p className="text-xs text-ink/50">{new Date(o.placedAt).toLocaleString()}</p>
                <p className="text-sm mt-1">{o.items.length} item{o.items.length > 1 ? "s" : ""} · ₹{Number(o.total).toFixed(2)}</p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
