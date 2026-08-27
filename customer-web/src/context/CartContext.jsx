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

  const refreshingRef = useRef(false);

  const refresh = useCallback(async () => {
    if (!user) {
      setItems([]);
      setSubtotal(0);
      return;
    }

    // Prevent multiple simultaneous refresh requests.
    if (refreshingRef.current) return;

    refreshingRef.current = true;

    try {
      const res = await api.get("/cart");

      setItems(res.data.items || []);
      setSubtotal(Number(res.data.subtotal || 0));
    } catch (err) {
      console.error("Cart refresh failed:", err);
    } finally {
      refreshingRef.current = false;
    }
  }, [user]);

  // Initial cart load whenever authentication changes.
  useEffect(() => {
    refresh();
  }, [refresh]);

  // ------------------------------------------------------------
  // AUTOMATIC CART REFRESH
  // ------------------------------------------------------------

  useEffect(() => {
    if (!user) return;

    // Refresh every 10 seconds.
    const interval = setInterval(() => {
      refresh();
    }, CART_REFRESH_INTERVAL);

    return () => {
      clearInterval(interval);
    };
  }, [user, refresh]);

  // ------------------------------------------------------------
  // REFRESH WHEN CUSTOMER RETURNS TO WEBSITE
  // ------------------------------------------------------------

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

  // ------------------------------------------------------------
  // REFRESH WHEN INTERNET CONNECTION RETURNS
  // ------------------------------------------------------------

  useEffect(() => {
    if (!user) return;

    function handleOnline() {
      refresh();
    }

    window.addEventListener(
      "online",
      handleOnline
    );

    return () => {
      window.removeEventListener(
        "online",
        handleOnline
      );
    };
  }, [user, refresh]);

  // ------------------------------------------------------------
  // ADD TO CART
  // ------------------------------------------------------------

  async function addToCart(
    productId,
    quantity = 1
  ) {
    try {
      await api.post("/cart", {
        productId,
        quantity,
      });

      await refresh();
    } catch (err) {
      console.error(
        "Add to cart failed:",
        err
      );

      throw err;
    }
  }

  // ------------------------------------------------------------
  // UPDATE QUANTITY
  // ------------------------------------------------------------

  async function updateQuantity(
    productId,
    quantity
  ) {
    try {
      await api.put(
        `/cart/${productId}`,
        { quantity }
      );

      await refresh();
    } catch (err) {
      console.error(
        "Cart quantity update failed:",
        err
      );

      throw err;
    }
  }

  // ------------------------------------------------------------
  // CART COUNT
  // ------------------------------------------------------------

  const count = items.reduce(
    (sum, item) =>
      sum + Number(item.quantity || 0),
    0
  );

  return (
    <CartContext.Provider
      value={{
        items,
        subtotal,
        count,
        addToCart,
        updateQuantity,
        refresh,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  return useContext(CartContext);
}