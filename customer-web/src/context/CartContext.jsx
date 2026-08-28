import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
} from "react";

import { api } from "../api/client";
import { useAuth } from "./AuthContext";

const CartContext = createContext(null);

const CART_REFRESH_INTERVAL = 10000; // 10 seconds

export function CartProvider({ children }) {
  const { user } = useAuth();

  const [items, setItems] = useState([]);
  const [subtotal, setSubtotal] = useState(0);

  // Customer-visible cart error.
  const [cartError, setCartError] = useState("");

  // Prevent multiple simultaneous refresh requests.
  const refreshingRef = useRef(false);

  // ============================================================
  // REFRESH CART
  // ============================================================

  const refresh = useCallback(async () => {
    if (!user) {
      setItems([]);
      setSubtotal(0);
      setCartError("");
      return;
    }

    if (refreshingRef.current) return;

    refreshingRef.current = true;

    try {
      const res = await api.get("/cart");

      setItems(res.data?.items || []);
      setSubtotal(Number(res.data?.subtotal || 0));

      // Clear previous error after successful refresh.
      setCartError("");
    } catch (err) {
      console.error("Cart refresh failed:", err);

      setCartError(
        err.response?.data?.error ||
          "Could not refresh your cart."
      );
    } finally {
      refreshingRef.current = false;
    }
  }, [user]);

  // ============================================================
  // INITIAL CART LOAD
  // ============================================================

  useEffect(() => {
    refresh();
  }, [refresh]);

  // ============================================================
  // AUTOMATIC CART REFRESH
  // ============================================================

  useEffect(() => {
    if (!user) return;

    const interval = setInterval(() => {
      refresh();
    }, CART_REFRESH_INTERVAL);

    return () => {
      clearInterval(interval);
    };
  }, [user, refresh]);

  // ============================================================
  // REFRESH WHEN CUSTOMER RETURNS TO WEBSITE
  // ============================================================

  useEffect(() => {
    if (!user) return;

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        refresh();
      }
    }

    document.addEventListener(
      "visibilitychange",
      handleVisibilityChange
    );

    return () => {
      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange
      );
    };
  }, [user, refresh]);

  // ============================================================
  // REFRESH WHEN INTERNET CONNECTION RETURNS
  // ============================================================

  useEffect(() => {
    if (!user) return;

    function handleOnline() {
      refresh();
    }

    window.addEventListener("online", handleOnline);

    return () => {
      window.removeEventListener(
        "online",
        handleOnline
      );
    };
  }, [user, refresh]);

  // ============================================================
  // ADD TO CART
  // ============================================================

  async function addToCart(productId, quantity = 1) {
    setCartError("");

    try {
      await api.post("/cart", {
        productId,
        quantity,
      });

      await refresh();
    } catch (err) {
      console.error("Add to cart failed:", err);

      const message =
        err.response?.data?.error ||
        "Could not add this product to your cart.";

      setCartError(message);

      throw err;
    }
  }

  // ============================================================
  // UPDATE QUANTITY
  // ============================================================

  async function updateQuantity(productId, quantity) {
    setCartError("");

    // Frontend safety validation.
    const safeQuantity = Number(quantity);

    if (
      !Number.isInteger(safeQuantity) ||
      safeQuantity < 0
    ) {
      const message =
        "Invalid cart quantity.";

      setCartError(message);

      throw new Error(message);
    }

    try {
      await api.put(`/cart/${productId}`, {
        quantity: safeQuantity,
      });

      await refresh();
    } catch (err) {
      console.error(
        "Cart quantity update failed:",
        err
      );

      const message =
        err.response?.data?.error ||
        "Could not update your cart.";

      setCartError(message);

      // Refresh again because stock may have changed
      // while the customer was viewing the cart.
      await refresh();

      throw err;
    }
  }

  // ============================================================
  // CART COUNT
  // ============================================================

  const count = items.reduce(
    (sum, item) =>
      sum + Number(item.quantity || 0),
    0
  );

  // ============================================================
  // PROVIDER
  // ============================================================

  return (
    <CartContext.Provider
      value={{
        items,
        subtotal,
        count,
        cartError,
        addToCart,
        updateQuantity,
        refresh,
        clearCartError: () => setCartError(""),
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  return useContext(CartContext);
}