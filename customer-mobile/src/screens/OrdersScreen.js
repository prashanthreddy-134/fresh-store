import { useEffect, useState, useCallback } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { api } from "../api/client";

const STATUS_STYLE = {
  PENDING_PAYMENT: { bg: "#18241915", fg: "#18241999" },
  CONFIRMED: { bg: "#E3F3E8", fg: "#1B7A43" },
  PACKED: { bg: "#E3F3E8", fg: "#1B7A43" },
  OUT_FOR_DELIVERY: { bg: "#FF7A1A22", fg: "#E0630A" },
  DELIVERED: { bg: "#1B7A43", fg: "white" },
  CANCELLED: { bg: "#FEE2E2", fg: "#dc2626" },
};

export default function OrdersScreen({ navigation }) {
  const [orders, setOrders] = useState([]);

  useFocusEffect(
    useCallback(() => {
      api.get("/orders").then((res) => setOrders(res.data));
    }, [])
  );

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Your orders</Text>
      <FlatList
        data={orders}
        keyExtractor={(o) => o.id}
        contentContainerStyle={{ padding: 16 }}
        ListEmptyComponent={<Text style={styles.empty}>No orders yet.</Text>}
        renderItem={({ item }) => {
          const s = STATUS_STYLE[item.status];
          return (
            <TouchableOpacity style={styles.card} onPress={() => navigation.navigate("OrderDetail", { id: item.id })}>
              <View style={styles.rowBetween}>
                <Text style={styles.orderNumber}>{item.orderNumber}</Text>
                <View style={[styles.badge, { backgroundColor: s.bg }]}>
                  <Text style={[styles.badgeText, { color: s.fg }]}>{item.status.replace(/_/g, " ")}</Text>
                </View>
              </View>
              <Text style={styles.date}>{new Date(item.placedAt).toLocaleString()}</Text>
              <Text style={styles.summary}>{item.items.length} item{item.items.length > 1 ? "s" : ""} · ₹{Number(item.total).toFixed(2)}</Text>
            </TouchableOpacity>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F7F8F3" },
  title: { fontWeight: "800", fontSize: 20, paddingHorizontal: 16, paddingTop: 12, color: "#182419" },
  empty: { textAlign: "center", marginTop: 60, color: "#18241966" },
  card: { backgroundColor: "white", borderRadius: 16, borderWidth: 1, borderColor: "#18241915", padding: 14, marginBottom: 10 },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  orderNumber: { fontWeight: "700", fontSize: 13 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  badgeText: { fontSize: 10, fontWeight: "700" },
  date: { fontSize: 11, color: "#18241980", marginTop: 2 },
  summary: { fontSize: 13, marginTop: 4 },
});
