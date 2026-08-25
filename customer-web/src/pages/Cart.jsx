import { Link, useNavigate } from "react-router-dom";
import NavBar from "../components/NavBar";
import { useCart } from "../context/CartContext";

export default function Cart() {
  const { items, subtotal, updateQuantity } = useCart();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-cream">
      <NavBar />
      <div className="max-w-2xl mx-auto px-4 py-6">
        <h1 className="font-display font-800 text-xl mb-4">Your cart</h1>

        {items.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-ink/40 mb-4">Your cart is empty.</p>
            <Link to="/" className="text-leaf font-semibold">Browse products →</Link>
          </div>
        ) : (
          <>
            <div className="space-y-3 mb-6">
              {items.map((item) => (
                <div key={item.id} className="bg-white rounded-xl2 border border-ink/10 p-3 flex items-center gap-3">
                  <div className="w-14 h-14 rounded-xl bg-leaf-light grid place-items-center shrink-0">
                    {item.product.imageUrl ? (
                      <img src={item.product.imageUrl} className="w-full h-full object-cover rounded-xl" />
                    ) : (
                      <span className="text-xl">🥬</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{item.product.name}</div>
                    <div className="text-xs text-ink/50">{item.product.unit}</div>
                    <div className="font-display font-800 text-sm mt-0.5">₹{Number(item.product.sellingPrice)}</div>
                  </div>
                  <div className="flex items-center gap-2 bg-leaf text-cream rounded-full px-2 py-1">
                    <button onClick={() => updateQuantity(item.productId, item.quantity - 1)} className="w-6 h-6">−</button>
                    <span className="font-mono w-4 text-center text-sm">{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.productId, item.quantity + 1)} className="w-6 h-6">+</button>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-white rounded-xl2 border border-ink/10 p-4 mb-4">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-ink/60">Subtotal</span>
                <span className="font-medium">₹{subtotal.toFixed(2)}</span>
              </div>
              <p className="text-xs text-ink/40">Delivery fee & discounts calculated at checkout.</p>
            </div>

            <button
              onClick={() => navigate("/checkout")}
              className="w-full bg-leaf text-cream rounded-xl py-3 font-semibold"
            >
              Proceed to checkout
            </button>
          </>
        )}
      </div>
    </div>
  );
}
