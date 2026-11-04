
import "./App.css";
import {
  BrowserRouter,
  Routes,
  Route,
  useLocation,
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

// Wholesaler Dashboard
import WholesalerDashboard from "./pages/WHOLESALER/WholesalerDashboard";

function AppLayout() {
  const { pathname } = useLocation();

  const isAdminPage = pathname.startsWith("/admin");
  const isWholesalerPage = pathname.startsWith("/wholesaler");

  const hideMainLayout = isAdminPage || isWholesalerPage;

  useEffect(() => {
    document.body.classList.toggle(
      "admin-route-active",
      isAdminPage
    );

    document.body.classList.toggle(
      "wholesaler-route-active",
      isWholesalerPage
    );

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
        <Route path="/admin/*" element={<AdminDashboard />} />

        {/* Wholesaler Dashboard */}
        <Route
          path="/wholesaler/*"
          element={<WholesalerDashboard />}
        />

        <Route path="/auth" element={<Auth />} />
      </Routes>

      {!hideMainLayout && <Footer />}
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
