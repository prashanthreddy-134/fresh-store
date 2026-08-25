import { useEffect, useState } from "react";
import { api } from "../api/client";
import NavBar from "../components/NavBar";
import { useAuth } from "../context/AuthContext";

export default function Profile() {
  const { user } = useAuth();
  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState("");
  const [addresses, setAddresses] = useState([]);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api.get("/addresses").then((res) => setAddresses(res.data));
  }, []);

  async function saveProfile(e) {
    e.preventDefault();
    await api.put("/me", { name, ...(email && { email }) });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function deleteAddress(id) {
    await api.delete(`/addresses/${id}`);
    setAddresses((prev) => prev.filter((a) => a.id !== id));
  }

  async function makeDefault(id) {
    await api.put(`/addresses/${id}`, { isDefault: true });
    const res = await api.get("/addresses");
    setAddresses(res.data);
  }

  return (
    <div className="min-h-screen bg-cream">
      <NavBar />
      <div className="max-w-xl mx-auto px-4 py-6">
        <h1 className="font-display font-800 text-xl mb-4">Your profile</h1>

        <form onSubmit={saveProfile} className="bg-white rounded-xl2 border border-ink/10 p-4 space-y-3 mb-6">
          <div>
            <label className="text-xs text-ink/50">Phone number</label>
            <div className="text-sm font-medium">{user?.phone}</div>
          </div>
          <div>
            <label className="text-xs text-ink/50">Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className="w-full border border-ink/15 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-xs text-ink/50">Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full border border-ink/15 rounded-lg px-3 py-2 text-sm" />
          </div>
          <button className="text-sm font-semibold text-leaf">{saved ? "Saved ✓" : "Save changes"}</button>
        </form>

        <h2 className="font-semibold text-sm text-ink/60 mb-2">SAVED ADDRESSES</h2>
        <div className="space-y-2">
          {addresses.map((a) => (
            <div key={a.id} className="bg-white rounded-xl2 border border-ink/10 p-3">
              <div className="flex justify-between items-start">
                <div>
                  <span className="font-medium text-sm">{a.label}</span>
                  {a.isDefault && <span className="ml-2 text-[11px] bg-leaf-light text-leaf px-2 py-0.5 rounded-full">Default</span>}
                  <p className="text-xs text-ink/60 mt-0.5">{a.line1}, {a.city}, {a.state} - {a.pincode}</p>
                </div>
                <div className="flex flex-col items-end gap-1 text-xs shrink-0">
                  {!a.isDefault && <button onClick={() => makeDefault(a.id)} className="text-leaf font-medium">Set default</button>}
                  <button onClick={() => deleteAddress(a.id)} className="text-red-500">Delete</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
