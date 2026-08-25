import { useEffect, useState, useCallback } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { api } from "../api/client";

const STEPS = ["CONFIRMED", "PACKED", "OUT_FOR_DELIVERY", "DELIVERED"];

export default function OrderDetailScreen({ route }) {
  const { id } = route.params;
  const [order, setOrder] = useState(null);
  const [cancelling, setCancelling] = useState(false);

  const load = useCallback(() => {
    api.get(`/orders/${id}`).then((res) => setOrder(res.data));
  }, [id]);

  useFocusEffect(load);

  // Poll for status updates while the screen is focused and the order is still moving —
  // near-real-time tracking without a WebSocket server, paired with the push notification
  // that fires server-side whenever an admin advances the order status.
  useEffect(() => {
    if (!order || ["DELIVERED", "CANCELLED"].includes(order.status)) return;
    const interval = setInterval(load, 8000);
    return () => clearInterval(interval);
  }, [order?.status, load]);

  function confirmCancel() {
    Alert.alert("Cancel order?", "This cannot be undone.", [
      { text: "No", style: "cancel" },
      { text: "Yes, cancel", style: "destructive", onPress: cancelOrder },
    ]);
  }

  async function cancelOrder() {
    setCancelling(true);
    try {
      await api.post(`/orders/${id}/cancel`, { reason: "Changed my mind" });
      load();
    } finally {
      setCancelling(false);
    }
  }

  if (!order) return <SafeAreaView style={styles.container}><Text style={styles.loading}>Loading...</Text></SafeAreaView>;

  const currentStepIndex = STEPS.indexOf(order.status);
  const cancellable = !["OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED"].includes(order.status);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <Text style={styles.title}>{order.orderNumber}</Text>
        <Text style={styles.date}>{new Date(order.placedAt).toLocaleString()}</Text>

        {order.status === "CANCELLED" ? (
          <View style={styles.cancelledBox}>
            <Text style={styles.cancelledText}>Order cancelled{order.cancelReason ? `: ${order.cancelReason}` : ""}</Text>
          </View>
        ) : (
          <View style={styles.progressRow}>
            {STEPS.map((step, i) => (
              <View key={step} style={styles.progressStep}>
                <Text style={[styles.stepLabel, i <= currentStepIndex && styles.stepLabelActive]}>{step.replace(/_/g, " ")}</Text>
                <View style={[styles.dot, i <= currentStepIndex && styles.dotActive]} />
              </View>
            ))}
          </View>
        )}

        <View style={styles.card}>
          {order.items.map((item) => (
            <View key={item.id} style={styles.itemRow}>
              <Text style={styles.itemName}>{item.name} × {item.quantity}</Text>
              <Text>₹{(Number(item.price) * item.quantity).toFixed(2)}</Text>
            </View>
          ))}
          <View style={[styles.itemRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>₹{Number(order.total).toFixed(2)}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>Delivering to</Text>
          <Text style={styles.cardText}>{order.address.line1}, {order.address.city}, {order.address.state} - {order.address.pincode}</Text>
        </View>

        <Text style={styles.paymentStatus}>Payment status: <Text style={{ fontWeight: "700" }}>{order.paymentStatus}</Text></Text>

        {cancellable && (
          <TouchableOpacity style={styles.cancelBtn} onPress={confirmCancel} disabled={cancelling}>
            <Text style={styles.cancelBtnText}>{cancelling ? "Cancelling..." : "Cancel order"}</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F7F8F3" },
  loading: { textAlign: "center", marginTop: 60, color: "#18241966" },
  title: { fontWeight: "800", fontSize: 20, color: "#182419" },
  date: { fontSize: 12, color: "#18241980", marginBottom: 16 },
  cancelledBox: { backgroundColor: "#FEE2E2", borderRadius: 16, padding: 14, marginBottom: 16 },
  cancelledText: { color: "#dc2626", fontSize: 13 },
  progressRow: { flexDirection: "row", marginBottom: 20 },
  progressStep: { flex: 1, alignItems: "center" },
  stepLabel: { fontSize: 9, color: "#18241966", marginBottom: 4, textAlign: "center" },
  stepLabelActive: { color: "#1B7A43", fontWeight: "700" },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: "#18241926" },
  dotActive: { backgroundColor: "#1B7A43" },
  card: { backgroundColor: "white", borderRadius: 16, borderWidth: 1, borderColor: "#18241915", padding: 14, marginBottom: 12 },
  itemRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: "#18241910" },
  itemName: { fontSize: 13 },
  totalRow: { borderBottomWidth: 0, borderTopWidth: 1, borderTopColor: "#18241915", marginTop: 4, paddingTop: 8 },
  totalLabel: { fontWeight: "800" },
  totalValue: { fontWeight: "800" },
  cardLabel: { fontWeight: "700", fontSize: 13, marginBottom: 4 },
  cardText: { fontSize: 13, color: "#18241999" },
  paymentStatus: { fontSize: 13, color: "#18241999", marginBottom: 16 },
  cancelBtn: { borderWidth: 1, borderColor: "#FCA5A5", borderRadius: 16, paddingVertical: 14, alignItems: "center" },
  cancelBtnText: { color: "#dc2626", fontWeight: "700" },
});
