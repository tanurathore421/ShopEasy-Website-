
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

  // Get logged-in user information
  const getUserInfo = () => {
    const token = localStorage.getItem("token");

    if (!token) {
      throw new Error("Please login before checkout");
    }

    try {
      const payload = JSON.parse(
        atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"))
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

  // Get Cart or Buy Now items
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

  // Clear cart only after successful order
  const clearSuccessfulCheckout = (userId, isBuyNow) => {
    if (isBuyNow) {
      localStorage.removeItem(`buynow_${userId}`);
    } else {
      localStorage.removeItem(`cart_${userId}`);
    }
  };

  // Release stock reservation when Razorpay checkout is closed or payment fails
  const releaseReservation = async (orderId, token) => {
    if (!orderId) return;

    try {
      const result = await axios.post(
        `${API_URL}/payment/release-reservation`,
        {
          razorpay_order_id: orderId,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          withCredentials: true,
        }
      );

      console.log("Stock reservation:", result.data.message);
    } catch (error) {
      console.error(
        "Stock release result:",
        error.response?.data || error.message
      );
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
        const result = await axios.post(
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

        alert(result.data.message || "Order placed successfully!");
        navigate("/orders");
        return;
      }

      // Create Razorpay order
      const createOrderResponse = await axios.post(
        `${API_URL}/payment/create-order`,
        { items },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          withCredentials: true,
        }
      );

      const {
        orderId,
        amount,
        currency,
        keyId,
      } = createOrderResponse.data;

      if (!orderId || !keyId || !amount || !currency) {
        throw new Error("Invalid Razorpay order response");
      }

      if (!window.Razorpay) {
        await releaseReservation(orderId, token);

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

        // Verify payment on backend
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

            if (verification.data.paymentRefunded) {
              alert(
                "Payment was received after the stock reservation expired. A full refund has been initiated. No order was placed. Please check stock and try again."
              );
            } else if (verification.data.success) {
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
              error.response?.data?.message ||
                "Payment may have succeeded, but order confirmation failed. Check your payment status before retrying."
            );
          } finally {
            setLoading(false);
          }
        },

        // Release reservation if customer closes checkout
        modal: {
          ondismiss: async () => {
            await releaseReservation(orderId, token);
            setLoading(false);
            console.log("Razorpay checkout closed");
          },
        },

        theme: {
          color: "#3399cc",
        },
      });

      // Handle failed payment
      razorpay.on("payment.failed", async (event) => {
        console.error("Payment failed:", event.error);

        await releaseReservation(orderId, token);

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
