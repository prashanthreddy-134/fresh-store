import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import NavBar from "../components/NavBar";

const EMPTY_FORM = {
  label: "",
  line1: "",
  city: "",
  state: "",
  pincode: "",
};

export default function ProfileAddresses() {
  const navigate = useNavigate();

  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  async function loadAddresses() {
    try {
      const res = await api.get("/addresses");
      setAddresses(res.data);
    } catch (err) {
      console.error("Could not load addresses:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAddresses();
  }, []);

  function handleChange(e) {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  async function addAddress(e) {
    e.preventDefault();

    if (
      !form.label.trim() ||
      !form.line1.trim() ||
      !form.city.trim() ||
      !form.state.trim() ||
      !form.pincode.trim()
    ) {
      alert("Please fill all address details.");
      return;
    }

    if (!/^\d{6}$/.test(form.pincode.trim())) {
      alert("Please enter a valid 6-digit pincode.");
      return;
    }

    try {
      setSaving(true);

      await api.post("/addresses", {
        label: form.label.trim(),
        line1: form.line1.trim(),
        city: form.city.trim(),
        state: form.state.trim(),
        pincode: form.pincode.trim(),
      });

      setForm(EMPTY_FORM);
      setShowAddForm(false);

      await loadAddresses();
    } catch (err) {
      alert(
        err.response?.data?.error ||
          "Could not save the address."
      );
    } finally {
      setSaving(false);
    }
  }

  async function deleteAddress(id) {
    if (!window.confirm("Delete this address?")) return;

    try {
      await api.delete(`/addresses/${id}`);

      setAddresses((prev) =>
        prev.filter((address) => address.id !== id)
      );
    } catch (err) {
      alert(
        err.response?.data?.error ||
          "Could not delete address."
      );
    }
  }

  async function makeDefault(id) {
    try {
      await api.put(`/addresses/${id}`, {
        isDefault: true,
      });

      await loadAddresses();
    } catch (err) {
      alert(
        err.response?.data?.error ||
          "Could not update default address."
      );
    }
  }

  return (
    <div className="min-h-screen bg-cream">
      <NavBar />

      <main className="max-w-2xl mx-auto px-4 py-6 pb-12">

        {/* Back */}
        <button
          onClick={() => navigate("/profile")}
          className="text-sm font-medium text-leaf mb-6"
        >
          ← Back
        </button>

        {/* Heading */}
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="font-display font-800 text-2xl">
              Saved addresses
            </h1>

            <p className="text-sm text-ink/45 mt-1">
              Manage your delivery addresses
            </p>
          </div>

          {!showAddForm && (
            <button
              onClick={() => setShowAddForm(true)}
              className="shrink-0 bg-leaf text-cream rounded-full px-4 py-2.5 text-sm font-semibold hover:opacity-90 transition"
            >
              + Add new
            </button>
          )}
        </div>

        {/* Add new address */}
        {showAddForm && (
          <div className="bg-white rounded-[24px] border border-ink/10 p-5 mb-6">

            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="font-display font-800 text-lg">
                  Add new address
                </h2>

                <p className="text-xs text-ink/45 mt-1">
                  Enter your delivery details
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setShowAddForm(false);
                  setForm(EMPTY_FORM);
                }}
                className="w-9 h-9 rounded-full bg-ink/5 text-ink/50 hover:bg-ink/10"
              >
                ×
              </button>
            </div>

            <form
              onSubmit={addAddress}
              className="space-y-4"
            >

              {/* Address label */}
              <div>
                <label className="text-xs text-ink/50">
                  Address type
                </label>

                <input
                  name="label"
                  value={form.label}
                  onChange={handleChange}
                  placeholder="Home, Work, etc."
                  className="w-full mt-1 border border-ink/15 rounded-xl px-3 py-3 text-sm outline-none focus:border-leaf"
                />
              </div>

              {/* Address */}
              <div>
                <label className="text-xs text-ink/50">
                  Address
                </label>

                <textarea
                  name="line1"
                  value={form.line1}
                  onChange={handleChange}
                  placeholder="House / flat / building / street"
                  rows="3"
                  className="w-full mt-1 border border-ink/15 rounded-xl px-3 py-3 text-sm outline-none focus:border-leaf resize-none"
                />
              </div>

              {/* City + State */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                <div>
                  <label className="text-xs text-ink/50">
                    City
                  </label>

                  <input
                    name="city"
                    value={form.city}
                    onChange={handleChange}
                    placeholder="City"
                    className="w-full mt-1 border border-ink/15 rounded-xl px-3 py-3 text-sm outline-none focus:border-leaf"
                  />
                </div>

                <div>
                  <label className="text-xs text-ink/50">
                    State
                  </label>

                  <input
                    name="state"
                    value={form.state}
                    onChange={handleChange}
                    placeholder="State"
                    className="w-full mt-1 border border-ink/15 rounded-xl px-3 py-3 text-sm outline-none focus:border-leaf"
                  />
                </div>

              </div>

              {/* Pincode */}
              <div>
                <label className="text-xs text-ink/50">
                  Pincode
                </label>

                <input
                  name="pincode"
                  value={form.pincode}
                  onChange={handleChange}
                  placeholder="6-digit pincode"
                  maxLength="6"
                  inputMode="numeric"
                  className="w-full mt-1 border border-ink/15 rounded-xl px-3 py-3 text-sm outline-none focus:border-leaf"
                />
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-2">

                <button
                  type="button"
                  onClick={() => {
                    setShowAddForm(false);
                    setForm(EMPTY_FORM);
                  }}
                  className="flex-1 border border-ink/15 rounded-xl py-3 text-sm font-semibold"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-leaf text-cream rounded-xl py-3 text-sm font-semibold disabled:opacity-60"
                >
                  {saving ? "Saving..." : "Save address"}
                </button>

              </div>

            </form>
          </div>
        )}

        {/* Existing addresses */}
        {loading ? (
          <div className="text-center py-16 text-ink/40">
            Loading addresses...
          </div>
        ) : addresses.length === 0 ? (
          <div className="bg-white rounded-[24px] border border-ink/10 p-8 text-center">

            <div className="text-5xl mb-4">
              📍
            </div>

            <h2 className="font-display font-800 text-lg">
              No saved addresses
            </h2>

            <p className="text-sm text-ink/45 mt-2 mb-5">
              Add your first delivery address to make checkout faster.
            </p>

            {!showAddForm && (
              <button
                onClick={() => setShowAddForm(true)}
                className="bg-leaf text-cream rounded-full px-5 py-2.5 text-sm font-semibold"
              >
                + Add new address
              </button>
            )}

          </div>
        ) : (
          <div className="space-y-4">

            {addresses.map((address) => (
              <div
                key={address.id}
                className="bg-white rounded-[24px] border border-ink/10 p-5"
              >

                <div className="flex justify-between gap-4">

                  <div className="min-w-0">

                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm">
                        {address.label}
                      </span>

                      {address.isDefault && (
                        <span className="text-[11px] bg-leaf-light text-leaf px-2 py-1 rounded-full">
                          Default
                        </span>
                      )}
                    </div>

                    <p className="text-sm text-ink/55 mt-2 leading-6">
                      {address.line1},{" "}
                      {address.city},{" "}
                      {address.state} -{" "}
                      {address.pincode}
                    </p>

                  </div>

                  <div className="w-11 h-11 rounded-2xl bg-leaf-light grid place-items-center text-xl shrink-0">
                    📍
                  </div>

                </div>

                <div className="flex gap-4 mt-4 pt-4 border-t border-ink/5">

                  {!address.isDefault && (
                    <button
                      onClick={() =>
                        makeDefault(address.id)
                      }
                      className="text-xs font-semibold text-leaf"
                    >
                      Set as default
                    </button>
                  )}

                  <button
                    onClick={() =>
                      deleteAddress(address.id)
                    }
                    className="text-xs font-semibold text-red-500"
                  >
                    Delete
                  </button>

                </div>

              </div>
            ))}

          </div>
        )}

      </main>
    </div>
  );
}