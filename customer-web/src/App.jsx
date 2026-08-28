import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { CartProvider } from "./context/CartContext";
import ProtectedRoute from "./components/ProtectedRoute";

// ============================================================
// MAIN PAGES
// ============================================================

import Home from "./pages/Home";
import Login from "./pages/Login";
import ProductDetail from "./pages/ProductDetail";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import Coupons from "./pages/Coupons";

// ============================================================
// ORDERS
// ============================================================

import Orders from "./pages/Orders";
import OrderDetail from "./pages/OrderDetail";
import Invoice from "./pages/Invoice";

// ============================================================
// WISHLIST
// ============================================================

import Wishlist from "./pages/Wishlist";

// ============================================================
// PROFILE
// ============================================================

import Profile from "./pages/Profile";
import ProfileDetails from "./pages/ProfileDetails";
import ProfileAddresses from "./pages/ProfileAddresses";
import ProfileStoreCash from "./pages/ProfileStoreCash";
import ProfileGiftCards from "./pages/ProfileGiftCards";
import ProfileReviews from "./pages/ProfileReviews";
import ProfileRefunds from "./pages/ProfileRefunds";
import ProfileRewards from "./pages/ProfileRewards";
import ProfilePayments from "./pages/ProfilePayments";
import ProfileHelp from "./pages/ProfileHelp";
import ProfileSuggestProducts from "./pages/ProfileSuggestProducts";
import ProfileNotifications from "./pages/ProfileNotifications";
import ProfileGeneral from "./pages/ProfileGeneral";

// ============================================================
// LEGAL
// ============================================================

import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import RefundPolicy from "./pages/RefundPolicy";

export default function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <BrowserRouter>
          <Routes>

            {/* ==================================================
                HOME
               ================================================== */}

            <Route
              path="/"
              element={<Home />}
            />

            {/* ==================================================
                AUTHENTICATION
               ================================================== */}

            <Route
              path="/login"
              element={<Login />}
            />

            {/* ==================================================
                PRODUCTS
               ================================================== */}

            <Route
              path="/product/:idOrSlug"
              element={<ProductDetail />}
            />

            {/* ==================================================
                CART
               ================================================== */}

            <Route
              path="/cart"
              element={
                <ProtectedRoute>
                  <Cart />
                </ProtectedRoute>
              }
            />

            {/* ==================================================
                CHECKOUT
               ================================================== */}

            <Route
              path="/checkout"
              element={
                <ProtectedRoute>
                  <Checkout />
                </ProtectedRoute>
              }
            />

            {/* ==================================================
                COUPONS
               ================================================== */}

            <Route
              path="/coupons"
              element={
                <ProtectedRoute>
                  <Coupons />
                </ProtectedRoute>
              }
            />

            {/* ==================================================
                ORDERS
               ================================================== */}

            <Route
              path="/orders"
              element={
                <ProtectedRoute>
                  <Orders />
                </ProtectedRoute>
              }
            />

            {/* ==================================================
                ORDER DETAIL
               ================================================== */}

            <Route
              path="/orders/:id"
              element={
                <ProtectedRoute>
                  <OrderDetail />
                </ProtectedRoute>
              }
            />

            {/* ==================================================
                INVOICE
               ================================================== */}

            <Route
              path="/orders/:id/invoice"
              element={
                <ProtectedRoute>
                  <Invoice />
                </ProtectedRoute>
              }
            />

            {/* ==================================================
                WISHLIST
               ================================================== */}

            <Route
              path="/wishlist"
              element={
                <ProtectedRoute>
                  <Wishlist />
                </ProtectedRoute>
              }
            />

            {/* ==================================================
                PROFILE
               ================================================== */}

            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              }
            />

            {/* ==================================================
                PROFILE DETAILS
               ================================================== */}

            <Route
              path="/profile/details"
              element={
                <ProtectedRoute>
                  <ProfileDetails />
                </ProtectedRoute>
              }
            />

            {/* ==================================================
                SAVED ADDRESSES
               ================================================== */}

            <Route
              path="/profile/addresses"
              element={
                <ProtectedRoute>
                  <ProfileAddresses />
                </ProtectedRoute>
              }
            />

            {/* ==================================================
                STORE CASH
               ================================================== */}

            <Route
              path="/profile/store-cash"
              element={
                <ProtectedRoute>
                  <ProfileStoreCash />
                </ProtectedRoute>
              }
            />

            {/* ==================================================
                E-GIFT CARDS
               ================================================== */}

            <Route
              path="/profile/gift-cards"
              element={
                <ProtectedRoute>
                  <ProfileGiftCards />
                </ProtectedRoute>
              }
            />

            {/* ==================================================
                REVIEWS
               ================================================== */}

            <Route
              path="/profile/reviews"
              element={
                <ProtectedRoute>
                  <ProfileReviews />
                </ProtectedRoute>
              }
            />

            {/* ==================================================
                REFUNDS
               ================================================== */}

            <Route
              path="/profile/refunds"
              element={
                <ProtectedRoute>
                  <ProfileRefunds />
                </ProtectedRoute>
              }
            />

            {/* ==================================================
                REWARDS
               ================================================== */}

            <Route
              path="/profile/rewards"
              element={
                <ProtectedRoute>
                  <ProfileRewards />
                </ProtectedRoute>
              }
            />

            {/* ==================================================
                PAYMENT MANAGEMENT
               ================================================== */}

            <Route
              path="/profile/payments"
              element={
                <ProtectedRoute>
                  <ProfilePayments />
                </ProtectedRoute>
              }
            />

            {/* ==================================================
                HELP & SUPPORT
               ================================================== */}

            <Route
              path="/profile/help"
              element={
                <ProtectedRoute>
                  <ProfileHelp />
                </ProtectedRoute>
              }
            />

            {/* ==================================================
                SUGGEST PRODUCTS
               ================================================== */}

            <Route
              path="/profile/suggest-products"
              element={
                <ProtectedRoute>
                  <ProfileSuggestProducts />
                </ProtectedRoute>
              }
            />

            {/* ==================================================
                NOTIFICATIONS
               ================================================== */}

            <Route
              path="/profile/notifications"
              element={
                <ProtectedRoute>
                  <ProfileNotifications />
                </ProtectedRoute>
              }
            />

            {/* ==================================================
                GENERAL INFORMATION
               ================================================== */}

            <Route
              path="/profile/general"
              element={
                <ProtectedRoute>
                  <ProfileGeneral />
                </ProtectedRoute>
              }
            />

            {/* ==================================================
                LEGAL
               ================================================== */}

            <Route
              path="/terms"
              element={<Terms />}
            />

            <Route
              path="/privacy"
              element={<Privacy />}
            />

            <Route
              path="/refund-policy"
              element={<RefundPolicy />}
            />

          </Routes>
        </BrowserRouter>
      </CartProvider>
    </AuthProvider>
  );
}