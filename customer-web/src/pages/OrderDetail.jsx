import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../api/client";
import NavBar from "../components/NavBar";

const STEPS = ["CONFIRMED", "PACKED", "OUT_FOR_DELIVERY", "DELIVERED"];

export default function OrderDetail() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [cancelling, setCancelling] = useState(false);

  function load() {
    api.get(`/orders/${id}`).then((res) => setOrder(res.data));
  }

  useEffect(load, [id]);

  // Poll for status updates while the order is still moving — gives near-real-time
  // tracking without needing a WebSocket server. Stops once the order reaches a
  // terminal state so it doesn't keep hitting the API forever.
  useEffect(() => {
    if (!order || ["DELIVERED", "CANCELLED"].includes(order.status)) return;
    const interval = setInterval(load, 8000);
    return () => clearInterval(interval);
  }, [order?.status, id]);

  async function cancelOrder() {
    setCancelling(true);
    try {
      await api.post(`/orders/${id}/cancel`, { reason: "Changed my mind" });
      load();
    } finally {
      setCancelling(false);
    }
  }

  if (!order) return <div className="min-h-screen bg-cream"><NavBar /><div className="text-center py-16 text-ink/40">Loading...</div></div>;

  const currentStepIndex = STEPS.indexOf(order.status);
  const cancellable = !["OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED"].includes(order.status);

  return (
    <div className="min-h-screen bg-cream">
      <NavBar />
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="flex justify-between items-start mb-1">
          <h1 className="font-display font-800 text-xl">{order.orderNumber}</h1>
        </div>
        <p className="text-sm text-ink/50 mb-5">{new Date(order.placedAt).toLocaleString()}</p>

        {order.status === "CANCELLED" ? (
          <div className="bg-red-50 text-red-600 rounded-xl2 p-4 mb-6 text-sm">
            Order cancelled{order.cancelReason ? `: ${order.cancelReason}` : ""}
          </div>
        ) : (
          <div className="flex items-center mb-6">
            {STEPS.map((step, i) => (
              <div key={step} className="flex-1 flex items-center">
                <div className={`w-3 h-3 rounded-full ${i <= currentStepIndex ? "bg-leaf" : "bg-ink/15"}`} />
                {i < STEPS.length - 1 && <div className={`flex-1 h-0.5 ${i < currentStepIndex ? "bg-leaf" : "bg-ink/15"}`} />}
              </div>
            ))}
          </div>
        )}
        {order.status !== "CANCELLED" && (
          <div className="flex justify-between text-[10px] text-ink/50 mb-6 -mt-4">
            {STEPS.map((s) => <span key={s} className="w-16 text-center">{s.replace(/_/g, " ")}</span>)}
          </div>
        )}

        <div className="bg-white rounded-xl2 border border-ink/10 p-4 mb-4">
          {order.items.map((item) => (
            <div key={item.id} className="flex justify-between text-sm py-1.5 border-b border-ink/5 last:border-0">
              <span>{item.name} × {item.quantity}</span>
              <span>₹{(Number(item.price) * item.quantity).toFixed(2)}</span>
            </div>
          ))}
          <div className="flex justify-between text-sm pt-2 mt-1 border-t border-ink/10">
            <span className="text-ink/60">Subtotal</span><span>₹{Number(order.subtotal).toFixed(2)}</span>
          </div>
          {order.discount > 0 && (
            <div className="flex justify-between text-sm text-leaf"><span>Discount</span><span>−₹{Number(order.discount).toFixed(2)}</span></div>
          )}
          <div className="flex justify-between text-sm"><span className="text-ink/60">Delivery fee</span><span>{Number(order.deliveryFee) === 0 ? "Free" : `₹${Number(order.deliveryFee).toFixed(2)}`}</span></div>
          <div className="flex justify-between font-display font-800 pt-2 mt-1 border-t border-ink/10"><span>Total</span><span>₹{Number(order.total).toFixed(2)}</span></div>
        </div>

        <div className="bg-white rounded-xl2 border border-ink/10 p-4 mb-4 text-sm">
          <div className="font-semibold mb-1">Delivering to</div>
          <div className="text-ink/70">{order.address.line1}, {order.address.city}, {order.address.state} - {order.address.pincode}</div>
        </div>

        <div className="text-sm mb-6">
          <span className="text-ink/60">Payment status: </span>
          <span className="font-medium">{order.paymentStatus}</span>
        </div>

        {cancellable && (
          <button onClick={cancelOrder} disabled={cancelling} className="w-full border border-red-300 text-red-600 rounded-xl py-3 font-semibold disabled:opacity-60">
            {cancelling ? "Cancelling..." : "Cancel order"}
          </button>
        )}
      </div>
    </div>
  );
}
