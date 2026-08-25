import { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, FlatList } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const [addresses, setAddresses] = useState([]);

  useEffect(() => {
    api.get("/addresses").then((res) => setAddresses(res.data));
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Your profile</Text>
      <View style={styles.card}>
        <Text style={styles.label}>Phone number</Text>
        <Text style={styles.value}>{user?.phone}</Text>
      </View>

      <Text style={styles.sectionLabel}>SAVED ADDRESSES</Text>
      <FlatList
        data={addresses}
        keyExtractor={(a) => a.id}
        contentContainerStyle={{ paddingBottom: 20 }}
        renderItem={({ item }) => (
          <View style={styles.addressCard}>
            <Text style={styles.addressLabel}>{item.label}{item.isDefault ? " · Default" : ""}</Text>
            <Text style={styles.addressText}>{item.line1}, {item.city}, {item.state} - {item.pincode}</Text>
          </View>
        )}
      />

      <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
        <Text style={styles.logoutText}>Log out</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F7F8F3", padding: 16 },
  title: { fontWeight: "800", fontSize: 20, color: "#182419", marginBottom: 12 },
  card: { backgroundColor: "white", borderRadius: 16, borderWidth: 1, borderColor: "#18241915", padding: 14, marginBottom: 16 },
  label: { fontSize: 11, color: "#18241980" },
  value: { fontWeight: "600", marginTop: 2 },
  sectionLabel: { fontWeight: "700", fontSize: 12, color: "#18241980", marginBottom: 8 },
  addressCard: { backgroundColor: "white", borderRadius: 16, borderWidth: 1, borderColor: "#18241915", padding: 12, marginBottom: 8 },
  addressLabel: { fontWeight: "600", fontSize: 13 },
  addressText: { fontSize: 12, color: "#18241999", marginTop: 2 },
  logoutBtn: { borderWidth: 1, borderColor: "#18241926", borderRadius: 16, paddingVertical: 14, alignItems: "center", marginTop: "auto" },
  logoutText: { color: "#18241999", fontWeight: "700" },
});
