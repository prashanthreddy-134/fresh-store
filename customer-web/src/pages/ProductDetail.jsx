import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../api/client";
import NavBar from "../components/NavBar";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";

export default function ProductDetail() {
  const { idOrSlug } = useParams();
  const [product, setProduct] = useState(null);
  const { addToCart, items, updateQuantity } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    api.get(`/products/${idOrSlug}`).then((res) => setProduct(res.data));
  }, [idOrSlug]);

  if (!product) return <div className="min-h-screen bg-cream"><NavBar /><div className="text-center py-16 text-ink/40">Loading...</div></div>;

  const cartItem = items.find((i) => i.productId === product.id);

  return (
    <div className="min-h-screen bg-cream">
      <NavBar />
      <div className="max-w-4xl mx-auto px-4 py-6 grid md:grid-cols-2 gap-8">
        <div className="aspect-square rounded-xl2 bg-leaf-light grid place-items-center">
          {product.imageUrl ? (
            <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover rounded-xl2" />
          ) : (
            <span className="text-6xl">🥬</span>
          )}
        </div>
        <div>
          <div className="text-sm text-ink/50 mb-1">{product.category?.name}</div>
          <h1 className="font-display font-800 text-2xl mb-1">{product.name}</h1>
          <div className="text-ink/50 mb-4">{product.unit}</div>

          <div className="flex items-baseline gap-2 mb-1">
            <span className="font-display font-800 text-3xl">₹{Number(product.sellingPrice)}</span>
            {product.mrp > product.sellingPrice && (
              <span className="text-ink/40 line-through">₹{Number(product.mrp)}</span>
            )}
            {product.discountPct > 0 && (
              <span className="bg-mango text-white text-xs font-semibold px-2 py-0.5 rounded-full">
                {Math.round(product.discountPct)}% OFF
              </span>
            )}
          </div>
          <div className={`text-sm mb-5 ${product.stockQty > 0 ? "text-leaf" : "text-red-600"}`}>
            {product.stockQty > 0 ? `In stock (${product.stockQty} available)` : "Out of stock"}
          </div>

          {cartItem ? (
            <div className="flex items-center gap-3 bg-leaf text-cream rounded-full px-4 py-2 w-fit mb-6">
              <button onClick={() => updateQuantity(product.id, cartItem.quantity - 1)} className="text-lg">−</button>
              <span className="font-mono w-6 text-center">{cartItem.quantity}</span>
              <button onClick={() => updateQuantity(product.id, cartItem.quantity + 1)} className="text-lg">+</button>
            </div>
          ) : (
            <button
              disabled={product.stockQty === 0}
              onClick={() => (user ? addToCart(product.id, 1) : navigate("/login"))}
              className="bg-leaf text-cream rounded-full px-6 py-3 font-semibold mb-6 disabled:opacity-40"
            >
              Add to cart
            </button>
          )}

          {product.description && <p className="text-sm text-ink/70 leading-relaxed">{product.description}</p>}
        </div>
      </div>
    </div>
  );
}
