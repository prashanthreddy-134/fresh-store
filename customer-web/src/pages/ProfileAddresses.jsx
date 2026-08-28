import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import NavBar from "../components/NavBar";

const EMPTY_FORM = {
  label: "",
  line1: "",
  line2: "",
  landmark: "",
  city: "",
  state: "",
  pincode: "",
};

export default function ProfileAddresses() {
  const navigate = useNavigate();

  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");

  // ============================================================
  // LOAD ADDRESSES
  // ============================================================

  async function loadAddresses() {
    try {
      setError("");

      const res = await api.get("/addresses");

      setAddresses(res.data || []);
    } catch (err) {
      console.error(
        "Could not load addresses:",
        err
      );

      setError(
        err.response?.data?.error ||
          "Could not load your addresses."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAddresses();
  }, []);

  // ============================================================
  // FORM
  // ============================================================

  function handleChange(e) {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  function openAddForm() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setError("");
    setShowForm(true);
  }

  function openEditForm(address) {
    setEditingId(address.id);

    setForm({
      label: address.label || "",
      line1: address.line1 || "",
      line2: address.line2 || "",
      landmark: address.landmark || "",
      city: address.city || "",
      state: address.state || "",
      pincode: address.pincode || "",
    });

    setError("");
    setShowForm(true);
  }

  function closeForm() {
    if (saving) return;

    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
    setError("");
  }

  // ============================================================
  // VALIDATE
  // ============================================================

  function validateForm() {
    if (!form.label.trim()) {
      return "Please enter an address label.";
    }

    if (!form.line1.trim()) {
      return "Please enter your address.";
    }

    if (!form.city.trim()) {
      return "Please enter your city.";
    }

    if (!form.state.trim()) {
      return "Please enter your state.";
    }

    if (!/^\d{6}$/.test(form.pincode.trim())) {
      return "Please enter a valid 6-digit pincode.";
    }

    return "";
  }

  // ============================================================
  // ADD / EDIT ADDRESS
  // ============================================================

  async function saveAddress(e) {
    e.preventDefault();

    const validationError = validateForm();

    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);
    setError("");

    const payload = {
      label: form.label.trim(),
      line1: form.line1.trim(),
      line2: form.line2.trim(),
      landmark: form.landmark.trim(),
      city: form.city.trim(),
      state: form.state.trim(),
      pincode: form.pincode.trim(),
    };

    try {
      if (editingId) {
        await api.put(
          `/addresses/${editingId}`,
          payload
        );
      } else {
        await api.post(
          "/addresses",
          payload
        );
      }

      setForm(EMPTY_FORM);
      setEditingId(null);
      setShowForm(false);

      await loadAddresses();
    } catch (err) {
      console.error(
        "Save address failed:",
        err
      );

      setError(
        err.response?.data?.error ||
          "Could not save the address."
      );
    } finally {
      setSaving(false);
    }
  }

  // ============================================================
  // DELETE ADDRESS
  // ============================================================

  async function deleteAddress(id) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this address?"
    );

    if (!confirmed) return;

    try {
      setError("");

      await api.delete(
        `/addresses/${id}`
      );

      setAddresses((prev) =>
        prev.filter(
          (address) =>
            address.id !== id
        )
      );
    } catch (err) {
      console.error(
        "Delete address failed:",
        err
      );

      setError(
        err.response?.data?.error ||
          "Could not delete the address."
      );
    }
  }

  // ============================================================
  // MAKE DEFAULT
  // ============================================================

  async function makeDefault(id) {
    try {
      setError("");

      await api.put(
        `/addresses/${id}`,
        {
          isDefault: true,
        }
      );

      await loadAddresses();
    } catch (err) {
      console.error(
        "Set default address failed:",
        err
      );

      setError(
        err.response?.data?.error ||
          "Could not set the default address."
      );
    }
  }

  // ============================================================
  // LOADING
  // ============================================================

  if (loading) {
    return (
      <div className="min-h-screen bg-cream">
        <NavBar />

        <main className="max-w-2xl mx-auto px-4 py-6">
          <button
            type="button"
            onClick={() =>
              navigate("/profile")
            }
            className="text-sm font-medium text-leaf mb-6"
          >
            ← Back to Profile
          </button>

          <div className="text-center py-16 text-ink/40">
            Loading addresses...
          </div>
        </main>
      </div>
    );
  }

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div className="min-h-screen bg-cream">
      <NavBar />

      <main className="max-w-2xl mx-auto px-4 py-6 pb-12">

        {/* Back */}
        <button
          type="button"
          onClick={() =>
            navigate("/profile")
          }
          className="flex items-center gap-2 text-sm font-medium text-leaf hover:opacity-70 transition mb-6"
        >
          <span className="text-lg">
            ←
          </span>

          Back to Profile
        </button>

        {/* Heading */}
        <div className="flex items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="font-display font-800 text-2xl text-ink">
              Saved addresses
            </h1>

            <p className="text-sm text-ink/45 mt-1">
              Manage your delivery addresses
            </p>
          </div>

          {!showForm && (
            <button
              type="button"
              onClick={openAddForm}
              className="shrink-0 bg-leaf text-cream rounded-full px-4 py-2.5 text-sm font-semibold"
            >
              + Add
            </button>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
            <p className="text-sm text-red-600">
              {error}
            </p>
          </div>
        )}

        {/* ====================================================== */}
        {/* ADD / EDIT FORM */}
        {/* ====================================================== */}

        {showForm && (
          <form
            onSubmit={saveAddress}
            className="bg-white rounded-[24px] border border-ink/10 p-5 mb-6 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h2 className="font-display font-800 text-lg">
                {editingId
                  ? "Edit address"
                  : "Add new address"}
              </h2>

              <button
                type="button"
                onClick={closeForm}
                disabled={saving}
                className="text-ink/40 hover:text-ink text-xl"
              >
                ×
              </button>
            </div>

            {/* Label */}
            <div>
              <label className="text-xs text-ink/50">
                Address label
              </label>

              <input
                name="label"
                value={form.label}
                onChange={handleChange}
                disabled={saving}
                placeholder="Home, Work, etc."
                className="w-full mt-1 border border-ink/15 rounded-xl px-3 py-3 text-sm outline-none focus:border-leaf disabled:bg-ink/5"
              />
            </div>

            {/* Address */}
            <div>
              <label className="text-xs text-ink/50">
                Address line
              </label>

              <textarea
                name="line1"
                value={form.line1}
                onChange={handleChange}
                disabled={saving}
                rows={2}
                placeholder="House / Flat / Street"
                className="w-full mt-1 border border-ink/15 rounded-xl px-3 py-3 text-sm outline-none focus:border-leaf resize-none disabled:bg-ink/5"
              />
            </div>

            {/* Line 2 */}
            <div>
              <label className="text-xs text-ink/50">
                Address line 2
              </label>

              <input
                name="line2"
                value={form.line2}
                onChange={handleChange}
                disabled={saving}
                placeholder="Apartment, area, etc. (optional)"
                className="w-full mt-1 border border-ink/15 rounded-xl px-3 py-3 text-sm outline-none focus:border-leaf disabled:bg-ink/5"
              />
            </div>

            {/* Landmark */}
            <div>
              <label className="text-xs text-ink/50">
                Landmark
              </label>

              <input
                name="landmark"
                value={form.landmark}
                onChange={handleChange}
                disabled={saving}
                placeholder="Nearby landmark (optional)"
                className="w-full mt-1 border border-ink/15 rounded-xl px-3 py-3 text-sm outline-none focus:border-leaf disabled:bg-ink/5"
              />
            </div>

            {/* City + State */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

              <div>
                <label className="text-xs text-ink/50">
                  City
                </label>

                <input
                  name="city"
                  value={form.city}
                  onChange={handleChange}
                  disabled={saving}
                  placeholder="City"
                  className="w-full mt-1 border border-ink/15 rounded-xl px-3 py-3 text-sm outline-none focus:border-leaf disabled:bg-ink/5"
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
                  disabled={saving}
                  placeholder="State"
                  className="w-full mt-1 border border-ink/15 rounded-xl px-3 py-3 text-sm outline-none focus:border-leaf disabled:bg-ink/5"
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
                disabled={saving}
                inputMode="numeric"
                maxLength={6}
                placeholder="6-digit pincode"
                className="w-full mt-1 border border-ink/15 rounded-xl px-3 py-3 text-sm outline-none focus:border-leaf disabled:bg-ink/5"
              />
            </div>

            {/* Save */}
            <button
              type="submit"
              disabled={saving}
              className="w-full bg-leaf text-cream rounded-xl py-3 font-semibold text-sm disabled:opacity-50"
            >
              {saving
                ? "Saving..."
                : editingId
                ? "Save address"
                : "Add address"}
            </button>
          </form>
        )}

        {/* ====================================================== */}
        {/* EMPTY STATE */}
        {/* ====================================================== */}

        {addresses.length === 0 &&
        !showForm ? (
          <div className="bg-white rounded-[24px] border border-ink/10 p-8 text-center">

            <div className="w-16 h-16 mx-auto rounded-2xl bg-leaf-light grid place-items-center text-3xl mb-4">
              📍
            </div>

            <h2 className="font-display font-800 text-lg">
              No saved addresses
            </h2>

            <p className="text-sm text-ink/45 mt-2 mb-5">
              Add your first delivery address
              to make checkout faster.
            </p>

            <button
              type="button"
              onClick={openAddForm}
              className="bg-leaf text-cream rounded-full px-5 py-2.5 text-sm font-semibold"
            >
              + Add new address
            </button>

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

                    <p className="text-sm text-ink/60 mt-2 leading-6">
                      {address.line1}
                    </p>

                    {address.line2 && (
                      <p className="text-sm text-ink/60 leading-6">
                        {address.line2}
                      </p>
                    )}

                    {address.landmark && (
                      <p className="text-xs text-ink/45 mt-1">
                        Landmark:{" "}
                        {address.landmark}
                      </p>
                    )}

                    <p className="text-sm text-ink/60 leading-6">
                      {address.city},{" "}
                      {address.state} -{" "}
                      {address.pincode}
                    </p>

                  </div>

                  <div className="w-11 h-11 rounded-2xl bg-leaf-light grid place-items-center text-xl shrink-0">
                    📍
                  </div>

                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t border-ink/5">

                  {!address.isDefault && (
                    <button
                      type="button"
                      onClick={() =>
                        makeDefault(
                          address.id
                        )
                      }
                      className="text-xs font-semibold text-leaf"
                    >
                      Set as default
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() =>
                      openEditForm(address)
                    }
                    className="text-xs font-semibold text-ink/70"
                  >
                    Edit
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      deleteAddress(
                        address.id
                      )
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