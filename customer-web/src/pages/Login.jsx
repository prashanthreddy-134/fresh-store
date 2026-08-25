import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const [mode, setMode] = useState("login");

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  // ----------------------------------------
  // Login
  // ----------------------------------------

  async function handleLogin(e) {
    e.preventDefault();

    setError("");

    const cleanPhone = phone.trim();

    if (!/^\+?[1-9]\d{9,14}$/.test(cleanPhone)) {
      setError("Enter a valid phone number.");
      return;
    }

    setLoading(true);

    try {
      const res = await api.post("/auth/dev-login", {
        phone: cleanPhone,
      });

      login(res.data.token, res.data.user);

      navigate("/");
    } catch (err) {
      setError(
        err.response?.data?.error ||
          "Could not log in"
      );
    } finally {
      setLoading(false);
    }
  }

  // ----------------------------------------
  // Register
  // ----------------------------------------

  async function handleRegister(e) {
    e.preventDefault();

    setError("");

    const cleanName = name.trim();
    const cleanPhone = phone.trim();

    if (cleanName.length < 2) {
      setError("Enter your full name.");
      return;
    }

    if (!/^\+?[1-9]\d{9,14}$/.test(cleanPhone)) {
      setError("Enter a valid phone number.");
      return;
    }

    setLoading(true);

    try {
      const res = await api.post("/auth/register", {
        name: cleanName,
        phone: cleanPhone,
      });

      login(res.data.token, res.data.user);

      navigate("/");
    } catch (err) {
      setError(
        err.response?.data?.error ||
          "Could not create account"
      );
    } finally {
      setLoading(false);
    }
  }

  // ----------------------------------------
  // Switch Login/Register
  // ----------------------------------------

  function switchMode(newMode) {
    setMode(newMode);
    setError("");
  }

  return (
    <div className="min-h-screen grid place-items-center bg-cream px-4">
      <div className="w-full max-w-sm bg-white rounded-xl2 border border-ink/10 p-6">

        {/* Logo */}

        <div className="w-10 h-10 rounded-xl2 bg-leaf grid place-items-center mb-4">
          <span className="text-cream font-display font-800">
            F
          </span>
        </div>

        {/* Heading */}

        <h1 className="font-display font-800 text-xl mb-1">
          {mode === "login"
            ? "Log in to Fresh Store"
            : "Create your Fresh Store account"}
        </h1>

        <p className="text-sm text-ink/60 mb-5">
          {mode === "login"
            ? "Development login — no OTP required."
            : "Create your customer account to start shopping."}
        </p>

        {/* Login Form */}

        {mode === "login" && (
          <form
            onSubmit={handleLogin}
            className="space-y-3"
          >
            <input
              type="tel"
              placeholder="+91 98xxxxxxxx"
              value={phone}
              onChange={(e) =>
                setPhone(e.target.value)
              }
              className="w-full rounded-xl border border-ink/15 px-4 py-3 text-sm"
            />

            {error && (
              <p className="text-sm text-red-600">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-leaf text-cream rounded-xl py-3 font-semibold disabled:opacity-60"
            >
              {loading
                ? "Logging in..."
                : "Continue"}
            </button>
          </form>
        )}

        {/* Register Form */}

        {mode === "register" && (
          <form
            onSubmit={handleRegister}
            className="space-y-3"
          >
            <input
              type="text"
              placeholder="Full name"
              value={name}
              onChange={(e) =>
                setName(e.target.value)
              }
              className="w-full rounded-xl border border-ink/15 px-4 py-3 text-sm"
            />

            <input
              type="tel"
              placeholder="+91 98xxxxxxxx"
              value={phone}
              onChange={(e) =>
                setPhone(e.target.value)
              }
              className="w-full rounded-xl border border-ink/15 px-4 py-3 text-sm"
            />

            {error && (
              <p className="text-sm text-red-600">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-leaf text-cream rounded-xl py-3 font-semibold disabled:opacity-60"
            >
              {loading
                ? "Creating account..."
                : "Create account"}
            </button>
          </form>
        )}

        {/* Switch */}

        <div className="text-center mt-5 pt-4 border-t border-ink/10">
          {mode === "login" ? (
            <p className="text-sm text-ink/60">
              New to Fresh Store?{" "}
              <button
                type="button"
                onClick={() =>
                  switchMode("register")
                }
                className="text-leaf font-semibold"
              >
                Create an account
              </button>
            </p>
          ) : (
            <p className="text-sm text-ink/60">
              Already have an account?{" "}
              <button
                type="button"
                onClick={() =>
                  switchMode("login")
                }
                className="text-leaf font-semibold"
              >
                Log in
              </button>
            </p>
          )}
        </div>

      </div>
    </div>
  );
}