import { useEffect, useState } from "react";
import { View, Text, Image, TouchableOpacity, StyleSheet, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { api } from "../api/client";
import { useCart } from "../context/CartContext";

export default function ProductDetailScreen({ route }) {
  const { idOrSlug } = route.params;
  const [product, setProduct] = useState(null);
  const { addToCart, items, updateQuantity } = useCart();

  useEffect(() => {
    api.get(`/products/${idOrSlug}`).then((res) => setProduct(res.data));
  }, [idOrSlug]);

  if (!product) return <SafeAreaView style={styles.container}><Text style={styles.loading}>Loading...</Text></SafeAreaView>;

  const cartItem = items.find((i) => i.productId === product.id);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <View style={styles.imageBox}>
          {product.imageUrl ? <Image source={{ uri: product.imageUrl }} style={styles.image} /> : <Text style={{ fontSize: 56 }}>🥬</Text>}
        </View>
        <Text style={styles.category}>{product.category?.name}</Text>
        <Text style={styles.name}>{product.name}</Text>
        <Text style={styles.unit}>{product.unit}</Text>

        <View style={styles.priceRow}>
          <Text style={styles.price}>₹{Number(product.sellingPrice)}</Text>
          {product.mrp > product.sellingPrice && <Text style={styles.mrp}>₹{Number(product.mrp)}</Text>}
        </View>
        <Text style={[styles.stock, { color: product.stockQty > 0 ? "#1B7A43" : "#dc2626" }]}>
          {product.stockQty > 0 ? `In stock (${product.stockQty} available)` : "Out of stock"}
        </Text>

        {cartItem ? (
          <View style={styles.qtyBox}>
            <TouchableOpacity onPress={() => updateQuantity(product.id, cartItem.quantity - 1)}><Text style={styles.qtyBtn}>−</Text></TouchableOpacity>
            <Text style={styles.qtyText}>{cartItem.quantity}</Text>
            <TouchableOpacity onPress={() => updateQuantity(product.id, cartItem.quantity + 1)}><Text style={styles.qtyBtn}>+</Text></TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity disabled={product.stockQty === 0} style={styles.addBtn} onPress={() => addToCart(product.id, 1)}>
            <Text style={styles.addBtnText}>Add to cart</Text>
          </TouchableOpacity>
        )}

        {!!product.description && <Text style={styles.description}>{product.description}</Text>}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F7F8F3" },
  loading: { textAlign: "center", marginTop: 60, color: "#18241966" },
  imageBox: { aspectRatio: 1, borderRadius: 20, backgroundColor: "#E3F3E8", alignItems: "center", justifyContent: "center", marginBottom: 14, overflow: "hidden" },
  image: { width: "100%", height: "100%" },
  category: { color: "#18241980", fontSize: 12, marginBottom: 2 },
  name: { fontWeight: "800", fontSize: 22, color: "#182419" },
  unit: { color: "#18241980", marginBottom: 10 },
  priceRow: { flexDirection: "row", alignItems: "baseline", gap: 8 },
  price: { fontWeight: "800", fontSize: 28, color: "#182419" },
  mrp: { color: "#18241966", textDecorationLine: "line-through" },
  stock: { marginTop: 4, marginBottom: 16, fontSize: 13 },
  addBtn: { backgroundColor: "#1B7A43", borderRadius: 20, paddingVertical: 14, alignItems: "center", marginBottom: 16 },
  addBtnText: { color: "#F7F8F3", fontWeight: "700" },
  qtyBox: { flexDirection: "row", alignItems: "center", backgroundColor: "#1B7A43", borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, gap: 16, alignSelf: "flex-start", marginBottom: 16 },
  qtyBtn: { color: "#F7F8F3", fontSize: 20 },
  qtyText: { color: "#F7F8F3", fontWeight: "700", fontSize: 16 },
  description: { color: "#18241999", lineHeight: 20 },
});
