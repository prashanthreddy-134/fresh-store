import { useEffect, useState, useCallback, useRef } from "react";
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
  const [error, setError] = useState("");

  const requestIdRef = useRef(0);

  // ============================================================
  // LOAD CATEGORIES
  // ============================================================

  useEffect(() => {
    let mounted = true;

    async function loadCategories() {
      try {
        const res = await api.get("/categories");

        if (mounted) {
          setCategories(res.data || []);
        }
      } catch (err) {
        console.error("Could not load categories:", err);

        if (mounted) {
          setCategories([]);
        }
      }
    }

    loadCategories();

    return () => {
      mounted = false;
    };
  }, []);

  // ============================================================
  // LOAD PRODUCTS
  // ============================================================

  const loadProducts = useCallback(
    async ({ silent = false } = {}) => {
      const requestId = ++requestIdRef.current;

      if (!silent) {
        setLoading(true);
      }

      try {
        const params = {};

        if (activeCategory) {
          params.category = activeCategory;
        }

        const cleanSearch = search.trim();

        if (cleanSearch) {
          params.q = cleanSearch;
        }

        const res = await api.get("/products", {
          params: {
            ...params,
            _t: Date.now(),
          },
          headers: {
            "Cache-Control": "no-cache",
            Pragma: "no-cache",
          },
        });

        // Ignore an older request if a newer request already finished.
        if (requestId !== requestIdRef.current) {
          return;
        }

        let list = Array.isArray(res.data?.products)
          ? res.data.products
          : [];

        // ========================================================
        // SORTING
        // ========================================================

        if (sort === "price_low") {
          list = [...list].sort(
            (a, b) =>
              Number(a.sellingPrice) -
              Number(b.sellingPrice)
          );
        }

        if (sort === "price_high") {
          list = [...list].sort(
            (a, b) =>
              Number(b.sellingPrice) -
              Number(a.sellingPrice)
          );
        }

        setProducts(list);
        setError("");
      } catch (err) {
        console.error("Could not load products:", err);

        // Ignore errors from outdated requests.
        if (requestId !== requestIdRef.current) {
          return;
        }

        // Keep already-loaded products during silent refresh.
        if (!silent) {
          setProducts([]);
          setError(
            err.response?.data?.error ||
              "Could not load products. Please try again."
          );
        }
      } finally {
        if (
          !silent &&
          requestId === requestIdRef.current
        ) {
          setLoading(false);
        }
      }
    },
    [activeCategory, search, sort]
  );

  // ============================================================
  // INITIAL LOAD + FILTER CHANGES
  // ============================================================

  useEffect(() => {
    const timer = setTimeout(() => {
      loadProducts();
    }, 350);

    return () => clearTimeout(timer);
  }, [loadProducts]);

  // ============================================================
  // AUTOMATIC STOCK REFRESH
  // ============================================================
  // Refresh stock silently every 10 seconds.
  // This avoids hammering the backend every 3 seconds while
  // still keeping customer stock reasonably up to date.
  // ============================================================

  useEffect(() => {
    const interval = setInterval(() => {
      loadProducts({ silent: true });
    }, 10000);

    return () => clearInterval(interval);
  }, [loadProducts]);

  // ============================================================
  // RETRY
  // ============================================================

  function handleRetry() {
    setError("");
    loadProducts();
  }

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div className="min-h-screen bg-cream">
      <NavBar
        search={search}
        onSearch={setSearch}
      />

      <div className="max-w-6xl mx-auto px-4 py-5">

        {/* ====================================================== */}
        {/* CATEGORIES */}
        {/* ====================================================== */}

        <div className="flex gap-3 overflow-x-auto pb-3 -mx-4 px-4">
          <button
            type="button"
            onClick={() => setActiveCategory(null)}
            className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium border ${
              !activeCategory
                ? "bg-leaf text-cream border-leaf"
                : "bg-white border-ink/15 text-ink/70"
            }`}
          >
            All
          </button>

          {categories.map((category) => (
            <button
              type="button"
              key={category.id}
              onClick={() =>
                setActiveCategory(category.slug)
              }
              className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium border ${
                activeCategory === category.slug
                  ? "bg-leaf text-cream border-leaf"
                  : "bg-white border-ink/15 text-ink/70"
              }`}
            >
              {category.name}
            </button>
          ))}
        </div>

        {/* ====================================================== */}
        {/* HEADING + SORTING */}
        {/* ====================================================== */}

        <div className="flex items-center justify-between gap-3 mt-2 mb-4">
          <h2 className="font-display font-800 text-lg">
            {activeCategory
              ? categories.find(
                  (category) =>
                    category.slug === activeCategory
                )?.name || "Products"
              : search.trim()
              ? "Search results"
              : "All products"}
          </h2>

          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="text-sm border border-ink/15 rounded-full px-3 py-1.5 bg-white shrink-0"
          >
            <option value="">
              Sort: Relevance
            </option>

            <option value="price_low">
              Price: Low to High
            </option>

            <option value="price_high">
              Price: High to Low
            </option>
          </select>
        </div>

        {/* ====================================================== */}
        {/* ERROR STATE */}
        {/* ====================================================== */}

        {error && !loading && (
          <div className="bg-white border border-red-200 rounded-xl2 p-6 text-center mb-5">
            <div className="text-red-600 font-semibold mb-1">
              Something went wrong
            </div>

            <p className="text-sm text-ink/60 mb-4">
              {error}
            </p>

            <button
              type="button"
              onClick={handleRetry}
              className="bg-leaf text-cream rounded-full px-5 py-2 text-sm font-semibold"
            >
              Try again
            </button>
          </div>
        )}

        {/* ====================================================== */}
        {/* PRODUCTS */}
        {/* ====================================================== */}

        {loading ? (
          <div className="text-center py-16 text-ink/40">
            Loading products...
          </div>
        ) : !error && products.length === 0 ? (
          <div className="text-center py-16 text-ink/40">
            <div className="text-lg font-semibold text-ink/60 mb-1">
              No products found
            </div>

            <div className="text-sm">
              Try a different search or category.
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
              />
            ))}
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}