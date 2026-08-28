import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../api/client";
import NavBar from "../components/NavBar";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";

export default function ProductDetail() {
  const { idOrSlug } = useParams();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const {
    addToCart,
    items,
    updateQuantity,
    cartError,
    clearCartError,
  } = useCart();

  const { user } = useAuth();
  const navigate = useNavigate();

  // ============================================================
  // LOAD PRODUCT
  // ============================================================

  useEffect(() => {
    let mounted = true;

    async function loadProduct() {
      setLoading(true);
      setError("");
      setProduct(null);

      try {
        const res = await api.get(
          `/products/${idOrSlug}`
        );

        if (!mounted) return;

        setProduct(res.data);
      } catch (err) {
        console.error(
          "Could not load product:",
          err
        );

        if (!mounted) return;

        setError(
          err.response?.data?.error ||
            "Could not load this product."
        );
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadProduct();

    return () => {
      mounted = false;
    };
  }, [idOrSlug]);

  // ============================================================
  // LOADING
  // ============================================================

  if (loading) {
    return (
      <div className="min-h-screen bg-cream">
        <NavBar />

        <div className="max-w-4xl mx-auto px-4 py-16 text-center">
          <div className="text-ink/40">
            Loading product...
          </div>
        </div>
      </div>
    );
  }

  // ============================================================
  // ERROR
  // ============================================================

  if (error || !product) {
    return (
      <div className="min-h-screen bg-cream">
        <NavBar />

        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-5">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="text-sm font-medium text-leaf hover:opacity-70 transition"
            >
              ← Back
            </button>

            <button
              type="button"
              onClick={() => navigate("/")}
              className="text-sm font-medium text-leaf hover:opacity-70 transition"
            >
              Home
            </button>
          </div>

          <div className="bg-white rounded-xl2 border border-ink/10 p-8 text-center">
            <h1 className="font-display font-800 text-xl mb-2">
              Product unavailable
            </h1>

            <p className="text-sm text-ink/50 mb-5">
              {error ||
                "This product could not be found."}
            </p>

            <button
              type="button"
              onClick={() => navigate("/")}
              className="bg-leaf text-cream rounded-full px-5 py-2.5 text-sm font-semibold"
            >
              Browse products
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================
  // CART ITEM
  // ============================================================

  const cartItem = items.find(
    (item) =>
      item.productId === product.id
  );

  const stock = Number(
    product.stockQty ?? 0
  );

  const sellingPrice = Number(
    product.sellingPrice ?? 0
  );

  const mrp = Number(
    product.mrp ?? 0
  );

  const discountPct = Number(
    product.discountPct ?? 0
  );

  const isOutOfStock = stock <= 0;

  const cartQuantity = Number(
    cartItem?.quantity ?? 0
  );

  const canIncrease =
    !isOutOfStock &&
    cartQuantity < stock;

  // ============================================================
  // ADD TO CART
  // ============================================================

  async function handleAddToCart() {
    if (isOutOfStock || actionLoading) {
      return;
    }

    clearCartError();
    setActionLoading(true);

    try {
      await addToCart(product.id, 1);
    } catch (err) {
      // CartContext stores the customer-facing error.
    } finally {
      setActionLoading(false);
    }
  }

  // ============================================================
  // DECREASE QUANTITY
  // ============================================================

  async function handleDecrease() {
    if (!cartItem || actionLoading) {
      return;
    }

    clearCartError();
    setActionLoading(true);

    try {
      await updateQuantity(
        product.id,
        cartQuantity - 1
      );
    } catch (err) {
      // CartContext handles the error.
    } finally {
      setActionLoading(false);
    }
  }

  // ============================================================
  // INCREASE QUANTITY
  // ============================================================

  async function handleIncrease() {
    if (
      !cartItem ||
      !canIncrease ||
      actionLoading
    ) {
      return;
    }

    clearCartError();
    setActionLoading(true);

    try {
      await updateQuantity(
        product.id,
        cartQuantity + 1
      );
    } catch (err) {
      // CartContext handles the error.
    } finally {
      setActionLoading(false);
    }
  }

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div className="min-h-screen bg-cream">
      <NavBar />

      <div className="max-w-4xl mx-auto px-4 py-6">

        {/* ====================================================== */}
        {/* NAVIGATION */}
        {/* ====================================================== */}

        <div className="flex items-center justify-between mb-5">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="text-sm font-medium text-leaf hover:opacity-70 transition"
          >
            ← Back
          </button>

          <button
            type="button"
            onClick={() => navigate("/")}
            className="text-sm font-medium text-leaf hover:opacity-70 transition"
          >
            Home
          </button>
        </div>

        {/* ====================================================== */}
        {/* PRODUCT */}
        {/* ====================================================== */}

        <div className="grid md:grid-cols-2 gap-8">

          {/* Product Image */}
          <div
            className={`aspect-square rounded-xl2 bg-leaf-light grid place-items-center overflow-hidden ${
              isOutOfStock
                ? "opacity-70"
                : ""
            }`}
          >
            {product.imageUrl ? (
              <img
                src={product.imageUrl}
                alt={product.name}
                className={`w-full h-full object-cover rounded-xl2 ${
                  isOutOfStock
                    ? "grayscale"
                    : ""
                }`}
              />
            ) : (
              <span className="text-6xl">
                🥬
              </span>
            )}
          </div>

          {/* Product Information */}
          <div>

            {/* Category */}
            {product.category?.name && (
              <div className="text-sm text-ink/50 mb-1">
                {product.category.name}
              </div>
            )}

            {/* Name */}
            <h1 className="font-display font-800 text-2xl mb-1">
              {product.name}
            </h1>

            {/* Unit */}
            <div className="text-ink/50 mb-4">
              {product.unit}
            </div>

            {/* Price */}
            <div className="flex flex-wrap items-baseline gap-2 mb-1">
              <span className="font-display font-800 text-3xl">
                ₹{sellingPrice.toFixed(2)}
              </span>

              {mrp > sellingPrice && (
                <span className="text-ink/40 line-through">
                  ₹{mrp.toFixed(2)}
                </span>
              )}

              {discountPct > 0 && (
                <span className="bg-mango text-white text-xs font-semibold px-2 py-0.5 rounded-full">
                  {Math.round(discountPct)}%
                  {" "}OFF
                </span>
              )}
            </div>

            {/* Stock */}
            <div
              className={`text-sm mb-5 ${
                isOutOfStock
                  ? "text-red-600"
                  : stock <= 10
                  ? "text-orange-600"
                  : "text-leaf"
              }`}
            >
              {isOutOfStock
                ? "Out of stock"
                : stock <= 10
                ? `Only ${stock} left`
                : `In stock (${stock} available)`}
            </div>

            {/* Cart Error */}
            {cartError && (
              <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm text-red-600">
                    {cartError}
                  </p>

                  <button
                    type="button"
                    onClick={clearCartError}
                    className="text-red-500 text-lg leading-none"
                    aria-label="Dismiss error"
                  >
                    ×
                  </button>
                </div>
              </div>
            )}

            {/* ================================================== */}
            {/* CART CONTROLS */}
            {/* ================================================== */}

            {cartItem ? (
              <div className="mb-6">

                <div className="flex items-center gap-3 bg-leaf text-cream rounded-full px-4 py-2 w-fit">

                  <button
                    type="button"
                    onClick={handleDecrease}
                    disabled={actionLoading}
                    className="text-lg w-7 h-7 disabled:opacity-40"
                    aria-label="Decrease quantity"
                  >
                    −
                  </button>

                  <span className="font-mono w-6 text-center">
                    {cartQuantity}
                  </span>

                  <button
                    type="button"
                    onClick={handleIncrease}
                    disabled={
                      actionLoading ||
                      !canIncrease
                    }
                    className={`text-lg w-7 h-7 ${
                      !canIncrease ||
                      actionLoading
                        ? "opacity-40 cursor-not-allowed"
                        : ""
                    }`}
                    aria-label="Increase quantity"
                  >
                    +
                  </button>

                </div>

                {!canIncrease &&
                  !isOutOfStock && (
                    <p className="text-xs text-orange-600 mt-2">
                      Maximum available quantity reached.
                    </p>
                  )}

                {isOutOfStock && (
                  <p className="text-xs text-red-600 mt-2">
                    This product is currently out of stock.
                  </p>
                )}
              </div>
            ) : (
              <button
                type="button"
                disabled={
                  isOutOfStock ||
                  actionLoading
                }
                onClick={
                  user
                    ? handleAddToCart
                    : () => navigate("/login")
                }
                className="bg-leaf text-cream rounded-full px-6 py-3 font-semibold mb-6 disabled:opacity-40"
              >
                {actionLoading
                  ? "Adding..."
                  : isOutOfStock
                  ? "Out of stock"
                  : "Add to cart"}
              </button>
            )}

            {/* Description */}
            {product.description && (
              <div className="border-t border-ink/10 pt-5">
                <h2 className="font-display font-800 text-base mb-2">
                  About this product
                </h2>

                <p className="text-sm text-ink/70 leading-relaxed">
                  {product.description}
                </p>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}