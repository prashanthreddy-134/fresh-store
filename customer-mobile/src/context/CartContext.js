import { createContext, useContext, useState, useCallback, useEffect } from "react";
import { api } from "../api/client";
import { useAuth } from "./AuthContext";

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [subtotal, setSubtotal] = useState(0);

  const refresh = useCallback(async () => {
    if (!user) {
      setItems([]);
      setSubtotal(0);
      return;
    }
    const res = await api.get("/cart");
    setItems(res.data.items);
    setSubtotal(res.data.subtotal);
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function addToCart(productId, quantity = 1) {
    await api.post("/cart", { productId, quantity });
    await refresh();
  }

  async function updateQuantity(productId, quantity) {
    await api.put(`/cart/${productId}`, { quantity });
    await refresh();
  }

  const count = items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <CartContext.Provider value={{ items, subtotal, count, addToCart, updateQuantity, refresh }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  return useContext(CartContext);
}
