
import { useState } from "react";
import axios from "axios";
import { useNavigate, useLocation } from "react-router-dom";
import "./checkout.css";

const API_URL = "http://localhost:3000/api";

function Checkout() {
  const [paymentMethod, setPaymentMethod] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  const getUserInfo = () => {
    const token = localStorage.getItem("token");

    if (!token) {
      throw new Error("Please login before checkout");
    }

    try {
      const payload = JSON.parse(
        atob(
          token
            .split(".")[1]
            .replace(/-/g, "+")
            .replace(/_/g, "/")
        )
      );

      if (!payload.userId) {
        throw new Error("User ID not found in token");
      }

      return {
        token,
        userId: payload.userId,
      };
    } catch {
      throw new Error("Invalid login session. Please login again.");
    }
  };

  // Buy Now uses a separate cart so the existing cart stays unchanged
  const getCheckoutItems = () => {
    const { userId } = getUserInfo();

    const isBuyNow = location.state?.mode === "buyNow";
    const storageKey = isBuyNow
      ? `buynow_${userId}`
      : `cart_${userId}`;

    const items = JSON.parse(
      localStorage.getItem(storageKey) || "[]"
    );

    if (!Array.isArray(items) || items.length === 0) {
      throw new Error(
        isBuyNow
          ? "Buy Now product was not found. Please select the product again."
          : "Your cart is empty"
      );
    }

    return { items, isBuyNow, userId };
  };

  const clearSuccessfulCheckout = (userId, isBuyNow) => {
    if (isBuyNow) {
      localStorage.removeItem(`buynow_${userId}`);
    } else {
      localStorage.removeItem(`cart_${userId}`);
    }
  };

  const handlePayment = async () => {
    if (!paymentMethod) {
      alert("Please select payment method");
      return;
    }

    if (loading) return;

    setLoading(true);

    try {
      const { token, userId } = getUserInfo();
      const { items: checkoutItems, isBuyNow } = getCheckoutItems();

      const items = checkoutItems.map((item) => ({
        productId: item._id,
        quantity: Number(item.quantity || 1),
      }));

      if (
        items.some(
          (item) =>
            !item.productId ||
            !Number.isSafeInteger(item.quantity) ||
            item.quantity < 1 ||
            item.quantity > 100
        )
      ) {
        throw new Error("Invalid checkout items. Please try again.");
      }

      // Cash on Delivery
      if (paymentMethod === "cod") {
        const response = await axios.post(
          `${API_URL}/orders/cod`,
          { items },
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
            withCredentials: true,
          }
        );

        clearSuccessfulCheckout(userId, isBuyNow);

        alert(
          response.data.message || "Order placed successfully!"
        );

        navigate("/orders");
        return;
      }

      // Create Razorpay order using backend product prices
      const response = await axios.post(
        `${API_URL}/payment/create-order`,
        { items },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          withCredentials: true,
        }
      );

      const { orderId, amount, currency, keyId } = response.data;

      if (!orderId || !keyId || !amount || !currency) {
        throw new Error("Invalid Razorpay order response");
      }

      if (!window.Razorpay) {
        throw new Error(
          "Razorpay Checkout is not loaded. Add the Razorpay script to public/index.html."
        );
      }

      const razorpay = new window.Razorpay({
        key: keyId,
        amount,
        currency,
        name: "My E-commerce Store",
        description: isBuyNow ? "Buy Now Payment" : "Cart Payment",
        order_id: orderId,

        handler: async (paymentResponse) => {
          try {
            const verification = await axios.post(
              `${API_URL}/payment/verify-payment`,
              {
                razorpay_order_id:
                  paymentResponse.razorpay_order_id,
                razorpay_payment_id:
                  paymentResponse.razorpay_payment_id,
                razorpay_signature:
                  paymentResponse.razorpay_signature,
              },
              {
                headers: {
                  Authorization: `Bearer ${token}`,
                },
                withCredentials: true,
              }
            );

            if (verification.data.success) {
              clearSuccessfulCheckout(userId, isBuyNow);

              alert("Payment successful! Your order has been saved.");
              navigate("/orders");
            } else {
              console.error(
                "Verification response:",
                verification.data
              );

              alert(
                verification.data.message ||
                  "Payment status could not be confirmed. Do not pay again yet."
              );
            }
          } catch (error) {
            console.error(
              "Verification error:",
              error.response?.data || error.message
            );

            alert(
              "Payment may have succeeded, but order confirmation failed. Check Razorpay payment status before trying again."
            );
          } finally {
            setLoading(false);
          }
        },

        modal: {
          ondismiss: () => {
            setLoading(false);
            console.log("Razorpay checkout closed");
          },
        },

        theme: {
          color: "#3399cc",
        },
      });

      razorpay.on("payment.failed", (event) => {
        console.error("Payment failed:", event.error);
        alert(event.error.description || "Payment failed");
        setLoading(false);
      });

      razorpay.open();
    } catch (error) {
      console.error(
        "Checkout error:",
        error.response?.data || error.message
      );

      if (error.response?.status === 401) {
        alert("Your login session has expired. Please login again.");
        localStorage.removeItem("token");
        navigate("/auth");
      } else {
        alert(
          error.response?.data?.message ||
            error.message ||
            "Unable to start checkout"
        );
      }

      setLoading(false);
    }
  };

  return (
    <div className="checkout-page">
      <h1>Checkout</h1>

      <h2>Select Payment Method</h2>

      <div>
        <label>
          <input
            type="radio"
            name="payment"
            value="cod"
            checked={paymentMethod === "cod"}
            onChange={(e) => setPaymentMethod(e.target.value)}
            disabled={loading}
          />
          Cash on Delivery
        </label>
      </div>

      <div>
        <label>
          <input
            type="radio"
            name="payment"
            value="razorpay"
            checked={paymentMethod === "razorpay"}
            onChange={(e) => setPaymentMethod(e.target.value)}
            disabled={loading}
          />
          Online Payment (Razorpay Test Mode)
        </label>
      </div>

      <button onClick={handlePayment} disabled={loading}>
        {loading ? "Processing..." : "Continue Payment"}
      </button>
    </div>
  );
}

