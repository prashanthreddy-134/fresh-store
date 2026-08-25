import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";

export default function NavBar({ search, onSearch }) {
  const { user, logout } = useAuth();
  const { count } = useCart();
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-30 bg-cream/95 backdrop-blur border-b border-ink/10">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-4">
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <span className="w-9 h-9 rounded-xl2 bg-leaf grid place-items-center">
            <span className="text-cream font-display font-800 text-lg">F</span>
          </span>
          <div className="leading-tight">
            <div className="font-display font-800 text-lg text-ink">Fresh Store</div>
            <div className="text-[11px] font-mono text-leaf -mt-0.5">delivery in ~18 min</div>
          </div>
        </Link>

        {onSearch && (
          <div className="flex-1 max-w-xl">
            <input
              value={search}
              onChange={(e) => onSearch(e.target.value)}
              placeholder="Search for atta, rice, dal, milk..."
              className="w-full rounded-full border border-ink/15 bg-white px-4 py-2 text-sm focus:border-leaf"
            />
          </div>
        )}

        <nav className="ml-auto flex items-center gap-3 text-sm font-medium shrink-0">
          <Link to="/wishlist" className="hidden sm:inline hover:text-leaf">Wishlist</Link>
          <Link to="/orders" className="hidden sm:inline hover:text-leaf">Orders</Link>
          <Link to="/cart" className="relative px-3 py-2 rounded-full bg-leaf text-cream font-semibold">
            Cart
            {count > 0 && (
              <span className="absolute -top-2 -right-2 bg-mango text-white text-[11px] rounded-full w-5 h-5 grid place-items-center">
                {count}
              </span>
            )}
          </Link>
          {user ? (
            <button
              onClick={() => {
                logout();
                navigate("/login");
              }}
              className="text-ink/60 hover:text-ink"
            >
              Logout
            </button>
          ) : (
            <Link to="/login" className="text-leaf font-semibold">Login</Link>
          )}
        </nav>
      </div>
    </header>
  );
}
