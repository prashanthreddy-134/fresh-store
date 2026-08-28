import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import NavBar from "../components/NavBar";
import { useAuth } from "../context/AuthContext";

export default function ProfileDetails() {
  const navigate = useNavigate();
  const { user, setUser } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  // ============================================================
  // LOAD PROFILE
  // ============================================================

  useEffect(() => {
    let mounted = true;

    async function loadProfile() {
      setLoading(true);
      setError("");

      try {
        const res = await api.get("/me");

        if (!mounted) return;

        setName(res.data?.name || "");
        setEmail(res.data?.email || "");
      } catch (err) {
        console.error(
          "Could not load profile:",
          err
        );

        if (!mounted) return;

        // Fall back to the locally stored authenticated user.
        setName(user?.name || "");
        setEmail(user?.email || "");

        setError(
          err.response?.data?.error ||
            "Could not load your profile."
        );
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadProfile();

    return () => {
      mounted = false;
    };
  }, [user?.name, user?.email]);

  // ============================================================
  // SAVE PROFILE
  // ============================================================

  async function saveProfile(e) {
    e.preventDefault();

    const trimmedName = name.trim();
    const trimmedEmail = email.trim();

    if (!trimmedName) {
      setError("Please enter your name.");
      return;
    }

    if (
      trimmedEmail &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        trimmedEmail
      )
    ) {
      setError("Please enter a valid email address.");
      return;
    }

    setSaving(true);
    setSaved(false);
    setError("");

    try {
      const res = await api.put("/me", {
        name: trimmedName,
        ...(trimmedEmail
          ? { email: trimmedEmail }
          : {}),
      });

      const updatedUser = res.data;

      // Update authentication state immediately.
      if (setUser) {
        setUser((currentUser) => ({
          ...currentUser,
          ...updatedUser,
        }));
      } else {
        // Fallback in case AuthContext doesn't expose setUser.
        const currentUser = JSON.parse(
          localStorage.getItem("fs_user") || "null"
        );

        localStorage.setItem(
          "fs_user",
          JSON.stringify({
            ...currentUser,
            ...updatedUser,
          })
        );
      }

      setName(updatedUser.name || "");
      setEmail(updatedUser.email || "");

      setSaved(true);

      setTimeout(() => {
        setSaved(false);
      }, 2000);
    } catch (err) {
      console.error(
        "Update profile failed:",
        err
      );

      setError(
        err.response?.data?.error ||
          "Could not save profile details."
      );
    } finally {
      setSaving(false);
    }
  }

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div className="min-h-screen bg-cream">
      <NavBar />

      <main className="max-w-2xl mx-auto px-4 py-6 pb-12">

        {/* Back to Profile */}
        <button
          type="button"
          onClick={() => navigate("/profile")}
          className="flex items-center gap-2 text-sm font-medium text-leaf hover:opacity-70 transition mb-6"
        >
          <span className="text-lg">←</span>
          Back to Profile
        </button>

        {/* Heading */}
        <h1 className="font-display font-800 text-2xl text-ink">
          Profile details
        </h1>

        <p className="text-sm text-ink/45 mt-1 mb-6">
          Manage your personal information
        </p>

        {/* Error */}
        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
            <p className="text-sm text-red-600">
              {error}
            </p>
          </div>
        )}

        {/* Profile form */}
        <form
          onSubmit={saveProfile}
          className="bg-white rounded-[24px] border border-ink/10 p-5 space-y-5"
        >

          {/* Phone */}
          <div>
            <label className="text-xs text-ink/50">
              Phone number
            </label>

            <div className="mt-1 bg-ink/5 rounded-xl px-3 py-3 text-sm font-medium">
              {user?.phone || "—"}
            </div>

            <p className="text-[11px] text-ink/35 mt-1">
              Your phone number is linked to your
              account.
            </p>
          </div>

          {/* Name */}
          <div>
            <label className="text-xs text-ink/50">
              Name
            </label>

            <input
              value={name}
              onChange={(e) =>
                setName(e.target.value)
              }
              disabled={loading || saving}
              className="w-full mt-1 border border-ink/15 rounded-xl px-3 py-3 text-sm outline-none focus:border-leaf disabled:bg-ink/5 disabled:cursor-not-allowed"
              placeholder="Enter your name"
            />
          </div>

          {/* Email */}
          <div>
            <label className="text-xs text-ink/50">
              Email
            </label>

            <input
              type="email"
              value={email}
              onChange={(e) =>
                setEmail(e.target.value)
              }
              disabled={loading || saving}
              className="w-full mt-1 border border-ink/15 rounded-xl px-3 py-3 text-sm outline-none focus:border-leaf disabled:bg-ink/5 disabled:cursor-not-allowed"
              placeholder="Enter your email"
            />
          </div>

          {/* Save */}
          <button
            type="submit"
            disabled={loading || saving}
            className="w-full bg-leaf text-cream rounded-xl py-3 font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving
              ? "Saving..."
              : saved
              ? "Saved ✓"
              : "Save changes"}
          </button>

        </form>
      </main>
    </div>
  );
}