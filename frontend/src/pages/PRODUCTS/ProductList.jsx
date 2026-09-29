import "./ProductList.css";
import { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

function ProductList() {
  const navigate = useNavigate();

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // =========================
  // GET PRODUCTS
  // =========================
  const getProducts = async () => {
    try {
      const response = await axios.get(
        "http://localhost:3000/api/products/all"
      );

      setProducts(response.data);
    } catch (error) {
      console.log("GET PRODUCTS ERROR:", error);
      alert("Unable to load products");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getProducts();
  }, []);

  // =========================
  // CHECK LOGIN
  // =========================
  const checkLogin = () => {
    const token = localStorage.getItem("token");

    if (!token) {
      alert("Please login first");
      navigate("/auth");
      return false;
    }
  

    return true;
  };

  // =========================
  // ADD TO CART
  // =========================
  const addToCart = (product) => {
 /*    // Check login first
    if (!checkLogin()) {
      return;
    } */

    const existingCart =
      JSON.parse(localStorage.getItem("cart")) || [];

    const existingProduct = existingCart.find(
      (item) => item._id === product._id
    );

    let updatedCart;

    if (existingProduct) {
      updatedCart = existingCart.map((item) =>
        item._id === product._id
          ? {
              ...item,
              quantity: item.quantity + 1,
            }
          : item
      );
    } else {
      updatedCart = [
        ...existingCart,
        {
          ...product,
          quantity: 1,
        },
      ];
    }

    localStorage.setItem(
      "cart",
      JSON.stringify(updatedCart)
    );

    alert("Product added to cart!");

    navigate("/cart");
  };

  // =========================
  // BUY NOW
  // =========================
  const handleBuy = async (product) => {
    // Check login first
    if (!checkLogin()) {
      return;
    }

    try {
      const token = localStorage.getItem("token");

      const response = await axios.post(
        "http://localhost:3000/api/orders/orders",
        {
          productId: product._id,
          quantity: 1,
          price: product.price,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.status === 200) {
        alert(response.data.message);
        navigate("/orders");
      }

      if (response.status === 201) {
        alert("Order placed successfully");
        navigate("/orders");
      }
    } catch (err) {
      console.error(
        "Error placing order:",
        err.response?.status,
        err.response?.data || err.message
      );

      if (err.response?.status === 401) {
        alert(
          "Your login session has expired. Please login again."
        );

        localStorage.removeItem("token");

        navigate("/auth");
      } else {
        alert("Failed to place order");
      }
    }
  };

  // =========================
  // LOADING
  // =========================
  if (loading) {
    return <h2>Loading products...</h2>;
  }

  // =========================
  // UI
  // =========================
  return (
    <div className="product-page">
      <h1>Our Products</h1>

      <div className="product-container">
        {products.map((product) => (
          <div
            className="product-card"
            key={product._id}
          >
            <img
              src={product.image}
              alt={product.name}
              className="product-image"
            />

            <h2>{product.name}</h2>

            <p className="price">
              ₹ {product.price}
            </p>

            <button
              className="details-btn"
              onClick={() => handleBuy(product)}
            >
              Buy Now
            </button>

            <button
              className="cart-btn"
              onClick={() => addToCart(product)}
            >
              Add to Cart
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default ProductList;



