import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import NavBar from "../components/NavBar";
import { useAuth } from "../context/AuthContext";

export default function ProfileDetails() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setName(user?.name || "");
  }, [user]);

  async function saveProfile(e) {
    e.preventDefault();

    try {
      await api.put("/me", {
        name,
        ...(email && { email }),
      });

      setSaved(true);

      setTimeout(() => {
        setSaved(false);
      }, 2000);
    } catch (err) {
      alert(
        err.response?.data?.error ||
          "Could not save profile details."
      );
    }
  }

  return (
    <div className="min-h-screen bg-cream">
      <NavBar />

      <main className="max-w-2xl mx-auto px-4 py-6 pb-12">

        {/* Back to Profile */}
        <button
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
          </div>

          {/* Name */}
          <div>
            <label className="text-xs text-ink/50">
              Name
            </label>

            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full mt-1 border border-ink/15 rounded-xl px-3 py-3 text-sm outline-none focus:border-leaf"
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
              onChange={(e) => setEmail(e.target.value)}
              className="w-full mt-1 border border-ink/15 rounded-xl px-3 py-3 text-sm outline-none focus:border-leaf"
              placeholder="Enter your email"
            />
          </div>

          {/* Save */}
          <button
            type="submit"
            className="w-full bg-leaf text-cream rounded-xl py-3 font-semibold text-sm"
          >
            {saved ? "Saved ✓" : "Save changes"}
          </button>

        </form>
      </main>
    </div>
  );
}