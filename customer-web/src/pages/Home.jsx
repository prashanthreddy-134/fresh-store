import { useEffect, useState } from "react";
import { api } from "../api/client";
import NavBar from "../components/NavBar";
import ProductCard from "../components/ProductCard";
import Footer from "../components/Footer";

export default function Home() {
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [activeCategory, setActiveCategory] = useState(null);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/categories").then((res) => setCategories(res.data));
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = {};
    if (activeCategory) params.category = activeCategory;
    if (search) params.q = search;
    api
      .get("/products", { params })
      .then((res) => {
        let list = res.data.products;
        if (sort === "price_low") list = [...list].sort((a, b) => a.sellingPrice - b.sellingPrice);
        if (sort === "price_high") list = [...list].sort((a, b) => b.sellingPrice - a.sellingPrice);
        setProducts(list);
      })
      .finally(() => setLoading(false));
  }, [activeCategory, search, sort]);

  return (
    <div className="min-h-screen bg-cream">
      <NavBar search={search} onSearch={setSearch} />

      <div className="max-w-6xl mx-auto px-4 py-5">
        <div className="flex gap-3 overflow-x-auto pb-3 -mx-4 px-4">
          <button
            onClick={() => setActiveCategory(null)}
            className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium border ${
              !activeCategory ? "bg-leaf text-cream border-leaf" : "bg-white border-ink/15 text-ink/70"
            }`}
          >
            All
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setActiveCategory(c.slug)}
              className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium border ${
                activeCategory === c.slug ? "bg-leaf text-cream border-leaf" : "bg-white border-ink/15 text-ink/70"
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between mt-2 mb-4">
          <h2 className="font-display font-800 text-lg">
            {activeCategory ? categories.find((c) => c.slug === activeCategory)?.name : "All products"}
          </h2>
          <select value={sort} onChange={(e) => setSort(e.target.value)} className="text-sm border border-ink/15 rounded-full px-3 py-1.5 bg-white">
            <option value="">Sort: Relevance</option>
            <option value="price_low">Price: Low to High</option>
            <option value="price_high">Price: High to Low</option>
          </select>
        </div>

        {loading ? (
          <div className="text-center py-16 text-ink/40">Loading products...</div>
        ) : products.length === 0 ? (
          <div className="text-center py-16 text-ink/40">No products found. Try a different search.</div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}
