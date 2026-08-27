import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import NavBar from "../components/NavBar";
import ProductCard from "../components/ProductCard";

export default function Wishlist() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);

  useEffect(() => {
    api.get("/wishlist").then((res) => setItems(res.data));
  }, []);

  return (
    <div className="min-h-screen bg-cream">
      <NavBar />

      <div className="max-w-6xl mx-auto px-4 py-6">

        {/* Back to Profile */}
        <button
          onClick={() => navigate("/profile")}
          className="flex items-center gap-2 text-sm font-medium text-leaf hover:opacity-70 transition mb-6"
        >
          <span className="text-lg">←</span>
          Back to Profile
        </button>

        <h1 className="font-display font-800 text-xl mb-4">
          Wishlist
        </h1>

        {items.length === 0 ? (
          <p className="text-ink/40 text-center py-16">
            Nothing saved yet.
          </p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {items.map((i) => (
              <ProductCard
                key={i.id}
                product={i.product}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}