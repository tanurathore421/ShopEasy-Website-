import "./App.css";
import {
  BrowserRouter,
  Routes,
  Route,
  useLocation,
  Navigate,
} from "react-router-dom";
import { useEffect } from "react";

import { Home } from "./pages/HOME/Home";
import Register from "./pages/REGISTER/Register";
import Login from "./pages/LOGIN/Login";
import { Navbar } from "./components/NAVBAR/navbar";
import ProductList from "./pages/PRODUCTS/ProductList";
import { Footer } from "./components/FOOTER/footer";
import Categories from "./pages/CATEGORY/categories";
import Profile from "./pages/PROFILE/Profile";
import Cart from "./pages/CART/cart";
import Orders from "./pages/ORDERS/Order";
import AdminDashboard from "./pages/ADMIN/admin";
import Auth from "./pages/AUTH/auth";
import Checkout from "./pages/CHECKOUT/checkout";
import Help from "./pages/HELP/help";
import HelpChat from "./components/HELPCHAT/helpChat";

// Wholesaler Dashboard
import WholesalerDashboard from "./pages/WHOLESALER/WholesalerDashboard";

const ProtectedRoute = ({ children, allowedRole }) => {
  const token = localStorage.getItem("token");
  const role = localStorage.getItem("role");

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (role !== allowedRole) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

function AppLayout() {
  const { pathname } = useLocation();

  const isAdminPage = pathname.startsWith("/admin");
  const isWholesalerPage = pathname.startsWith("/wholesaler");

  const hideMainLayout = isAdminPage || isWholesalerPage;

  useEffect(() => {
    document.body.classList.toggle("admin-route-active", isAdminPage);

    document.body.classList.toggle("wholesaler-route-active", isWholesalerPage);

    return () => {
      document.body.classList.remove("admin-route-active");
      document.body.classList.remove("wholesaler-route-active");
    };
  }, [isAdminPage, isWholesalerPage]);

  return (
    <>
      {!hideMainLayout && <Navbar />}

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />
        <Route path="/products" element={<ProductList />} />
        <Route path="/category" element={<Categories />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/help" element={<Help />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/orders" element={<Orders />} />

        {/* Admin Dashboard */}
        <Route
          path="/admin/*"
          element={
            <ProtectedRoute allowedRole="admin">
              <AdminDashboard />
            </ProtectedRoute>
          }
        />

        {/* Wholesaler Dashboard */}
        <Route
          path="/wholesaler/*"
          element={
            <ProtectedRoute allowedRole="wholesaler">
              <WholesalerDashboard />
            </ProtectedRoute>
          }
        />

        <Route path="/auth" element={<Auth />} />
      </Routes>

      {!hideMainLayout && <Footer />}
      <HelpChat />
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppLayout />
    </BrowserRouter>
  );
}

export default App;
