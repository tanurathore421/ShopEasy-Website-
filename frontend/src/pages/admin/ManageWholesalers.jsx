
import React, { useCallback, useEffect, useState } from "react";
import "./ManageWholesalers.css";

const API_URL = "http://localhost:3000/api/admin/wholesalers";

const emptyForm = {
  name: "",
  email: "",
  password: "",
  phone: "",
  address: "",
  businessName: "",
  gstNumber: "",
};

const ManageWholesalers = () => {
  const [wholesalers, setWholesalers] = useState([]);
  const [form, setForm] = useState({ ...emptyForm });
  const [editingId, setEditingId] = useState(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const token = localStorage.getItem("token");

  const loadWholesalers = useCallback(async () => {
    if (!token) {
      setError("Please log in again with your admin account.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${API_URL}?limit=100`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Could not load wholesalers.");
      }

      setWholesalers(data.wholesalers || []);
    } catch (err) {
      setError(err.message || "Could not connect to the server.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadWholesalers();
  }, [loadWholesalers]);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const resetForm = () => {
    setForm({ ...emptyForm });
    setEditingId(null);
    setError("");
    setMessage("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");
    setMessage("");

    if (!token) {
      setError("Please log in again with your admin account.");
      return;
    }

    setSaving(true);

    try {
      const payload = { ...form };

      if (editingId) {
        // Password and role cannot be changed through this form.
        delete payload.password;
      }

      const response = await fetch(
        editingId ? `${API_URL}/${editingId}` : API_URL,
        {
          method: editingId ? "PUT" : "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Could not save wholesaler.");
      }

      setMessage(
        editingId
          ? "Wholesaler details updated successfully."
          : "Wholesaler created successfully."
      );

      setForm({ ...emptyForm });
      setEditingId(null);

      await loadWholesalers();
    } catch (err) {
      setError(err.message || "Could not save wholesaler.");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (wholesaler) => {
    setEditingId(wholesaler._id);

    setForm({
      name: wholesaler.name || "",
      email: wholesaler.email || "",
      password: "",
      phone: wholesaler.phone || "",
      address: wholesaler.address || "",
      businessName: wholesaler.businessName || "",
      gstNumber: wholesaler.gstNumber || "",
    });

    setError("");
    setMessage("");

    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleStatusToggle = async (wholesaler) => {
    const newStatus = !wholesaler.isActive;

    if (
      !window.confirm(
        `Are you sure you want to ${
          newStatus ? "activate" : "deactivate"
        } ${wholesaler.name}?`
      )
    ) {
      return;
    }

    setError("");
    setMessage("");

    try {
      const response = await fetch(
        `${API_URL}/${wholesaler._id}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            isActive: newStatus,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Could not update account status.");
      }

      setMessage(data.message || "Account status updated.");
      await loadWholesalers();
    } catch (err) {
      setError(err.message || "Could not update account status.");
    }
  };

  const filteredWholesalers = wholesalers.filter((wholesaler) => {
    const query = search.trim().toLowerCase();

    if (!query) return true;

    return [
      wholesaler.name,
      wholesaler.email,
      wholesaler.businessName,
      wholesaler.phone,
    ].some((value) => value?.toLowerCase().includes(query));
  });

  return (
    <div className="manage-wholesalers">
      <div className="wholesaler-page-header">
        <div>
          <h1>Manage Wholesalers</h1>
          <p>Add and manage wholesale business accounts.</p>
        </div>

        <button
          type="button"
          className="wholesaler-refresh-btn"
          onClick={loadWholesalers}
          disabled={loading}
        >
          {loading ? "Loading..." : "Refresh List"}
        </button>
      </div>

      {error && (
        <div className="wholesaler-alert error-alert" role="alert">
          {error}
        </div>
      )}

      {message && (
        <div className="wholesaler-alert success-alert" role="status">
          {message}
        </div>
      )}

      <section className="wholesaler-form-card">
        <h2>
          {editingId ? "Edit Wholesaler" : "Add New Wholesaler"}
        </h2>

        <form onSubmit={handleSubmit}>
          <div className="wholesaler-form-grid">
            <label>
              Contact Person Name *
              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                required
                maxLength={100}
                placeholder="Enter contact person's name"
              />
            </label>

            <label>
              Business Name *
              <input
                type="text"
                name="businessName"
                value={form.businessName}
                onChange={handleChange}
                required
                maxLength={150}
                placeholder="Enter business name"
              />
            </label>

            <label>
              Email Address *
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                required
                placeholder="wholesaler@example.com"
              />
            </label>

            {!editingId && (
              <label>
                Initial Password *
                <input
                  type="password"
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  required
                  minLength={8}
                  autoComplete="new-password"
                  placeholder="At least 8 characters"
                />
              </label>
            )}

            <label>
              Phone Number *
              <input
                type="tel"
                name="phone"
                value={form.phone}
                onChange={handleChange}
                required
                maxLength={20}
                placeholder="Enter phone number"
              />
            </label>

            <label>
              GST Number
              <input
                type="text"
                name="gstNumber"
                value={form.gstNumber}
                onChange={handleChange}
                maxLength={20}
                placeholder="Optional"
              />
            </label>

            <label className="full-width-field">
              Business Address *
              <textarea
                name="address"
                value={form.address}
                onChange={handleChange}
                required
                rows={3}
                maxLength={500}
                placeholder="Enter complete business address"
              />
            </label>
          </div>

          <div className="wholesaler-form-actions">
            <button type="submit" disabled={saving}>
              {saving
                ? "Saving..."
                : editingId
                  ? "Update Wholesaler"
                  : "Add Wholesaler"}
            </button>

            {editingId && (
              <button
                type="button"
                className="wholesaler-cancel-btn"
                onClick={resetForm}
                disabled={saving}
              >
                Cancel Edit
              </button>
            )}
          </div>
        </form>
      </section>

      <section className="wholesaler-list-card">
        <div className="wholesaler-list-header">
          <div>
            <h2>Wholesaler Accounts</h2>
            <p>{filteredWholesalers.length} account(s) displayed</p>
          </div>

          <input
            type="search"
            className="wholesaler-search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search name, email, business..."
            aria-label="Search wholesalers"
          />
        </div>

        {loading ? (
          <p className="wholesaler-empty-state">Loading wholesalers...</p>
        ) : filteredWholesalers.length === 0 ? (
          <p className="wholesaler-empty-state">
            {search
              ? "No wholesalers match your search."
              : "No wholesaler accounts found. Add your first wholesaler above."}
          </p>
        ) : (
          <div className="wholesaler-table-wrapper">
            <table className="wholesaler-table">
              <thead>
                <tr>
                  <th>Contact Person</th>
                  <th>Business</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {filteredWholesalers.map((wholesaler) => (
                  <tr key={wholesaler._id}>
                    <td>{wholesaler.name}</td>
                    <td>{wholesaler.businessName || "—"}</td>
                    <td>{wholesaler.email}</td>
                    <td>{wholesaler.phone}</td>
                    <td>
                      <span
                        className={`wholesaler-status ${
                          wholesaler.isActive ? "active" : "inactive"
                        }`}
                      >
                        {wholesaler.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td>
                      <div className="wholesaler-row-actions">
                        <button
                          type="button"
                          className="edit-wholesaler-btn"
                          onClick={() => handleEdit(wholesaler)}
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          className={
                            wholesaler.isActive
                              ? "deactivate-wholesaler-btn"
                              : "activate-wholesaler-btn"
                          }
                          onClick={() => handleStatusToggle(wholesaler)}
                        >
                          {wholesaler.isActive ? "Deactivate" : "Activate"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};

export default ManageWholesalers;
