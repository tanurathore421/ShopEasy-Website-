
import  { useCallback, useEffect, useState } from "react";
import "./ManageCustomers.css";

const API_URL = "http://localhost:3000/api/admin/customers";

const formatDate = (date) => {
  if (!date) return "—";

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) return "—";

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(parsedDate);
};

const ManageCustomers = () => {
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const token = localStorage.getItem("token");

  const loadCustomers = useCallback(async () => {
    if (!token) {
      setError("Please log in again using your admin account.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const query = new URLSearchParams({
        limit: "100",
        search: search.trim(),
      });

      const response = await fetch(`${API_URL}?${query.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Could not load customers.");
      }

      setCustomers(data.customers || []);
    } catch (err) {
      setError(err.message || "Could not connect to the server.");
    } finally {
      setLoading(false);
    }
  }, [token, search]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadCustomers();
    }, 250);

    return () => clearTimeout(timer);
  }, [loadCustomers]);

  const toggleStatus = async (customer) => {
    const nextStatus = customer.isActive === false;

    const action = nextStatus ? "activate" : "deactivate";

    if (
      !window.confirm(
        `Are you sure you want to ${action} ${customer.name}'s account?`
      )
    ) {
      return;
    }

    if (!token) {
      setError("Please log in again using your admin account.");
      return;
    }

    setError("");
    setMessage("");
    setUpdatingId(customer._id);

    try {
      const response = await fetch(
        `${API_URL}/${customer._id}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            isActive: nextStatus,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Could not update customer.");
      }

      setMessage(data.message || "Customer status updated.");
      await loadCustomers();
    } catch (err) {
      setError(err.message || "Could not update customer status.");
    } finally {
      setUpdatingId("");
    }
  };

  return (
    <div className="manage-customers">
      <section className="customers-toolbar">
        <div>
          <h2>Registered Customers</h2>
          <p>View customer details and manage account access.</p>
        </div>

        <button
          type="button"
          className="customers-refresh-btn"
          onClick={loadCustomers}
          disabled={loading}
        >
          {loading ? "Loading..." : "Refresh"}
        </button>
      </section>

      <section className="customers-summary">
        <div className="customers-summary-icon">CU</div>
        <div>
          <span>Matching Customers</span>
          <strong>
            {loading ? "—" : customers.length}
          </strong>
        </div>
      </section>

      {error && (
        <div className="customers-alert customers-error" role="alert">
          {error}
        </div>
      )}

      {message && (
        <div className="customers-alert customers-success" role="status">
          {message}
        </div>
      )}

      <section className="customers-table-card">
        <div className="customers-table-heading">
          <div>
            <h3>Customer Directory</h3>
            <p>Search and manage existing accounts.</p>
          </div>

          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search name, email or phone..."
            aria-label="Search customers"
          />
        </div>

        {loading ? (
          <div className="customers-empty">
            Loading customer records...
          </div>
        ) : customers.length === 0 ? (
          <div className="customers-empty">
            {search.trim()
              ? "No customers match your search."
              : "No customer accounts found."}
          </div>
        ) : (
          <div className="customers-table-wrapper">
            <table className="customers-table">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Contact</th>
                  <th>Address</th>
                  <th>Registered</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {customers.map((customer) => {
                  const active = customer.isActive !== false;

                  return (
                    <tr key={customer._id}>
                      <td>
                        <div className="customer-identity">
                          <div className="customer-avatar">
                            {(customer.name || "C")
                              .trim()
                              .charAt(0)
                              .toUpperCase()}
                          </div>
                          <strong>{customer.name || "Unnamed"}</strong>
                        </div>
                      </td>

                      <td>
                        <div className="customer-contact">
                          <span>{customer.email}</span>
                          <span>{customer.phone}</span>
                        </div>
                      </td>

                      <td className="customer-address">
                        {customer.address || "—"}
                      </td>

                      <td>{formatDate(customer.createdAt)}</td>

                      <td>
                        <span
                          className={`customer-status ${
                            active ? "status-active" : "status-inactive"
                          }`}
                        >
                          {active ? "Active" : "Inactive"}
                        </span>
                      </td>

                      <td>
                        <button
                          type="button"
                          className={
                            active
                              ? "customer-deactivate-btn"
                              : "customer-activate-btn"
                          }
                          onClick={() => toggleStatus(customer)}
                          disabled={updatingId === customer._id}
                        >
                          {updatingId === customer._id
                            ? "Updating..."
                            : active
                              ? "Deactivate"
                              : "Activate"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};

export default ManageCustomers;
