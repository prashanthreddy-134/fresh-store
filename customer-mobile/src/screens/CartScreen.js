import { View, Text, FlatList, TouchableOpacity, Image, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useCart } from "../context/CartContext";

export default function CartScreen({ navigation }) {
  const { items, subtotal, updateQuantity } = useCart();

  if (items.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.empty}>Your cart is empty.</Text>
        <TouchableOpacity onPress={() => navigation.navigate("Home")}>
          <Text style={styles.link}>Browse products →</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Your cart</Text>
      <FlatList
        data={items}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 0 }}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={styles.imageBox}>
              {item.product.imageUrl ? <Image source={{ uri: item.product.imageUrl }} style={styles.image} /> : <Text>🥬</Text>}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.name} numberOfLines={1}>{item.product.name}</Text>
              <Text style={styles.unit}>{item.product.unit}</Text>
              <Text style={styles.price}>₹{Number(item.product.sellingPrice)}</Text>
            </View>
            <View style={styles.qtyBox}>
              <TouchableOpacity onPress={() => updateQuantity(item.productId, item.quantity - 1)}><Text style={styles.qtyBtn}>−</Text></TouchableOpacity>
              <Text style={styles.qtyText}>{item.quantity}</Text>
              <TouchableOpacity onPress={() => updateQuantity(item.productId, item.quantity + 1)}><Text style={styles.qtyBtn}>+</Text></TouchableOpacity>
            </View>
          </View>
        )}
      />
      <View style={styles.footer}>
        <View style={styles.subtotalRow}>
          <Text style={styles.subtotalLabel}>Subtotal</Text>
          <Text style={styles.subtotalValue}>₹{subtotal.toFixed(2)}</Text>
        </View>
        <TouchableOpacity style={styles.checkoutBtn} onPress={() => navigation.navigate("Checkout")}>
          <Text style={styles.checkoutBtnText}>Proceed to checkout</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F7F8F3" },
  title: { fontWeight: "800", fontSize: 20, paddingHorizontal: 16, paddingTop: 12, color: "#182419" },
  empty: { textAlign: "center", marginTop: 100, color: "#18241966" },
  link: { textAlign: "center", color: "#1B7A43", fontWeight: "700", marginTop: 8 },
  row: { flexDirection: "row", gap: 10, backgroundColor: "white", borderRadius: 16, borderWidth: 1, borderColor: "#18241915", padding: 10, marginBottom: 10, alignItems: "center" },
  imageBox: { width: 52, height: 52, borderRadius: 12, backgroundColor: "#E3F3E8", alignItems: "center", justifyContent: "center", overflow: "hidden" },
  image: { width: "100%", height: "100%" },
  name: { fontWeight: "500", fontSize: 13, color: "#182419" },
  unit: { fontSize: 11, color: "#18241980" },
  price: { fontWeight: "800", fontSize: 13, marginTop: 2 },
  qtyBox: { flexDirection: "row", alignItems: "center", backgroundColor: "#1B7A43", borderRadius: 20, paddingHorizontal: 8, gap: 8 },
  qtyBtn: { color: "#F7F8F3", fontSize: 16, paddingVertical: 4 },
  qtyText: { color: "#F7F8F3", fontWeight: "700", fontSize: 12 },
  footer: { padding: 16, borderTopWidth: 1, borderTopColor: "#18241915", backgroundColor: "white" },
  subtotalRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 10 },
  subtotalLabel: { color: "#18241980" },
  subtotalValue: { fontWeight: "700" },
  checkoutBtn: { backgroundColor: "#1B7A43", borderRadius: 16, paddingVertical: 14, alignItems: "center" },
  checkoutBtnText: { color: "#F7F8F3", fontWeight: "700" },
});
