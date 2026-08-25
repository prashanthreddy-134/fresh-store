import { useEffect, useState } from "react";
import { View, Text, TextInput, TouchableOpacity, ScrollView, Image, StyleSheet, ActivityIndicator, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { api } from "../api/client";

// Doubles as both "Add product" and "Edit product" — pass route.params.product
// to edit an existing one, or nothing to create a new one.
export default function AddProductScreen({ navigation, route }) {
  const editingProduct = route?.params?.product || null;

  const [categories, setCategories] = useState([]);
  const [categoryId, setCategoryId] = useState(editingProduct?.categoryId || "");
  const [name, setName] = useState(editingProduct?.name || "");
  const [unit, setUnit] = useState(editingProduct?.unit || "");
  const [mrp, setMrp] = useState(editingProduct ? String(editingProduct.mrp) : "");
  const [sellingPrice, setSellingPrice] = useState(editingProduct ? String(editingProduct.sellingPrice) : "");
  const [stockQty, setStockQty] = useState(editingProduct ? String(editingProduct.stockQty) : "");
  const [imageUri, setImageUri] = useState(null);
  const [imageUrl, setImageUrl] = useState(editingProduct?.imageUrl || "");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    api.get("/categories").then((res) => {
      setCategories(res.data);
      if (!editingProduct && res.data[0]) setCategoryId(res.data[0].id);
    });
  }, []);

  async function pickImage() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return Alert.alert("Permission needed", "Allow photo access to add a product image.");

    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.7 });
    if (result.canceled) return;

    const asset = result.assets[0];
    setImageUri(asset.uri);
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("image", { uri: asset.uri, name: "product.jpg", type: "image/jpeg" });
      const res = await api.post("/upload", formData, { headers: { "Content-Type": "multipart/form-data" } });
      setImageUrl(res.data.url);
    } catch (err) {
      Alert.alert("Upload failed", err.response?.data?.error || "Could not upload image");
    } finally {
      setUploading(false);
    }
  }

  async function saveProduct() {
    if (!name || !unit || !mrp || !sellingPrice || !categoryId) {
      return Alert.alert("Missing info", "Please fill in name, unit, prices, and category.");
    }
    setSaving(true);
    try {
      const payload = {
        name, unit, categoryId,
        mrp: Number(mrp),
        sellingPrice: Number(sellingPrice),
        stockQty: Number(stockQty) || 0,
        ...(imageUrl && { imageUrl }),
      };
      if (editingProduct) {
        await api.put(`/products/${editingProduct.id}`, payload);
        Alert.alert("Saved", "Product updated.", [{ text: "OK", onPress: () => navigation.goBack() }]);
      } else {
        await api.post("/products", payload);
        Alert.alert("Saved", "Product added.", [{ text: "OK", onPress: () => navigation.goBack() }]);
      }
    } catch (err) {
      Alert.alert("Error", err.response?.data?.error || "Could not save product");
    } finally {
      setSaving(false);
    }
  }

  function confirmDelete() {
    Alert.alert("Remove product?", `"${editingProduct.name}" will be hidden from customers immediately.`, [
      { text: "Cancel", style: "cancel" },
      { text: "Remove", style: "destructive", onPress: deleteProduct },
    ]);
  }

  async function deleteProduct() {
    setDeleting(true);
    try {
      await api.delete(`/products/${editingProduct.id}`);
      navigation.goBack();
    } catch (err) {
      Alert.alert("Error", err.response?.data?.error || "Could not remove product");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <Text style={styles.title}>{editingProduct ? "Edit product" : "Add product"}</Text>

        <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
          {imageUri || imageUrl ? (
            <Image source={{ uri: imageUri || imageUrl }} style={styles.imagePreview} />
          ) : (
            <Text style={styles.imagePickerText}>{uploading ? "Uploading..." : "+ Add photo"}</Text>
          )}
          {uploading && <ActivityIndicator style={StyleSheet.absoluteFill} color="#1B7A43" />}
        </TouchableOpacity>

        <TextInput style={styles.input} placeholder="Product name" value={name} onChangeText={setName} />
        <TextInput style={styles.input} placeholder="Unit (e.g. 1 kg)" value={unit} onChangeText={setUnit} />
        <View style={styles.row}>
          <TextInput style={[styles.input, styles.half]} placeholder="MRP" keyboardType="decimal-pad" value={mrp} onChangeText={setMrp} />
          <TextInput style={[styles.input, styles.half]} placeholder="Selling price" keyboardType="decimal-pad" value={sellingPrice} onChangeText={setSellingPrice} />
        </View>
        <TextInput style={styles.input} placeholder="Stock quantity" keyboardType="number-pad" value={stockQty} onChangeText={setStockQty} />

        <Text style={styles.label}>Category</Text>
        <View style={styles.categoryRow}>
          {categories.map((c) => (
            <TouchableOpacity key={c.id} onPress={() => setCategoryId(c.id)} style={[styles.catChip, categoryId === c.id && styles.catChipActive]}>
              <Text style={[styles.catChipText, categoryId === c.id && styles.catChipTextActive]}>{c.name}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.saveBtn} onPress={saveProduct} disabled={saving || uploading}>
          {saving ? <ActivityIndicator color="white" /> : <Text style={styles.saveBtnText}>{editingProduct ? "Save changes" : "Save product"}</Text>}
        </TouchableOpacity>

        {editingProduct && (
          <TouchableOpacity style={styles.deleteBtn} onPress={confirmDelete} disabled={deleting}>
            {deleting ? <ActivityIndicator color="#dc2626" /> : <Text style={styles.deleteBtnText}>Remove product</Text>}
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F7F8F3" },
  title: { fontWeight: "800", fontSize: 20, color: "#182419", marginBottom: 12 },
  imagePicker: { height: 140, borderRadius: 16, backgroundColor: "#E3F3E8", alignItems: "center", justifyContent: "center", marginBottom: 14, overflow: "hidden" },
  imagePreview: { width: "100%", height: "100%" },
  imagePickerText: { color: "#1B7A43", fontWeight: "700" },
  input: { backgroundColor: "white", borderWidth: 1, borderColor: "#18241926", borderRadius: 12, padding: 12, marginBottom: 10, fontSize: 14 },
  row: { flexDirection: "row", gap: 10 },
  half: { flex: 1 },
  label: { fontWeight: "700", fontSize: 12, color: "#18241980", marginBottom: 8, marginTop: 4 },
  categoryRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 20 },
  catChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: "#18241926", backgroundColor: "white" },
  catChipActive: { backgroundColor: "#1B7A43", borderColor: "#1B7A43" },
  catChipText: { fontSize: 12, color: "#18241999" },
  catChipTextActive: { color: "white", fontWeight: "700" },
  saveBtn: { backgroundColor: "#1B7A43", borderRadius: 16, paddingVertical: 14, alignItems: "center" },
  saveBtnText: { color: "white", fontWeight: "700" },
  deleteBtn: { borderWidth: 1, borderColor: "#FCA5A5", borderRadius: 16, paddingVertical: 14, alignItems: "center", marginTop: 10 },
  deleteBtnText: { color: "#dc2626", fontWeight: "700" },
});
