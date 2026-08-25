import { useCallback, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { api } from "../api/client";

const NEXT_STATUS = {
  CONFIRMED: ["PACKED", "CANCELLED"],
  PACKED: ["OUT_FOR_DELIVERY", "CANCELLED"],
  OUT_FOR_DELIVERY: ["DELIVERED", "CANCELLED"],
};

export default function OrdersScreen() {
  const [orders, setOrders] = useState([]);

  const load = useCallback(() => {
    api.get("/admin/orders").then((res) => setOrders(res.data.orders));
  }, []);

  useFocusEffect(load);

  async function updateStatus(id, status) {
    await api.patch(`/admin/orders/${id}/status`, { status });
    load();
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Orders</Text>
      <FlatList
        data={orders}
        keyExtractor={(o) => o.id}
        contentContainerStyle={{ padding: 16 }}
        ListEmptyComponent={<Text style={styles.empty}>No orders yet.</Text>}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.rowBetween}>
              <View>
                <Text style={styles.orderNumber}>{item.orderNumber}</Text>
                <Text style={styles.customer}>{item.user?.name || item.user?.phone}</Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={styles.total}>₹{Number(item.total).toFixed(0)}</Text>
                <Text style={styles.paymentStatus}>{item.paymentStatus}</Text>
              </View>
            </View>
            <Text style={styles.itemsText}>{item.items.map((i) => `${i.name} ×${i.quantity}`).join(", ")}</Text>
            <View style={styles.actionsRow}>
              <View style={styles.statusBadge}><Text style={styles.statusBadgeText}>{item.status.replace(/_/g, " ")}</Text></View>
              {(NEXT_STATUS[item.status] || []).map((next) => (
                <TouchableOpacity
                  key={next}
                  onPress={() => updateStatus(item.id, next)}
                  style={next === "CANCELLED" ? styles.cancelBtn : styles.advanceBtn}
                >
                  <Text style={next === "CANCELLED" ? styles.cancelBtnText : styles.advanceBtnText}>{next.replace(/_/g, " ")}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F7F8F3" },
  title: { fontWeight: "800", fontSize: 20, paddingHorizontal: 16, paddingTop: 12, color: "#182419" },
  empty: { textAlign: "center", marginTop: 60, color: "#18241966" },
  card: { backgroundColor: "white", borderRadius: 16, borderWidth: 1, borderColor: "#18241915", padding: 14, marginBottom: 10 },
  rowBetween: { flexDirection: "row", justifyContent: "space-between" },
  orderNumber: { fontWeight: "700", fontSize: 13 },
  customer: { fontSize: 11, color: "#18241980" },
  total: { fontWeight: "800" },
  paymentStatus: { fontSize: 10, color: "#18241980" },
  itemsText: { fontSize: 11, color: "#18241999", marginVertical: 8 },
  actionsRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, alignItems: "center" },
  statusBadge: { backgroundColor: "#E3F3E8", borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  statusBadgeText: { fontSize: 10, fontWeight: "700", color: "#1B7A43" },
  advanceBtn: { backgroundColor: "#1B7A43", borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5 },
  advanceBtnText: { color: "white", fontSize: 10, fontWeight: "700" },
  cancelBtn: { borderWidth: 1, borderColor: "#FCA5A5", borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5 },
  cancelBtnText: { color: "#dc2626", fontSize: 10, fontWeight: "700" },
});