export default Checkout;

/* 
import { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "./checkout.css";

const API_URL = "http://localhost:3000/api";

function Checkout() {
  const [paymentMethod, setPaymentMethod] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Current user's cart key: cart_USERID
  const getUserCart = () => {
    const token = localStorage.getItem("token");

    if (!token) {
      throw new Error("Please login before checkout");
    }

    try {
      const payload = JSON.parse(
        atob(token.split(".")[1])
      );

      if (!payload.userId) {
        throw new Error("User ID not found in token");
      }

      const cartKey = `cart_${payload.userId}`;
      const cart = JSON.parse(
        localStorage.getItem(cartKey) || "[]"
      );

      if (!Array.isArray(cart) || cart.length === 0) {
        throw new Error("Your cart is empty");
      }

      return cart;
    } catch (error) {
      if (
        error.message === "Your cart is empty" ||
        error.message === "User ID not found in token"
      ) {
        throw error;
      }

      throw new Error("Unable to read your cart. Please login again.");
    }
  };

  const clearUserCart = () => {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      if (payload.userId) {
        localStorage.removeItem(`cart_${payload.userId}`);
      }
    } catch (error) {
      console.error("Unable to clear cart:", error);
    }
  };

  const handlePayment = async () => {
    if (!paymentMethod) {
      alert("Please select payment method");
      return;
    }

    if (loading) return;
    setLoading(true);

    try {
      const token = localStorage.getItem("token");

      if (!token) {
        navigate("/auth");
        return;
      }

      const cart = getUserCart();

      // Backend will calculate prices from MongoDB
      const items = cart.map((item) => ({
        productId: item._id,
        quantity: Number(item.quantity || 1),
      }));

      if (
        items.some(
          (item) =>
            !item.productId ||
            !Number.isInteger(item.quantity) ||
            item.quantity < 1
        )
      ) {
        throw new Error("Invalid cart items. Please update your cart.");
      }

      // Cash on Delivery
      if (paymentMethod === "cod") {
        // IMPORTANT:
        // This endpoint must exist on your backend and must save
        // all cart items as COD orders. See note below.
        const response = await axios.post(
          `${API_URL}/orders/cod`,
          { items },
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
            withCredentials: true,
          }
        );

        clearUserCart();
        alert(response.data.message || "COD order placed successfully");
        navigate("/orders");
        return;
      }

      // Online payment: create Razorpay order using cart items
      const response = await axios.post(
        `${API_URL}/payment/create-order`,
        { items },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          withCredentials: true,
        }
      );

      const { orderId, amount, currency, keyId } = response.data;

      if (!orderId || !keyId || !amount) {
        throw new Error("Invalid Razorpay order response");
      }

      if (!window.Razorpay) {
        throw new Error(
          "Razorpay Checkout is not loaded. Add its script to index.html and refresh."
        );
      }

      const razorpay = new window.Razorpay({
        key: keyId,
        amount,
        currency,
        name: "My E-commerce Store",
        description: "Cart Payment",
        order_id: orderId,

        handler: async (paymentResponse) => {
          try {
            const verification = await axios.post(
              `${API_URL}/payment/verify-payment`,
              {
                razorpay_order_id:
                  paymentResponse.razorpay_order_id,
                razorpay_payment_id:
                  paymentResponse.razorpay_payment_id,
                razorpay_signature:
                  paymentResponse.razorpay_signature,
              },
              {
                headers: {
                  Authorization: `Bearer ${token}`,
                },
                withCredentials: true,
              }
            );

            if (verification.data.success) {
              clearUserCart();
              alert("Payment verified successfully!");
              navigate("/orders");
            } else {
              alert(
                "Payment verification failed. Please contact support before retrying."
              );
            }
          } catch (error) {
            console.error(
              "Verification error:",
              error.response?.data || error.message
            );
            alert(
              "Payment verification failed. Do not retry until your payment status is checked."
            );
          }
        },

        modal: {
          ondismiss: () => {
            console.log("Razorpay checkout closed");
          },
        },

        theme: {
          color: "#3399cc",
        },
      });

      razorpay.on("payment.failed", (event) => {
        console.error("Payment failed:", event.error);
        alert(event.error.description || "Payment failed");
      });

      razorpay.open();
    } catch (error) {
      console.error(
        "Checkout error:",
        error.response?.data || error.message
      );

      alert(
        error.response?.data?.message ||
          error.message ||
          "Payment failed"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="checkout-page">
      <h1>Checkout</h1>
      <h2>Select Payment Method</h2>

      <div>
        <label>
          <input
            type="radio"
            name="payment"
            value="cod"
            checked={paymentMethod === "cod"}
            onChange={(e) => setPaymentMethod(e.target.value)}
          />
          Cash on Delivery
        </label>
      </div>

      <div>
        <label>
          <input
            type="radio"
            name="payment"
            value="razorpay"
            checked={paymentMethod === "razorpay"}
            onChange={(e) => setPaymentMethod(e.target.value)}
          />
          Online Payment (Razorpay)
        </label>
      </div>

      <button onClick={handlePayment} disabled={loading}>
        {loading ? "Please wait..." : "Continue Payment"}
      </button>
    </div>
  );
}

export default Checkout;
 */