
import React, { useCallback, useEffect, useState } from "react";
import "./ManageOrders.css";

const API_URL = "http://localhost:3000/api/admin/orders";

const ORDER_STATUSES = [
  "Pending",
  "Processing",
  "Shipped",
  "Delivered",
  "Cancelled",
];

const formatCurrency = (amount) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(amount) || 0);

const formatDate = (date) => {
  if (!date) return "—";

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) return "—";

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(parsedDate);
};

const ManageOrders = () => {
  const [orders, setOrders] = useState([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const token = localStorage.getItem("token");

  const loadOrders = useCallback(
    async (signal) => {
      if (!token) {
        setError("Please log in again with your admin account.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");

      try {
        const params = new URLSearchParams({
          page: String(page),
          limit: "10",
          status,
          search: search.trim(),
        });

        const response = await fetch(`${API_URL}?${params.toString()}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          signal,
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Could not load orders.");
        }

        setOrders(data.orders || []);
        setTotal(data.total || 0);
        setPages(data.pages || 0);
      } catch (err) {
        if (err.name !== "AbortError") {
          setError(err.message || "Could not connect to the server.");
        }
      } finally {
        if (!signal?.aborted) {
          setLoading(false);
        }
      }
    },
    [token, page, status, search]
  );

  useEffect(() => {
    const controller = new AbortController();

    const timer = setTimeout(() => {
      loadOrders(controller.signal);
    }, 250);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [loadOrders]);

  const handleSearchChange = (event) => {
    setSearch(event.target.value);
    setPage(1);
  };

  const handleStatusFilter = (event) => {
    setStatus(event.target.value);
    setPage(1);
  };

  const handleStatusUpdate = async (order, newStatus) => {
    if (order.status === newStatus) return;

    if (
      newStatus === "Cancelled" &&
      !window.confirm(`Cancel order ${order._id}?`)
    ) {
      return;
    }

    if (!token) {
      setError("Please log in again with your admin account.");
      return;
    }

    setError("");
    setMessage("");
    setUpdatingId(order._id);

    try {
      const response = await fetch(`${API_URL}/${order._id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Could not update order status.");
      }

      setOrders((previous) =>
        previous.map((item) =>
          item._id === order._id
            ? { ...item, status: newStatus }
            : item
        )
      );

      setMessage(`Order status updated to ${newStatus}.`);
    } catch (err) {
      setError(err.message || "Could not update order status.");
    } finally {
      setUpdatingId("");
    }
  };

  return (
    <div className="manage-orders">
      <section className="orders-toolbar">
        <div>
          <h2>Order Management</h2>
          <p>Review orders and manage fulfilment status.</p>
        </div>

        <button
          type="button"
          className="orders-refresh-btn"
          onClick={() => loadOrders()}
          disabled={loading}
        >
          {loading ? "Loading..." : "Refresh Orders"}
        </button>
      </section>

      <section className="orders-summary-grid">
        <article className="orders-summary-card">
          <span className="orders-summary-label">Matching Orders</span>
          <strong>{loading ? "—" : total}</strong>
          <span className="orders-summary-caption">
            Current search and filter
          </span>
        </article>

        <article className="orders-summary-card">
          <span className="orders-summary-label">Orders on This Page</span>
          <strong>{loading ? "—" : orders.length}</strong>
          <span className="orders-summary-caption">
            Maximum 10 per page
          </span>
        </article>
      </section>

      {error && (
        <div className="orders-alert orders-error" role="alert">
          {error}
        </div>
      )}

      {message && (
        <div className="orders-alert orders-success" role="status">
          {message}
        </div>
      )}

      <section className="orders-table-card">
        <div className="orders-filter-bar">
          <input
            type="search"
            value={search}
            onChange={handleSearchChange}
            placeholder="Search order ID, customer or product..."
            aria-label="Search orders"
          />

          <select
            value={status}
            onChange={handleStatusFilter}
            aria-label="Filter orders by status"
          >
            <option value="all">All statuses</option>
            {ORDER_STATUSES.map((item) => (
              <option value={item} key={item}>
                {item}
              </option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="orders-empty">Loading orders...</div>
        ) : orders.length === 0 ? (
          <div className="orders-empty">
            No orders match your filters.
          </div>
        ) : (
          <div className="orders-table-wrapper">
            <table className="orders-table">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Customer</th>
                  <th>Product</th>
                  <th>Quantity</th>
                  <th>Total</th>
                  <th>Order Date</th>
                  <th>Status</th>
                </tr>
              </thead>

              <tbody>
                {orders.map((order) => (
                  <tr key={order._id}>
                    <td>
                      <div className="order-id-cell">
                        <strong>#{order._id.slice(-8).toUpperCase()}</strong>
                        <small title={order._id}>{order._id}</small>
                      </div>
                    </td>

                    <td>
                      <div className="order-customer-cell">
                        <strong>
                          {order.userId?.name || "Customer unavailable"}
                        </strong>
                        <span>{order.userId?.email || "—"}</span>
                        <span>{order.userId?.phone || ""}</span>
                      </div>
                    </td>

                    <td>
                      <div className="order-product-cell">
                        <strong>
                          {order.productId?.name || "Product unavailable"}
                        </strong>
                        {order.productId?.category && (
                          <span>{order.productId.category}</span>
                        )}
                      </div>
                    </td>

                    <td>{order.quantity}</td>

                    <td className="order-amount">
                      {formatCurrency(order.totalAmount)}
                    </td>

                    <td className="order-date">
                      {formatDate(order.orderDate || order.createdAt)}
                    </td>

                    <td>
                      <div className="order-status-cell">
                        <span
                          className={`order-status-badge status-${(
                            order.status || "Pending"
                          )
                            .toLowerCase()
                            .replace(/\s+/g, "-")}`}
                        >
                          {order.status || "Pending"}
                        </span>

                        <select
                          value={order.status || "Pending"}
                          onChange={(event) =>
                            handleStatusUpdate(order, event.target.value)
                          }
                          disabled={updatingId === order._id}
                          aria-label={`Update status for order ${order._id}`}
                        >
                          {ORDER_STATUSES.map((item) => (
                            <option value={item} key={item}>
                              {item}
                            </option>
                          ))}
                        </select>

                        {updatingId === order._id && (
                          <small>Saving...</small>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="orders-pagination">
          <span>
            {total === 0
              ? "No results"
              : `Page ${page} of ${pages} · ${total} orders`}
          </span>

          <div>
            <button
              type="button"
              onClick={() => setPage((previous) => Math.max(1, previous - 1))}
              disabled={loading || page <= 1}
            >
              Previous
            </button>

            <button
              type="button"
              onClick={() =>
                setPage((previous) => Math.min(pages, previous + 1))
              }
              disabled={loading || page >= pages || pages === 0}
            >
              Next
            </button>
          </div>
        </div>
      </section>

      <p className="orders-help-note">
        If a customer or product is shown as unavailable, its reference
        could not be resolved from the database. The order record is still
        displayed so the admin can review its amount and status.
      </p>
    </div>
  );
};

export default ManageOrders;
