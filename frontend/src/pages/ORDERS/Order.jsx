import { useEffect, useState } from "react";
import axios from "axios";
import "./Order.css";
import { useNavigate } from "react-router-dom";

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();

  const fetchOrders = async () => {
    const token = localStorage.getItem("token");

    if (!token) {
      navigate("/auth");
      return;
    }

    try {
      const response = await axios.get(
        "http://localhost:3000/api/orders/orders",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          withCredentials: true,
        }
      );

      console.log("ORDERS:", response.data);

      setOrders(response.data.orders || []);
    } catch (error) {
      console.error(
        "ORDERS ERROR:",
        error.response?.data || error.message
      );

      if (error.response?.status === 401) {
        localStorage.removeItem("token");

        window.dispatchEvent(
          new Event("logout")
        );

        navigate("/auth");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [navigate]);

  const cancelOrder = async (orderId) => {
    const token = localStorage.getItem("token");

    if (!token) {
      navigate("/auth");
      return;
    }

    const confirmed = window.confirm(
      "Are you sure you want to cancel this order?"
    );

    if (!confirmed) {
      return;
    }

    try {
      await axios.put(
        `http://localhost:3000/api/orders/${orderId}/cancel`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          withCredentials: true,
        }
      );

      setOrders((prevOrders) =>
        prevOrders.map((order) =>
          order._id === orderId
            ? {
                ...order,
                status: "Cancelled",
              }
            : order
        )
      );
    } catch (error) {
      console.error(
        "CANCEL ERROR:",
        error.response?.data || error.message
      );

      alert(
        error.response?.data?.message ||
          "Failed to cancel order"
      );
    }
  };

  const removeOrder = async (orderId) => {
    const token = localStorage.getItem("token");

    if (!token) {
      navigate("/auth");
      return;
    }

    const confirmed = window.confirm(
      "Are you sure you want to remove this order?"
    );

    if (!confirmed) {
      return;
    }

    try {
      await axios.delete(
        `http://localhost:3000/api/orders/remove/${orderId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          withCredentials: true,
        }
      );

      // Remove immediately from UI
      setOrders((prevOrders) =>
        prevOrders.filter(
          (order) => order._id !== orderId
        )
      );
    } catch (error) {
      console.error(
        "REMOVE ERROR:",
        error.response?.data || error.message
      );

      alert(
        error.response?.data?.message ||
          "Failed to remove order"
      );
    }
  };

  if (loading) {
    return (
      <div className="orders-page">
        <h1>My Orders</h1>
        <p>Loading orders...</p>
      </div>
    );
  }

  const grandTotal = orders.reduce(
    (total, order) => {
      const price = order.productId?.price || 0;
      const quantity = order.quantity || 0;

      return total + price * quantity;
    },
    0
  );

  return (
    <div className="orders-page">

      <h1>My Orders</h1>

      {orders.length === 0 ? (
        <div className="no-orders">
          <h2>No orders yet</h2>

          <p>
            Your previous orders will appear here.
          </p>
        </div>
      ) : (
        <>
          <div className="orders-list">

            {orders.map((order) => {
              const product = order.productId;

              const orderTotal =
                (product?.price || 0) *
                (order.quantity || 0);

              return (
                <div
                  className="order-card"
                  key={order._id}
                >

                  {product?.image && (
                    <img
                      src={product.image}
                      alt={product.name}
                      className="order-image"
                    />
                  )}

                  <div className="order-details">

                    <h2>
                      {product?.name || "Product"}
                    </h2>

                    <p>
                      <strong>Price:</strong>{" "}
                      ₹ {product?.price || 0}
                    </p>

                    <p>
                      <strong>Quantity:</strong>{" "}
                      {order.quantity}
                    </p>

                    <p>
                      <strong>Total:</strong>{" "}
                      ₹ {orderTotal}
                    </p>

                    <p>
                      <strong>Status:</strong>{" "}
                      <span className="status">
                        {order.status || "Pending"}
                      </span>
                    </p>

                    {order.status !== "Cancelled" &&
                      order.status !== "Shipped" &&
                      order.status !== "Delivered" && (
                        <button
                          className="cancel-order-btn"
                          onClick={() =>
                            cancelOrder(order._id)
                          }
                        >
                          Cancel Order
                        </button>
                      )}

                    {order.status !== "Shipped" &&
                      order.status !== "Delivered" && (
                        <button
                          className="cancel-order-btn"
                          onClick={() =>
                            removeOrder(order._id)
                          }
                        >
                          Remove Order
                        </button>
                      )}

                    <p>
                      <strong>Order ID:</strong>{" "}
                      {order._id}
                    </p>

                    <p>
                      <strong>Ordered on:</strong>{" "}
                      {order.orderDate
                        ? new Date(
                            order.orderDate
                          ).toLocaleDateString()
                        : "Date unavailable"}
                    </p>

                  </div>
                </div>
              );
            })}

          </div>

          <div className="grand-total">
            <h2>Total Bill</h2>

            <h3>
              ₹ {grandTotal}
            </h3>
          </div>
        </>
      )}

    </div>
  );
};

export default Orders;
