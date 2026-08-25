import { Link } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

export default function ProductCard({ product }) {
  const { addToCart, items, updateQuantity } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  const cartItem = items.find((i) => i.productId === product.id);

  function handleAdd(e) {
    e.preventDefault();
    if (!user) return navigate("/login");
    addToCart(product.id, 1);
  }

  return (
    <Link to={`/product/${product.slug}`} className="group bg-white rounded-xl2 border border-ink/10 p-3 flex flex-col hover:shadow-md transition-shadow">
      <div className="aspect-square rounded-xl bg-leaf-light overflow-hidden mb-2 grid place-items-center">
        {product.imageUrl ? (
          <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
        ) : (
          <span className="text-3xl">🥬</span>
        )}
      </div>
      {product.discountPct > 0 && (
        <span className="absolute mt-1 ml-1 bg-mango text-white text-[11px] font-semibold px-2 py-0.5 rounded-full w-fit">
          {Math.round(product.discountPct)}% OFF
        </span>
      )}
      <div className="text-xs text-ink/50 mb-0.5">{product.unit}</div>
      <div className="text-sm font-medium text-ink line-clamp-2 mb-1">{product.name}</div>
      <div className="mt-auto flex items-center justify-between">
        <div>
          <span className="font-display font-800 text-ink">₹{Number(product.sellingPrice)}</span>
          {product.mrp > product.sellingPrice && (
            <span className="text-xs text-ink/40 line-through ml-1">₹{Number(product.mrp)}</span>
          )}
        </div>
        {cartItem ? (
          <div className="flex items-center gap-1 bg-leaf text-cream rounded-full px-1" onClick={(e) => e.preventDefault()}>
            <button onClick={() => updateQuantity(product.id, cartItem.quantity - 1)} className="w-6 h-6">−</button>
            <span className="text-xs font-mono w-4 text-center">{cartItem.quantity}</span>
            <button onClick={() => updateQuantity(product.id, cartItem.quantity + 1)} className="w-6 h-6">+</button>
          </div>
        ) : (
          <button onClick={handleAdd} className="text-xs font-semibold text-leaf border border-leaf rounded-full px-3 py-1 hover:bg-leaf hover:text-white">
            ADD
          </button>
        )}
      </div>
    </Link>
  );
}
