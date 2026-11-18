import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import "./navbar.css";

export function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();

  const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem("token"));

  const [search, setSearch] = useState("");

  useEffect(() => {
    setIsLoggedIn(!!localStorage.getItem("token"));
  }, [location]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    setSearch(params.get("search") || "");
  }, [location.search]);

  const handleSearch = (e) => {
    const value = e.target.value;
    setSearch(value);

    navigate(
      value.trim()
        ? `/products?search=${encodeURIComponent(value)}`
        : "/products",
      { replace: true },
    );
  };
  return (
    <nav className="navbar">
      <h3 id="logo">ShopEasy</h3>

      {/* Existing Navbar Search Bar */}
      <form className="search-box" onSubmit={handleSearch}>
        <input
          type="text"
          placeholder="Search products..."
          value={search}
          onChange={handleSearch}
        />
        <button type="submit">Search</button>
      </form>

      <NavLink to="/" end>
        HOME
      </NavLink>
      <NavLink to="/products">PRODUCTS</NavLink>
      <NavLink to="/category">CATEGORIES</NavLink>
      <NavLink to="/cart">CART</NavLink>

      {isLoggedIn && (
        <>
          <NavLink to="/profile">MY PROFILE</NavLink>
          <NavLink to="/orders">MY ORDERS</NavLink>
        </>
      )}

      {!isLoggedIn && <NavLink to="/auth">Login/Sign Up</NavLink>}

      <NavLink to="/help">HELP</NavLink>
    </nav>
  );
}

/* import { NavLink, useLocation } from "react-router-dom";
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

          
      <NavLink to="/help">
        HELP
      </NavLink>

    </nav>
  );
}



 */
