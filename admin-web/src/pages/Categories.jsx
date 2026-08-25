import { useEffect, useState } from "react";
import { api } from "../api/client";
import Layout from "../components/Layout";

export default function Categories() {
  const [categories, setCategories] = useState([]);
  const [name, setName] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  function load() {
    api.get("/categories").then((res) => setCategories(res.data));
  }
  useEffect(load, []);

  async function handleImageFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("image", file);
      const res = await api.post("/upload", formData, { headers: { "Content-Type": "multipart/form-data" } });
      setImageUrl(res.data.url);
    } catch (err) {
      setError(err.response?.data?.error || "Image upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function addCategory(e) {
    e.preventDefault();
    setError("");
    try {
      await api.post("/categories", { name, imageUrl: imageUrl || undefined });
      setName("");
      setImageUrl("");
      load();
    } catch (err) {
      setError(err.response?.data?.error || "Could not add category");
    }
  }

  async function toggleActive(c) {
    await api.put(`/categories/${c.id}`, { isActive: !c.isActive });
    load();
  }

  async function move(c, direction) {
    await api.put(`/categories/${c.id}`, { sortOrder: c.sortOrder + direction });
    load();
  }

  return (
    <Layout>
      <h1 className="font-display font-800 text-xl mb-5">Categories</h1>

      <form onSubmit={addCategory} className="bg-white rounded-xl2 border border-ink/10 p-4 mb-5 flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[180px]">
          <label className="text-xs text-ink/50 block mb-1">Category name</label>
          <input required value={name} onChange={(e) => setName(e.target.value)} className="w-full border border-ink/15 rounded-lg px-3 py-2 text-sm" />
        </div>
        <label className="text-xs font-medium text-leaf border border-leaf rounded-lg px-3 py-2 cursor-pointer">
          {uploading ? "Uploading..." : "Upload image"}
          <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleImageFile} className="hidden" disabled={uploading} />
        </label>
        {imageUrl && <img src={imageUrl} alt="Preview" className="w-10 h-10 object-cover rounded-lg" />}
        <button className="bg-leaf text-cream text-sm font-semibold px-4 py-2 rounded-full">Add category</button>
        {error && <p className="text-sm text-red-600 w-full">{error}</p>}
      </form>

      <div className="bg-white rounded-xl2 border border-ink/10 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-ink/5 text-left text-ink/50">
            <tr>
              <th className="px-4 py-2">Order</th>
              <th className="px-4 py-2">Category</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {categories.map((c) => (
              <tr key={c.id} className="border-t border-ink/5">
                <td className="px-4 py-2">
                  <div className="flex gap-1">
                    <button onClick={() => move(c, -1)} className="text-ink/40">↑</button>
                    <button onClick={() => move(c, 1)} className="text-ink/40">↓</button>
                  </div>
                </td>
                <td className="px-4 py-2 font-medium flex items-center gap-2">
                  {c.imageUrl && <img src={c.imageUrl} className="w-8 h-8 rounded-lg object-cover" />}
                  {c.name}
                </td>
                <td className="px-4 py-2">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${c.isActive ? "bg-leaf-light text-leaf" : "bg-red-100 text-red-600"}`}>
                    {c.isActive ? "Active" : "Hidden"}
                  </span>
                </td>
                <td className="px-4 py-2 text-right">
                  <button onClick={() => toggleActive(c)} className="text-xs font-medium text-ink/60">
                    {c.isActive ? "Hide" : "Show"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Layout>
  );
}
