import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { api } from "../api/client";
import NavBar from "../components/NavBar";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";

function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }

    const existing = document.querySelector(
      'script[src="https://checkout.razorpay.com/v1/checkout.js"]'
    );

    if (existing) {
      existing.addEventListener(
        "load",
        () => resolve(true),
        { once: true }
      );

      existing.addEventListener(
        "error",
        () => resolve(false),
        { once: true }
      );

      return;
    }

    const script = document.createElement("script");

    script.src =
      "https://checkout.razorpay.com/v1/checkout.js";

    script.async = true;

    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);

    document.body.appendChild(script);
  });
}

export default function Checkout() {
  const { items, subtotal, refresh } = useCart();
  const { user } = useAuth();

  const navigate = useNavigate();
  const location = useLocation();

  // ============================================================
  // STATE
  // ============================================================

  const [addresses, setAddresses] = useState([]);
  const [selectedAddress, setSelectedAddress] = useState(null);

  const [showNewAddress, setShowNewAddress] =
    useState(false);

  const [newAddress, setNewAddress] = useState({
    label: "Home",
    line1: "",
    city: "",
    state: "",
    pincode: "",
  });

  const [storeCashBalance, setStoreCashBalance] =
    useState(0);

  const [couponCode, setCouponCode] =
    useState("FRESH50");

  const [couponVerified, setCouponVerified] =
    useState(false);

  const [placing, setPlacing] = useState(false);

  const [loadingStoreCash, setLoadingStoreCash] =
    useState(true);

  const [error, setError] = useState("");

  // ============================================================
  // STORE CASH
  // ============================================================

  const routerStoreCash = Math.max(
    0,
    Number(location.state?.storeCashToUse || 0)
  );

  let savedStoreCash = 0;

  try {
    savedStoreCash = Math.max(
      0,
      Number(
        sessionStorage.getItem(
          "freshStoreCashToUse"
        ) || 0
      )
    );
  } catch {
    savedStoreCash = 0;
  }

  const requestedStoreCash =
    routerStoreCash > 0
      ? routerStoreCash
      : savedStoreCash;

  // ============================================================
  // COUPON DISPLAY CALCULATION
  // ============================================================
  //
  // FRESH50 is the coupon currently supported by this UI.
  // The backend remains the final authority.
  //

  const couponDiscount = couponVerified
    ? Math.min(50, Number(subtotal))
    : 0;

  // Store Cash cannot exceed:
  //
  // 1. requested amount
  // 2. actual account balance
  // 3. amount remaining after coupon
  //
  const maximumStoreCashAfterCoupon = Math.max(
    0,
    Number(subtotal) - couponDiscount
  );

  const storeCashToUse = Math.min(
    requestedStoreCash,
    Number(storeCashBalance),
    maximumStoreCashAfterCoupon
  );

  // ============================================================
  // FINAL PAYABLE
  // ============================================================
  //
  // NO DELIVERY FEE.
  //
  // subtotal
  // - coupon
  // - Store Cash
  // = final payable
  //

  const estimatedPayable = Math.max(
    0,
    Number(subtotal) -
      couponDiscount -
      storeCashToUse
  );

  // ============================================================
  // SAVE STORE CASH SELECTION
  // ============================================================

  useEffect(() => {
    if (routerStoreCash > 0) {
      try {
        sessionStorage.setItem(
          "freshStoreCashToUse",
          String(routerStoreCash)
        );
      } catch {
        // Ignore storage errors.
      }
    }
  }, [routerStoreCash]);

  // ============================================================
  // LOAD ADDRESSES
  // ============================================================

  useEffect(() => {
    let mounted = true;

    async function loadAddresses() {
      try {
        const res = await api.get("/addresses");

        if (!mounted) return;

        const list = Array.isArray(res.data)
          ? res.data
          : [];

        setAddresses(list);

        const defaultAddress =
          list.find((address) => address.isDefault) ||
          list[0];

        if (defaultAddress) {
          setSelectedAddress(defaultAddress.id);
        }
      } catch (err) {
        console.error(
          "Failed to load addresses:",
          err
        );

        if (mounted) {
          setError(
            err.response?.data?.error ||
              "Could not load your saved addresses."
          );
        }
      }
    }

    loadAddresses();

    return () => {
      mounted = false;
    };
  }, []);

  // ============================================================
  // LOAD STORE CASH
  // ============================================================

  useEffect(() => {
    let mounted = true;

    async function loadStoreCash() {
      try {
        const res = await api.get("/store-cash");

        if (!mounted) return;

        setStoreCashBalance(
          Number(res.data?.balance || 0)
        );
      } catch (err) {
        console.error(
          "Failed to load Store Cash:",
          err
        );

        if (mounted) {
          setStoreCashBalance(0);
        }
      } finally {
        if (mounted) {
          setLoadingStoreCash(false);
        }
      }
    }

    loadStoreCash();

    return () => {
      mounted = false;
    };
  }, []);

  // ============================================================
  // SAVE ADDRESS
  // ============================================================

  async function saveAddress(e) {
    e.preventDefault();
    setError("");

    try {
      const res = await api.post(
        "/addresses",
        newAddress
      );

      setAddresses((prev) => [
        res.data,
        ...prev,
      ]);

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
          "Could not save address."
      );
    }
  }

  // ============================================================
  // COUPON
  // ============================================================

  function verifyCoupon() {
    setError("");

    const code =
      couponCode.trim().toUpperCase();

    if (!code) {
      setCouponVerified(false);

      setError(
        "Please enter a coupon code."
      );

      return;
    }

    if (code !== "FRESH50") {
      setCouponVerified(false);

      setError(
        "Invalid coupon. Please use FRESH50."
      );

      return;
    }

    setCouponCode("FRESH50");
    setCouponVerified(true);
  }

  // ============================================================
  // PLACE ORDER
  // ============================================================

  async function placeOrder() {
    setError("");

    if (!selectedAddress) {
      setError(
        "Please select a delivery address."
      );
      return;
    }

    if (items.length === 0) {
      setError("Your cart is empty.");
      return;
    }

    if (loadingStoreCash) {
      setError(
        "Please wait while Store Cash is loading."
      );
      return;
    }

    setPlacing(true);

    try {
      // ========================================================
      // SEND CHECKOUT REQUEST
      // ========================================================
      //
      // IMPORTANT:
      // Backend expects storeCashToUse.
      //
      // Frontend does NOT send a calculated payment amount.
      // Backend calculates the authoritative total.
      //

      const payload = {
        addressId: selectedAddress,

        ...(couponVerified
          ? {
              couponCode: "FRESH50",
            }
          : {}),

        ...(storeCashToUse > 0
          ? {
              storeCashToUse,
            }
          : {}),
      };

      console.log(
        "FRESH STORE CHECKOUT REQUEST:",
        payload
      );

      const res = await api.post(
        "/orders/checkout",
        payload
      );

      const {
        order,
        devPayment,
        razorpay,
      } = res.data;

      console.log(
        "FRESH STORE CHECKOUT RESPONSE:",
        {
          order,
          devPayment,
          razorpay,
        }
      );

      if (!order) {
        throw new Error(
          "Server did not return an order."
        );
      }

      // ========================================================
      // SERVER TOTAL
      // ========================================================

      const serverOrderTotal = Number(
        order.total || 0
      );

      console.log(
        "SERVER ORDER TOTAL:",
        serverOrderTotal
      );

      // ========================================================
      // DEVELOPMENT PAYMENT
      // ========================================================

      if (devPayment === true) {
        try {
          await api.post(
            "/payments/dev-confirm",
            {
              orderId: order.id,
            }
          );

          try {
            sessionStorage.removeItem(
              "freshStoreCashToUse"
            );
          } catch {
            // Ignore storage errors.
          }

          await refresh();

          navigate(
            `/orders/${order.id}`
          );

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

      // ========================================================
      // RAZORPAY RESPONSE VALIDATION
      // ========================================================

      if (!razorpay) {
        throw new Error(
          "Razorpay order was not created by the server."
        );
      }

      if (!razorpay.orderId) {
        throw new Error(
          "Razorpay order ID is missing."
        );
      }

      if (!razorpay.keyId) {
        throw new Error(
          "Razorpay Key ID is missing."
        );
      }

      if (
        razorpay.amount === undefined ||
        razorpay.amount === null
      ) {
        throw new Error(
          "Razorpay amount is missing."
        );
      }

      // ========================================================
      // RAZORPAY AMOUNT
      // ========================================================
      //
      // Razorpay amount is supplied by the backend.
      //
      // Razorpay uses paise.
      //
      // Example:
      // ₹265.00 -> 26500 paise
      //

      const razorpayAmount = Number(
        razorpay.amount
      );

      const razorpayAmountInRupees =
        razorpayAmount / 100;

      console.log(
        "RAZORPAY AMOUNT:",
        razorpayAmount,
        "paise"
      );

      console.log(
        "RAZORPAY AMOUNT:",
        razorpayAmountInRupees,
        "rupees"
      );

      // ========================================================
      // CRITICAL SAFETY CHECK
      // ========================================================
      //
      // Razorpay amount MUST equal the server order total.
      //
      // If not, DO NOT open Razorpay.
      //

      const amountsMatch =
        Math.round(
          razorpayAmountInRupees * 100
        ) ===
        Math.round(
          serverOrderTotal * 100
        );

      if (!amountsMatch) {
        console.error(
          "PAYMENT AMOUNT MISMATCH:",
          {
            orderTotal: serverOrderTotal,
            razorpayAmountInRupees,
            razorpayAmount,
          }
        );

        setError(
          `Payment amount mismatch. Order total is ₹${serverOrderTotal.toFixed(
            2
          )}, but Razorpay received ₹${razorpayAmountInRupees.toFixed(
            2
          )}. Please try again.`
        );

        setPlacing(false);
        return;
      }

      // ========================================================
      // ZERO PAYMENT
      // ========================================================
      //
      // Razorpay cannot be used for ₹0.
      // The backend should normally return devPayment or
      // handle zero-value orders separately.
      //

      if (serverOrderTotal <= 0) {
        setError(
          "This order has no amount to pay. Please contact support."
        );

        setPlacing(false);
        return;
      }

      // ========================================================
      // LOAD RAZORPAY
      // ========================================================

      const loaded =
        await loadRazorpayScript();

      if (!loaded) {
        setError(
          "Could not load Razorpay. Check your internet connection and try again."
        );

        setPlacing(false);
        return;
      }

      if (!window.Razorpay) {
        setError(
          "Razorpay SDK is unavailable."
        );

        setPlacing(false);
        return;
      }

      // ========================================================
      // RAZORPAY OPTIONS
      // ========================================================

      const razorpayOptions = {
        key: razorpay.keyId,

        // IMPORTANT:
        // This is the SERVER amount.
        amount: razorpayAmount,

        currency:
          razorpay.currency || "INR",

        order_id:
          razorpay.orderId,

        name: "Fresh Store",

        description:
          `Order ${order.orderNumber}`,

        prefill: {
          name: user?.name || "",
          contact: user?.phone || "",
          email: user?.email || "",
        },

        notes: {
          orderId: order.id,
          orderNumber:
            order.orderNumber,
        },

        theme: {
          color: "#1B7A43",
        },

        handler: async (
          response
        ) => {
          try {
            console.log(
              "RAZORPAY PAYMENT RESPONSE:",
              response
            );

            if (
              !response?.razorpay_order_id ||
              !response?.razorpay_payment_id ||
              !response?.razorpay_signature
            ) {
              throw new Error(
                "Razorpay returned an incomplete payment response."
              );
            }

            await api.post(
              "/payments/verify",
              {
                razorpayOrderId:
                  response.razorpay_order_id,

                razorpayPaymentId:
                  response.razorpay_payment_id,

                razorpaySignature:
                  response.razorpay_signature,
              }
            );

            try {
              sessionStorage.removeItem(
                "freshStoreCashToUse"
              );
            } catch {
              // Ignore storage errors.
            }

            await refresh();

            navigate(
              `/orders/${order.id}`
            );
          } catch (err) {
            console.error(
              "Payment verification failed:",
              err
            );

            setError(
              err.response?.data?.error ||
                "Payment succeeded but verification failed. Contact support with your order number."
            );

            setPlacing(false);
          }
        },

        modal: {
          ondismiss: () => {
            console.log(
              "Razorpay payment window closed."
            );

            setPlacing(false);
          },
        },
      };

      console.log(
        "OPENING RAZORPAY WITH:",
        {
          amount:
            razorpayOptions.amount,
          currency:
            razorpayOptions.currency,
          order_id:
            razorpayOptions.order_id,
        }
      );

      const rzp =
        new window.Razorpay(
          razorpayOptions
        );

      rzp.on(
        "payment.failed",
        (response) => {
          console.error(
            "Razorpay payment failed:",
            response
          );

          setError(
            response?.error?.description ||
              "Payment failed. Please try again."
          );

          setPlacing(false);
        }
      );

      rzp.open();
    } catch (err) {
      console.error(
        "Checkout failed:",
        err
      );

      setError(
        err.response?.data?.error ||
          err.message ||
          "Could not place order."
      );

      setPlacing(false);
    }
  }

  // ============================================================
  // EMPTY CART
  // ============================================================

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-cream">
        <NavBar />

        <div className="max-w-2xl mx-auto py-16 text-center">
          <p className="text-ink/50 mb-4">
            Your cart is empty.
          </p>

          <button
            type="button"
            onClick={() => navigate("/")}
            className="text-leaf font-semibold"
          >
            Browse products →
          </button>
        </div>
      </div>
    );
  }

  // ============================================================
  // CHECKOUT UI
  // ============================================================

  return (
    <div className="min-h-screen bg-cream">
      <NavBar />

      <div className="max-w-2xl mx-auto px-4 py-6">

        {/* ================================================== */}
        {/* HEADER */}
        {/* ================================================== */}

        <div className="flex items-center justify-between mb-5">
          <button
            type="button"
            onClick={() =>
              navigate("/cart")
            }
            className="text-sm font-semibold text-leaf hover:underline"
          >
            ← Back to Cart
          </button>

          <h1 className="font-display font-800 text-xl">
            Checkout
          </h1>

          <div className="w-20" />
        </div>

        {/* ================================================== */}
        {/* ADDRESS */}
        {/* ================================================== */}

        <h2 className="font-semibold text-sm text-ink/60 mb-2">
          DELIVER TO
        </h2>

        <div className="space-y-2 mb-4">
          {addresses.map((address) => (
            <label
              key={address.id}
              className={`block bg-white rounded-xl2 border p-3 cursor-pointer ${
                selectedAddress === address.id
                  ? "border-leaf"
                  : "border-ink/10"
              }`}
            >
              <input
                type="radio"
                name="address"
                className="mr-2"
                checked={
                  selectedAddress ===
                  address.id
                }
                onChange={() =>
                  setSelectedAddress(
                    address.id
                  )
                }
              />

              <span className="font-medium text-sm">
                {address.label}
              </span>

              <p className="text-xs text-ink/60 ml-5">
                {address.line1},{" "}
                {address.city},{" "}
                {address.state} -{" "}
                {address.pincode}
              </p>
            </label>
          ))}
        </div>

        {/* ================================================== */}
        {/* NEW ADDRESS */}
        {/* ================================================== */}

        {showNewAddress ? (
          <form
            onSubmit={saveAddress}
            className="bg-white rounded-xl2 border border-ink/10 p-4 space-y-2 mb-5"
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

            <div className="flex gap-4 pt-2">
              <button
                type="submit"
                className="text-sm font-semibold text-leaf"
              >
                Save address
              </button>

              <button
                type="button"
                onClick={() =>
                  setShowNewAddress(false)
                }
                className="text-sm text-ink/50"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <button
            type="button"
            onClick={() =>
              setShowNewAddress(true)
            }
            className="text-sm font-semibold text-leaf mb-6"
          >
            + Add new address
          </button>
        )}

        {/* ================================================== */}
        {/* STORE CASH */}
        {/* ================================================== */}

        <h2 className="font-semibold text-sm text-ink/60 mb-2">
          STORE CASH
        </h2>

        <div className="bg-white rounded-xl2 border border-ink/10 p-4 mb-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-sm">
                Store Cash
              </p>

              <p className="text-xs text-ink/50 mt-1">
                Available balance: ₹
                {storeCashBalance.toFixed(2)}
              </p>
            </div>

            <span className="text-sm font-semibold text-leaf">
              {loadingStoreCash
                ? "Loading..."
                : storeCashToUse > 0
                  ? `-₹${storeCashToUse.toFixed(
                      2
                    )}`
                  : "Not used"}
            </span>
          </div>

          {storeCashToUse > 0 && (
            <p className="text-xs text-leaf mt-2">
              ₹
              {storeCashToUse.toFixed(2)}{" "}
              Store Cash will be used for this order.
            </p>
          )}

          {!loadingStoreCash &&
            storeCashBalance <= 0 && (
              <p className="text-xs text-ink/40 mt-2">
                No Store Cash available.
              </p>
            )}
        </div>

        {/* ================================================== */}
        {/* COUPON */}
        {/* ================================================== */}

        <h2 className="font-semibold text-sm text-ink/60 mb-2">
          COUPON
        </h2>

        <div className="bg-white rounded-xl2 border border-ink/10 p-4 mb-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-semibold text-sm">
                Fresh 50
              </p>

              <p className="text-xs text-ink/50 mt-1">
                Get ₹50 off on this order
              </p>
            </div>

            {couponVerified && (
              <span className="text-sm font-semibold text-leaf">
                ✓ Applied
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 mt-3">
            <input
              value={couponCode}
              onChange={(e) => {
                setCouponCode(
                  e.target.value.toUpperCase()
                );

                setCouponVerified(false);
              }}
              className="flex-1 border border-ink/15 rounded-lg px-3 py-2 text-sm"
              aria-label="Coupon code"
              placeholder="Enter coupon"
            />

            <button
              type="button"
              onClick={verifyCoupon}
              disabled={couponVerified}
              className="bg-leaf text-white rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-60"
            >
              {couponVerified
                ? "Applied"
                : "Verify"}
            </button>
          </div>

          {couponVerified && (
            <p className="text-xs text-leaf mt-2">
              FRESH50 verified — ₹50 discount requested from the server.
            </p>
          )}
        </div>

        {/* ================================================== */}
        {/* PAYMENT */}
        {/* ================================================== */}

        <div className="bg-white rounded-xl2 border border-ink/10 p-4 mb-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-sm">
                Pay through Razorpay
              </p>

              <p className="text-xs text-ink/50 mt-1">
                UPI, Cards, Netbanking & more
              </p>
            </div>

            <span className="text-leaf font-semibold text-sm">
              Secure
            </span>
          </div>
        </div>

        {/* ================================================== */}
        {/* FINAL SUMMARY */}
        {/* ================================================== */}

        <div className="bg-white rounded-xl2 border border-ink/10 p-4 mb-4">

          <div className="flex justify-between text-sm mb-2">
            <span className="text-ink/60">
              Subtotal
            </span>

            <span>
              ₹{Number(subtotal).toFixed(2)}
            </span>
          </div>

          {couponVerified && (
            <div className="flex justify-between text-sm mb-2">
              <span className="text-ink/60">
                Fresh 50
              </span>

              <span className="font-medium text-leaf">
                -₹{couponDiscount.toFixed(2)}
              </span>
            </div>
          )}

          {storeCashToUse > 0 && (
            <div className="flex justify-between text-sm mb-2">
              <span className="text-ink/60">
                Store Cash
              </span>

              <span className="font-medium text-leaf">
                -₹{storeCashToUse.toFixed(2)}
              </span>
            </div>
          )}

          <div className="border-t border-ink/10 mt-3 pt-3 flex justify-between font-semibold text-base">
            <span>
              Final payable
            </span>

            <span>
              ₹{estimatedPayable.toFixed(2)}
            </span>
          </div>

          <p className="text-xs text-ink/40 mt-2">
            No delivery fee. Final amount is calculated and validated by the server before payment.
          </p>
        </div>

        {/* ================================================== */}
        {/* ERROR */}
        {/* ================================================== */}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 mb-3 text-sm">
            {error}
          </div>
        )}

        {/* ================================================== */}
        {/* PLACE ORDER */}
        {/* ================================================== */}

        <button
          type="button"
          onClick={placeOrder}
          disabled={
            placing ||
            loadingStoreCash
          }
          className="w-full bg-mango text-white rounded-xl py-3 font-semibold disabled:opacity-60"
        >
          {placing
            ? "Processing..."
            : `Pay ₹${estimatedPayable.toFixed(
                2
              )} & place order`}
        </button>

        <p className="text-[11px] text-ink/40 text-center mt-2">
          {import.meta.env.MODE ===
          "development"
            ? "Development mode · Payment mode is controlled by the backend"
            : "Secured by Razorpay · UPI, Cards, Netbanking & more"}
        </p>
      </div>
    </div>
  );
}