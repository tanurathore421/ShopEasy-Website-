
import "./ProductList.css";
import { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate, useLocation } from "react-router-dom";

function ProductList() {
  const navigate = useNavigate();
  const location = useLocation();

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");

  const API_URL = "http://localhost:3000/api";

  // Read search and category from URL
  useEffect(() => {
    const params = new URLSearchParams(location.search);

    setSearch(params.get("search") || "");
    setSelectedCategory(params.get("category") || "");
  }, [location.search]);

  // Get user ID from JWT
  const getUserIdFromToken = (token) => {
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      return payload.userId;
    } catch (error) {
      return null;
    }
  };

  // Fetch all products
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);

        const response = await axios.get(
          `${API_URL}/products/all`
        );

        const productData = Array.isArray(response.data)
          ? response.data
          : response.data.products || [];

        setProducts(productData);
      } catch (error) {
        console.error("Products fetch error:", error);
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  // Filter products by search and category
  const filteredProducts = products.filter((product) => {
    const searchValue = search.toLowerCase().trim();

    const productName = product.name?.toLowerCase() || "";
    const productCategory = product.category?.toLowerCase() || "";
    const productPrice = String(product.price || "");

    const matchesSearch =
      !searchValue ||
      productName.includes(searchValue) ||
      productCategory.includes(searchValue) ||
      productPrice.includes(searchValue);

    const matchesCategory =
      !selectedCategory ||
      productCategory === selectedCategory.toLowerCase();

    return matchesSearch && matchesCategory;
  });

  // Add to Cart
  const addToCart = (product) => {
    const token = localStorage.getItem("token");

    if (!token) {
      alert("Please login first");
      navigate("/auth");
      return;
    }

    const userId = getUserIdFromToken(token);

    if (!userId) {
      alert("Invalid login session. Please login again.");
      navigate("/auth");
      return;
    }

    const cartKey = `cart_${userId}`;
    let cart = JSON.parse(localStorage.getItem(cartKey)) || [];

    const existingProduct = cart.find(
      (item) => item._id === product._id
    );

    if (existingProduct) {
      existingProduct.quantity += 1;
    } else {
      cart.push({
        ...product,
        quantity: 1,
      });
    }

    localStorage.setItem(cartKey, JSON.stringify(cart));

    alert("Product added to cart successfully!");
  };

  // Buy Now
  const buyNow = (product) => {
    const token = localStorage.getItem("token");

    if (!token) {
      alert("Please login first");
      navigate("/auth");
      return;
    }

    const userId = getUserIdFromToken(token);

    if (!userId) {
      alert("Invalid login session. Please login again.");
      navigate("/auth");
      return;
    }

    const buyNowKey = `buynow_${userId}`;

    const buyNowProduct = {
      ...product,
      quantity: 1,
    };

    localStorage.setItem(
      buyNowKey,
      JSON.stringify([buyNowProduct])
    );

    navigate("/checkout", {
      state: { mode: "buyNow" },
    });
  };

  return (
    <div className="product-page">
      <div className="product-heading">
        <h2>
          {selectedCategory
            ? `${selectedCategory} Products`
            : search
            ? `Search Results: ${search}`
            : "All Products"}
        </h2>

        {(selectedCategory || search) && (
          <button
            onClick={() => navigate("/products")}
            className="clear-filter-btn"
          >
            Show All Products
          </button>
        )}
      </div>

      {loading ? (
        <h3>Loading products...</h3>
      ) : filteredProducts.length === 0 ? (
        <h3>No products found.</h3>
      ) : (
        <div className="product-container">
          {filteredProducts.map((product) => (
            <div className="product-card" key={product._id}>
              <img
                src={product.image}
                alt={product.name}
                onError={(e) => {
                  e.target.src =
                    "https://via.placeholder.com/250?text=No+Image";
                }}
              />

              <h3>{product.name}</h3>

              <p>Category: {product.category}</p>

              <h4>₹{product.price}</h4>

              <div className="product-buttons">
                <button onClick={() => addToCart(product)}>
                  Add to Cart
                </button>

                <button onClick={() => buyNow(product)}>
                  Buy Now
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default ProductList;
