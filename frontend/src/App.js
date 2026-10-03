import "./App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
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
import AdminDashboard from "./pages/admin/admin";
import Auth from "./pages/AUTH/auth";
import Checkout from "./pages/CHECKOUT/checkout";



function App() {

  return (
    <BrowserRouter>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />
        <Route path="/products" element={<ProductList />} />
        <Route path="/category" element={<Categories />} />
        <Route path="/profile" element={<Profile />} />
                 <Route path="/checkout" element={<Checkout />} />


        <Route path="/cart" element={<Cart />} />
        <Route path="/orders" element={<Orders />} />
        <Route path="/admin" element={<AdminDashboard />} />
         <Route path="/auth" element={<Auth />} />



      </Routes>
      <Footer />
    </BrowserRouter>
  );
}

export default App;
