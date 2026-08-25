import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import NavBar from "../components/NavBar";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";

function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";

    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);

    document.body.appendChild(script);
  });
}

export default function Checkout() {
  const { items, subtotal, refresh } = useCart();
  const { user } = useAuth();

  const [addresses, setAddresses] = useState([]);
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [showNewAddress, setShowNewAddress] = useState(false);

  const [newAddress, setNewAddress] = useState({
    label: "Home",
    line1: "",
    city: "",
    state: "",
    pincode: "",
  });

  const [couponCode, setCouponCode] = useState("");
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState("");

  const navigate = useNavigate();

  useEffect(() => {
    api
      .get("/addresses")
      .then((res) => {
        setAddresses(res.data);

        const def =
          res.data.find((a) => a.isDefault) ||
          res.data[0];

        if (def) {
          setSelectedAddress(def.id);
        }
      })
      .catch(() => {
        setError("Could not load your saved addresses.");
      });
  }, []);

  async function saveAddress(e) {
    e.preventDefault();
    setError("");

    try {
      const res = await api.post("/addresses", newAddress);

      setAddresses((prev) => [res.data, ...prev]);
      setSelectedAddress(res.data.id);
      setShowNewAddress(false);

      setNewAddress({
        label: "Home",
        line1: "",
        city: "",
        state: "",
        pincode: "",
      });
    } catch (err) {
      setError(
        err.response?.data?.error ||
          "Could not save address"
      );
    }
  }

  async function placeOrder() {
    setError("");

    if (!selectedAddress) {
      setError("Please select a delivery address");
      return;
    }

    setPlacing(true);

    try {
      const res = await api.post("/orders/checkout", {
        addressId: selectedAddress,
        couponCode: couponCode || undefined,
      });

      const { order, devPayment, razorpay } = res.data;

      // --------------------------------------------------
      // DEVELOPMENT PAYMENT
      // --------------------------------------------------
      // When NODE_ENV=development, the backend returns
      // devPayment=true instead of creating a Razorpay order.
      if (devPayment === true) {
        try {
          await api.post("/payments/dev-confirm", {
            orderId: order.id,
          });

          await refresh();

          navigate(`/orders/${order.id}`);
          return;
        } catch (err) {
          setError(
            err.response?.data?.error ||
              "Could not confirm development payment."
          );
          setPlacing(false);
          return;
        }
      }

      // --------------------------------------------------
      // REAL RAZORPAY PAYMENT
      // --------------------------------------------------

      if (!razorpay) {
        setError(
          "Payment gateway is not configured. Please try again later."
        );
        setPlacing(false);
        return;
      }

      const loaded = await loadRazorpayScript();

      if (!loaded) {
        setError(
          "Could not load payment gateway. Check your connection and try again."
        );
        setPlacing(false);
        return;
      }

      const rzp = new window.Razorpay({
        key: razorpay.keyId,
        amount: razorpay.amount,
        currency: razorpay.currency,
        order_id: razorpay.orderId,

        name: "Fresh Store",

        description: `Order ${order.orderNumber}`,

        prefill: {
          contact: user?.phone,
          name: user?.name,
        },

        theme: {
          color: "#1B7A43",
        },

        handler: async (response) => {
          try {
            await api.post("/payments/verify", {
              razorpayOrderId:
                response.razorpay_order_id,

              razorpayPaymentId:
                response.razorpay_payment_id,

              razorpaySignature:
                response.razorpay_signature,
            });

            await refresh();

            navigate(`/orders/${order.id}`);
          } catch {
            setError(
              "Payment succeeded but verification failed. Contact support with your order number."
            );

            setPlacing(false);
          }
        },

        modal: {
          ondismiss: () => {
            setPlacing(false);
          },
        },
      });

      rzp.open();
    } catch (err) {
      setError(
        err.response?.data?.error ||
          "Could not place order"
      );

      setPlacing(false);
    }
  }

  // --------------------------------------------------
  // EMPTY CART
  // --------------------------------------------------

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-cream">
        <NavBar />

        <div className="text-center py-16 text-ink/40">
          Your cart is empty.
        </div>
      </div>
    );
  }

  // --------------------------------------------------
  // CHECKOUT UI
  // --------------------------------------------------

  return (
    <div className="min-h-screen bg-cream">
      <NavBar />

      <div className="max-w-2xl mx-auto px-4 py-6">
        <h1 className="font-display font-800 text-xl mb-4">
          Checkout
        </h1>

        {/* ADDRESS */}

        <h2 className="font-semibold text-sm text-ink/60 mb-2">
          DELIVER TO
        </h2>

        <div className="space-y-2 mb-4">
          {addresses.map((a) => (
            <label
              key={a.id}
              className={`block bg-white rounded-xl2 border p-3 cursor-pointer ${
                selectedAddress === a.id
                  ? "border-leaf"
                  : "border-ink/10"
              }`}
            >
              <input
                type="radio"
                name="addr"
                className="mr-2"
                checked={selectedAddress === a.id}
                onChange={() =>
                  setSelectedAddress(a.id)
                }
              />

              <span className="font-medium text-sm">
                {a.label}
              </span>

              <p className="text-xs text-ink/60 ml-5">
                {a.line1}, {a.city}, {a.state} -{" "}
                {a.pincode}
              </p>
            </label>
          ))}
        </div>

        {/* NEW ADDRESS */}

        {showNewAddress ? (
          <form
            onSubmit={saveAddress}
            className="bg-white rounded-xl2 border border-ink/10 p-4 space-y-2 mb-4"
          >
            <input
              required
              placeholder="Label (Home/Work)"
              value={newAddress.label}
              onChange={(e) =>
                setNewAddress({
                  ...newAddress,
                  label: e.target.value,
                })
              }
              className="w-full border border-ink/15 rounded-lg px-3 py-2 text-sm"
            />

            <input
              required
              placeholder="Address line"
              value={newAddress.line1}
              onChange={(e) =>
                setNewAddress({
                  ...newAddress,
                  line1: e.target.value,
                })
              }
              className="w-full border border-ink/15 rounded-lg px-3 py-2 text-sm"
            />

            <div className="grid grid-cols-3 gap-2">
              <input
                required
                placeholder="City"
                value={newAddress.city}
                onChange={(e) =>
                  setNewAddress({
                    ...newAddress,
                    city: e.target.value,
                  })
                }
                className="border border-ink/15 rounded-lg px-3 py-2 text-sm"
              />

              <input
                required
                placeholder="State"
                value={newAddress.state}
                onChange={(e) =>
                  setNewAddress({
                    ...newAddress,
                    state: e.target.value,
                  })
                }
                className="border border-ink/15 rounded-lg px-3 py-2 text-sm"
              />

              <input
                required
                placeholder="Pincode"
                value={newAddress.pincode}
                onChange={(e) =>
                  setNewAddress({
                    ...newAddress,
                    pincode: e.target.value,
                  })
                }
                className="border border-ink/15 rounded-lg px-3 py-2 text-sm"
              />
            </div>

            <button
              type="submit"
              className="text-sm font-semibold text-leaf"
            >
              Save address
            </button>
          </form>
        ) : (
          <button
            onClick={() => setShowNewAddress(true)}
            className="text-sm font-semibold text-leaf mb-6"
          >
            + Add new address
          </button>
        )}

        {/* COUPON */}

        <h2 className="font-semibold text-sm text-ink/60 mb-2 mt-4">
          COUPON
        </h2>

        <input
          placeholder="Enter coupon code (e.g. FRESH50)"
          value={couponCode}
          onChange={(e) =>
            setCouponCode(e.target.value)
          }
          className="w-full border border-ink/15 rounded-lg px-3 py-2 text-sm mb-6 bg-white"
        />

        {/* SUMMARY */}

        <div className="bg-white rounded-xl2 border border-ink/10 p-4 mb-4">
          <div className="flex justify-between text-sm mb-1">
            <span className="text-ink/60">
              Subtotal
            </span>

            <span>
              ₹{subtotal.toFixed(2)}
            </span>
          </div>

          <p className="text-xs text-ink/40">
            Final total with delivery fee & discount
            will be calculated when placing the order.
          </p>
        </div>

        {/* ERROR */}

        {error && (
          <p className="text-sm text-red-600 mb-3">
            {error}
          </p>
        )}

        {/* PLACE ORDER */}

        <button
          onClick={placeOrder}
          disabled={placing}
          className="w-full bg-mango text-white rounded-xl py-3 font-semibold disabled:opacity-60"
        >
          {placing
            ? "Processing..."
            : "Pay & place order"}
        </button>

        <p className="text-[11px] text-ink/40 text-center mt-2">
          {import.meta.env.MODE === "development"
            ? "Development mode · No real payment will be charged"
            : "Secured by Razorpay · UPI, Cards, Netbanking & more"}
        </p>
      </div>
    </div>
  );
}