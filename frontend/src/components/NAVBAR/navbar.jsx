import { NavLink, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import "./navbar.css";

export function Navbar() {
  const location = useLocation();

  const [isLoggedIn, setIsLoggedIn] = useState(
    !!localStorage.getItem("token")
  );

  useEffect(() => {
    const token = localStorage.getItem("token");

    console.log("NAVBAR TOKEN:", token);

    setIsLoggedIn(!!token);
  }, [location]);

  return (
    <nav className="navbar">

      <h3 id="logo">ShopEasy</h3>

      <div className="search-box">
        <input
          type="text"
          placeholder="Search products..."
        />

        <button type="button">
          Search
        </button>
      </div>

      <NavLink to="/" end>
        HOME
      </NavLink>

      <NavLink to="/products">
        PRODUCTS
      </NavLink>

      <NavLink to="/category">
        CATEGORIES
      </NavLink>

      <NavLink to="/cart">
        CART
      </NavLink>

      {isLoggedIn && (
        <>
          <NavLink to="/profile">
            MY PROFILE
          </NavLink>

          <NavLink to="/orders">
            MY ORDERS
          </NavLink>
        </>
      )}

      {!isLoggedIn && (
        <NavLink to="/auth">
          Login/Sign Up
        </NavLink>
      )}

    </nav>
  );
}



