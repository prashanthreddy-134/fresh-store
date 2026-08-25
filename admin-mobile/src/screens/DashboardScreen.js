import { useCallback, useState } from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { api } from "../api/client";

function StatCard({ label, value, accent }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, accent && { color: accent }]}>{value}</Text>
    </View>
  );
}

export default function DashboardScreen() {
  const [data, setData] = useState(null);

  useFocusEffect(
    useCallback(() => {
      api.get("/admin/dashboard").then((res) => setData(res.data));
    }, [])
  );

  if (!data) return <SafeAreaView style={styles.container}><Text style={styles.loading}>Loading dashboard...</Text></SafeAreaView>;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <Text style={styles.title}>Dashboard</Text>
        <View style={styles.statsGrid}>
          <StatCard label="Revenue (30d)" value={`₹${Number(data.revenueLast30Days).toFixed(0)}`} accent="#1B7A43" />
          <StatCard label="Total orders" value={data.totalOrders} />
          <StatCard label="In progress" value={data.pendingOrders} accent="#FF7A1A" />
          <StatCard label="Customers" value={data.totalCustomers} />
        </View>

        <Text style={styles.sectionLabel}>RECENT ORDERS</Text>
        <View style={styles.card}>
          {data.recentOrders.map((o) => (
            <View key={o.id} style={styles.rowBetween}>
              <Text style={styles.rowText}>{o.orderNumber} · {o.user?.name || o.user?.phone}</Text>
              <Text style={styles.rowValue}>₹{Number(o.total).toFixed(0)}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.sectionLabel}>LOW STOCK</Text>
        <View style={styles.card}>
          {data.lowStockProducts.length === 0 ? (
            <Text style={styles.emptyText}>Nothing low on stock.</Text>
          ) : (
            data.lowStockProducts.map((p) => (
              <View key={p.id} style={styles.rowBetween}>
                <Text style={styles.rowText}>{p.name}</Text>
                <Text style={[styles.rowValue, { color: "#E0630A" }]}>{p.stockQty} left</Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F7F8F3" },
  loading: { textAlign: "center", marginTop: 60, color: "#18241966" },
  title: { fontWeight: "800", fontSize: 20, color: "#182419", marginBottom: 12 },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 16 },
  statCard: { width: "47%", backgroundColor: "white", borderRadius: 16, borderWidth: 1, borderColor: "#18241915", padding: 12 },
  statLabel: { fontSize: 11, color: "#18241980" },
  statValue: { fontWeight: "800", fontSize: 20, marginTop: 4, color: "#182419" },
  sectionLabel: { fontWeight: "700", fontSize: 12, color: "#18241980", marginBottom: 6 },
  card: { backgroundColor: "white", borderRadius: 16, borderWidth: 1, borderColor: "#18241915", padding: 14, marginBottom: 16 },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 5 },
  rowText: { fontSize: 13, color: "#182419", flexShrink: 1 },
  rowValue: { fontSize: 13, fontWeight: "700" },
  emptyText: { color: "#18241966", fontSize: 13 },
});
