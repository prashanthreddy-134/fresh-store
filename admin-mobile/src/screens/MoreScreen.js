import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../context/AuthContext";

export default function MoreScreen() {
  const { user, logout } = useAuth();

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Account</Text>
      <View style={styles.card}>
        <Text style={styles.label}>Signed in as</Text>
        <Text style={styles.value}>{user?.name || user?.phone}</Text>
        <Text style={styles.role}>{user?.role}</Text>
      </View>
      <Text style={styles.note}>
        Customer management, coupons, and full sales reports are available on the admin website for a bigger-screen view.
      </Text>
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
  value: { fontWeight: "700", fontSize: 15, marginTop: 2 },
  role: { fontSize: 11, color: "#1B7A43", marginTop: 4, fontWeight: "700" },
  note: { fontSize: 12, color: "#18241980", lineHeight: 18, marginBottom: 20 },
  logoutBtn: { borderWidth: 1, borderColor: "#18241926", borderRadius: 16, paddingVertical: 14, alignItems: "center" },
  logoutText: { color: "#18241999", fontWeight: "700" },
});
