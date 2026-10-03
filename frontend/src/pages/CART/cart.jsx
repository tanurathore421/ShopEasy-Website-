import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "./cart.css";

function Cart() {
  const [cart, setCart] = useState([]);
  const navigate = useNavigate();

  // ==========================================
  // GET USER ID FROM TOKEN
  // ==========================================
  const getUserIdFromToken = () => {
    const token = localStorage.getItem("token");

    if (!token) {
      return null;
    }

    try {
      const payload = JSON.parse(
        atob(token.split(".")[1])
      );

      return payload.userId;
    } catch (error) {
      console.error("TOKEN ERROR:", error);
      return null;
    }
  };

  // ==========================================
  // GET CART KEY FOR CURRENT USER
  // ==========================================
  const getCartKey = () => {
    const userId = getUserIdFromToken();

    if (!userId) {
      return null;
    }

    return `cart_${userId}`;
  };

  // ==========================================
  // LOAD CART
  // ==========================================
  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token) {
      setCart([]);
      return;
    }

    const cartKey = getCartKey();

    if (!cartKey) {
      setCart([]);
      return;
    }

    const savedCart =
      JSON.parse(localStorage.getItem(cartKey)) || [];

    setCart(savedCart);
  }, []);

  // ==========================================
  // SAVE CART
  // ==========================================
  const saveCart = (updatedCart) => {
    const cartKey = getCartKey();

    if (!cartKey) {
      return;
    }

    localStorage.setItem(
      cartKey,
      JSON.stringify(updatedCart)
    );

    setCart(updatedCart);
  };

  // ==========================================
  // INCREASE QUANTITY
  // ==========================================
  const increaseQuantity = (id) => {
    const updatedCart = cart.map((item) => {
      if (item._id === id) {
        return {
          ...item,
          quantity: item.quantity + 1,
        };
      }

      return item;
    });

    saveCart(updatedCart);
  };

  // ==========================================
  // DECREASE QUANTITY
  // ==========================================
  const decreaseQuantity = (id) => {
    const updatedCart = cart
      .map((item) => {
        if (item._id === id) {
          return {
            ...item,
            quantity: item.quantity - 1,
          };
        }

        return item;
      })
      .filter((item) => item.quantity > 0);

    saveCart(updatedCart);
  };

  // ==========================================
  // REMOVE ITEM
  // ==========================================
  const removeFromCart = (id) => {
    const updatedCart = cart.filter(
      (item) => item._id !== id
    );

    saveCart(updatedCart);
  };

  // ==========================================
  // TOTAL
  // ==========================================
  const totalPrice = cart.reduce(
    (total, item) => {
      return (
        total +
        Number(item.price) * Number(item.quantity)
      );
    },
    0
  );

  // ==========================================
  // CHECKOUT
  // ==========================================
  const handleCheckout = async () => {
    try {
      const token = localStorage.getItem("token");

      if (!token) {
        alert("Please login before checkout");
        navigate("/auth");
        return;
      }

      if (cart.length === 0) {
        alert("Your cart is empty");
        return;
      }

        window.location.href = "/checkout";

      // Place every cart item as an order
      for (const item of cart) {
        await axios.post(
          "http://localhost:3000/api/orders/orders",
          {
            productId: item._id,
            quantity: item.quantity,
            price: item.price,
          },
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
      }

      // Clear only current user's cart
      const cartKey = getCartKey();

      if (cartKey) {
        localStorage.removeItem(cartKey);
      }

      setCart([]);

      alert("Order placed successfully!");

      navigate("/orders");

    } catch (error) {
      console.error(
        "Checkout error:",
        error.response?.data ||
          error.message
      );

      alert(
        error.response?.data?.message ||
          "Checkout failed. Please try again."
      );
    }
  };

  // ==========================================
  // UI
  // ==========================================
  return (
    <div className="cart-page">

      <h1>Product Cart</h1>

      {cart.length === 0 ? (
        <div className="empty-cart">
          <h2>Cart is Empty</h2>

          <p>
            Please add some products.
          </p>
        </div>
      ) : (
        <div className="cart-container">

          <div className="cart-products">

            {cart.map((item) => (
              <div
                className="cart-card"
                key={item._id}
              >

                <img
                  src={item.image}
                  alt={item.name}
                  className="cart-image"
                />

                <div className="cart-info">

                  <h2>{item.name}</h2>

                  <p>
                    Price: ₹ {item.price}
                  </p>

                  <div className="quantity">

                    <button
                      onClick={() =>
                        decreaseQuantity(item._id)
                      }
                    >
                      -
                    </button>

                    <span>
                      {item.quantity}
                    </span>

                    <button
                      onClick={() =>
                        increaseQuantity(item._id)
                      }
                    >
                      +
                    </button>

                  </div>

                  <button
                    className="remove-button"
                    onClick={() =>
                      removeFromCart(item._id)
                    }
                  >
                    Remove
                  </button>

                </div>

              </div>
            ))}

          </div>

          <div className="cart-total">

            <h2>Order Summary</h2>

            <p>
              Total: ₹ {totalPrice}
            </p>

            <button
              className="checkout-button"
              onClick={handleCheckout}
            >
              Checkout
            </button>

          </div>

        </div>
      )}

    </div>
  );
}

export default Cart;
