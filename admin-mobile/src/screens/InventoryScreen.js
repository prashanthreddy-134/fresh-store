import { useCallback, useState } from "react";
import { View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { api } from "../api/client";

export default function InventoryScreen({ navigation }) {
  const [products, setProducts] = useState([]);

  const load = useCallback(() => {
    api.get("/products", { params: { limit: 100 } }).then((res) => setProducts(res.data.products));
  }, []);

  useFocusEffect(load);

  async function updateStock(id, value) {
    const qty = Number(value);
    if (Number.isNaN(qty) || qty < 0) return;
    await api.patch(`/products/${id}/stock`, { stockQty: qty });
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Inventory</Text>
      <Text style={styles.subtitle}>Tap a product to edit it. Tap a stock number to update it directly.</Text>
      <FlatList
        data={products}
        keyExtractor={(p) => p.id}
        contentContainerStyle={{ padding: 16 }}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <TouchableOpacity style={{ flex: 1 }} onPress={() => navigation.navigate("AddProduct", { product: item })}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.unit}>{item.unit} · ₹{Number(item.sellingPrice)}</Text>
            </TouchableOpacity>
            <TextInput
              style={[styles.stockInput, item.stockQty <= item.lowStockAlert && styles.stockLow]}
              keyboardType="number-pad"
              defaultValue={String(item.stockQty)}
              onEndEditing={(e) => updateStock(item.id, e.nativeEvent.text)}
            />
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F7F8F3" },
  title: { fontWeight: "800", fontSize: 20, paddingHorizontal: 16, paddingTop: 12, color: "#182419" },
  subtitle: { fontSize: 11, color: "#18241980", paddingHorizontal: 16, marginTop: 4 },
  row: { flexDirection: "row", alignItems: "center", backgroundColor: "white", borderRadius: 14, borderWidth: 1, borderColor: "#18241915", padding: 12, marginBottom: 8 },
  name: { fontWeight: "600", fontSize: 13 },
  unit: { fontSize: 11, color: "#18241980", marginTop: 2 },
  stockInput: { width: 56, borderWidth: 1, borderColor: "#18241926", borderRadius: 10, padding: 8, textAlign: "center", fontWeight: "700" },
  stockLow: { borderColor: "#FF7A1A", color: "#E0630A" },
});
