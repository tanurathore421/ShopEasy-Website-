import  { useState } from "react";
import axios from "axios";
import "./checkout.css";

function Checkout() {
  const [paymentMethod, setPaymentMethod] = useState("");

  const handlePayment = async () => {
    if (!paymentMethod) {
      alert("Please select payment method");
      return;
    }

    try {
      if (paymentMethod === "cod") {
        const response = await axios.post(
          "http://localhost:3000/api/orders/create",
          {
            paymentMethod: "COD"
          },
          {
            withCredentials: true
          }
        );

        alert(response.data.message);
        window.location.href = "/orders";
      }

      if (paymentMethod === "razorpay") {
        const response = await axios.post(
          "http://localhost:3000/api/payment/create-order",
          {
            amount: 500
          },
          {
            withCredentials: true
          }
        );

        console.log(response.data);

        // Razorpay checkout code will go here
      }
    } catch (error) {
      console.log(error);
      alert("Payment failed");
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
            onChange={(e) => setPaymentMethod(e.target.value)}
          />
          Online Payment
        </label>
      </div>

      <button onClick={handlePayment}>
        Continue Payment
      </button>

    </div>
  );
}

export default Checkout;