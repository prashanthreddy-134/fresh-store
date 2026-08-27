import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { CartProvider } from "./context/CartContext";
import ProtectedRoute from "./components/ProtectedRoute";

import Home from "./pages/Home";
import Login from "./pages/Login";
import ProductDetail from "./pages/ProductDetail";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import Orders from "./pages/Orders";
import OrderDetail from "./pages/OrderDetail";
import Wishlist from "./pages/Wishlist";

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

import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import RefundPolicy from "./pages/RefundPolicy";

export default function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <BrowserRouter>
          <Routes>

            {/* Home */}
            <Route
              path="/"
              element={<Home />}
            />

            {/* Authentication */}
            <Route
              path="/login"
              element={<Login />}
            />

            {/* Products */}
            <Route
              path="/product/:idOrSlug"
              element={<ProductDetail />}
            />

            {/* Cart */}
            <Route
              path="/cart"
              element={
                <ProtectedRoute>
                  <Cart />
                </ProtectedRoute>
              }
            />

            {/* Checkout */}
            <Route
              path="/checkout"
              element={
                <ProtectedRoute>
                  <Checkout />
                </ProtectedRoute>
              }
            />

            {/* Orders */}
            <Route
              path="/orders"
              element={
                <ProtectedRoute>
                  <Orders />
                </ProtectedRoute>
              }
            />

            <Route
              path="/orders/:id"
              element={
                <ProtectedRoute>
                  <OrderDetail />
                </ProtectedRoute>
              }
            />

            {/* Wishlist */}
            <Route
              path="/wishlist"
              element={
                <ProtectedRoute>
                  <Wishlist />
                </ProtectedRoute>
              }
            />

            {/* =====================================================
                PROFILE
               ===================================================== */}

            {/* Main Profile */}
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              }
            />

            {/* Profile Details */}
            <Route
              path="/profile/details"
              element={
                <ProtectedRoute>
                  <ProfileDetails />
                </ProtectedRoute>
              }
            />

            {/* Saved Addresses */}
            <Route
              path="/profile/addresses"
              element={
                <ProtectedRoute>
                  <ProfileAddresses />
                </ProtectedRoute>
              }
            />

            {/* Store Cash */}
            <Route
              path="/profile/store-cash"
              element={
                <ProtectedRoute>
                  <ProfileStoreCash />
                </ProtectedRoute>
              }
            />

            {/* E-Gift Cards */}
            <Route
              path="/profile/gift-cards"
              element={
                <ProtectedRoute>
                  <ProfileGiftCards />
                </ProtectedRoute>
              }
            />

            {/* Review & Earn */}
            <Route
              path="/profile/reviews"
              element={
                <ProtectedRoute>
                  <ProfileReviews />
                </ProtectedRoute>
              }
            />

            {/* Refunds */}
            <Route
              path="/profile/refunds"
              element={
                <ProtectedRoute>
                  <ProfileRefunds />
                </ProtectedRoute>
              }
            />

            {/* Rewards */}
            <Route
              path="/profile/rewards"
              element={
                <ProtectedRoute>
                  <ProfileRewards />
                </ProtectedRoute>
              }
            />

            {/* Payment Management */}
            <Route
              path="/profile/payments"
              element={
                <ProtectedRoute>
                  <ProfilePayments />
                </ProtectedRoute>
              }
            />

            {/* Help & Support */}
            <Route
              path="/profile/help"
              element={
                <ProtectedRoute>
                  <ProfileHelp />
                </ProtectedRoute>
              }
            />

            {/* Suggest Products */}
            <Route
              path="/profile/suggest-products"
              element={
                <ProtectedRoute>
                  <ProfileSuggestProducts />
                </ProtectedRoute>
              }
            />

            {/* Notifications */}
            <Route
              path="/profile/notifications"
              element={
                <ProtectedRoute>
                  <ProfileNotifications />
                </ProtectedRoute>
              }
            />

            {/* General Information */}
            <Route
              path="/profile/general"
              element={
                <ProtectedRoute>
                  <ProfileGeneral />
                </ProtectedRoute>
              }
            />

            {/* Legal */}
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