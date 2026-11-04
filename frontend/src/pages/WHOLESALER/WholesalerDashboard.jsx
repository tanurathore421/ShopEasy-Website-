
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./WholesalerDashboard.css";

const API = "http://localhost:3000/api/wholesaler";

const initialForm = {
  name: "",
  image: "",
  category: "",
  supplyPrice: "",
  stock: "",
  lowStockThreshold: "5",
};

function WholesalerDashboard() {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  const [section, setSection] = useState("dashboard");
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
  });
  const [products, setProducts] = useState([]);
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  const loadDashboard = async () => {
    try {
      const response = await fetch(`${API}/dashboard`, { headers });
      const data = await response.json();

      if (!response.ok) throw new Error(data.message || "Dashboard error");

      setStats(data.stats);
    } catch (err) {
      setError(err.message);
    }
  };

  const loadProducts = async () => {
    try {
      const response = await fetch(`${API}/products`, { headers });
      const data = await response.json();

      if (!response.ok) throw new Error(data.message || "Products error");

      setProducts(data.products || []);
    } catch (err) {
      setError(err.message);
    }
  };

  const loadProfile = async () => {
    try {
      const response = await fetch(`${API}/profile`, { headers });
      const data = await response.json();

      if (!response.ok) throw new Error(data.message || "Profile error");

      setProfile(data.profile);
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    if (!token) {
      navigate("/login");
      return;
    }

    loadDashboard();
    loadProducts();
    loadProfile();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setError("");
    setLoading(true);

    try {
      const response = await fetch(`${API}/products`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          ...form,
          supplyPrice: Number(form.supplyPrice),
          stock: Number(form.stock),
          lowStockThreshold: Number(form.lowStockThreshold),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Product submission failed");
      }

      setMessage(data.message);
      setForm(initialForm);
      await loadProducts();
      await loadDashboard();
      setSection("products");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    window.dispatchEvent(new Event("login"));
    navigate("/login");
  };

  const changeSection = (value) => {
    setSection(value);
    setMessage("");
    setError("");
  };

  return (
    <div className="wholesaler-layout">
      <aside className="wholesaler-sidebar">
        <div className="wholesaler-brand">
          <h2>ShopEasy</h2>
          <p>Supplier Portal</p>
        </div>

        <nav>
          <button
            className={section === "dashboard" ? "active" : ""}
            onClick={() => changeSection("dashboard")}
          >
            Dashboard
          </button>

          <button
            className={section === "add" ? "active" : ""}
            onClick={() => changeSection("add")}
          >
            Add Product
          </button>

          <button
            className={section === "products" ? "active" : ""}
            onClick={() => changeSection("products")}
          >
            My Products
          </button>

          <button
            className={section === "profile" ? "active" : ""}
            onClick={() => changeSection("profile")}
          >
            My Profile
          </button>
        </nav>

        <button className="wholesaler-logout" onClick={logout}>
          Logout
        </button>
      </aside>

      <main className="wholesaler-main">
        <header className="wholesaler-header">
          <div>
            <h1>
              {section === "dashboard" && "Dashboard"}
              {section === "add" && "Submit New Product"}
              {section === "products" && "My Products"}
              {section === "profile" && "My Profile"}
            </h1>
            <p>Manage your product supply to ShopEasy</p>
          </div>
          <span className="supplier-badge">WHOLESALER</span>
        </header>

        {message && <div className="supplier-success">{message}</div>}
        {error && <div className="supplier-error">{error}</div>}

        {section === "dashboard" && (
          <section>
            <div className="supplier-stat-grid">
              <div className="supplier-stat">
                <span>Total Products</span>
                <strong>{stats.total}</strong>
              </div>
              <div className="supplier-stat">
                <span>Pending Approval</span>
                <strong>{stats.pending}</strong>
              </div>
              <div className="supplier-stat">
                <span>Approved Products</span>
                <strong>{stats.approved}</strong>
              </div>
              <div className="supplier-stat">
                <span>Rejected Products</span>
                <strong>{stats.rejected}</strong>
              </div>
            </div>

            <div className="supplier-welcome">
              <h2>Welcome, {profile?.name || "Wholesaler"}!</h2>
              <p>
                Submit your products for admin review. Once approved,
                they can be published in the customer store.
              </p>
              <button onClick={() => changeSection("add")}>
                + Submit Product
              </button>
            </div>
          </section>
        )}

        {section === "add" && (
          <section className="supplier-panel">
            <h2>Product Information</h2>

            <form onSubmit={handleSubmit} className="supplier-form">
              <label>Product Name</label>
              <input
                required
                value={form.name}
                onChange={(e) =>
                  setForm({ ...form, name: e.target.value })
                }
                placeholder="Enter product name"
              />

              <label>Product Image URL</label>
              <input
                required
                type="url"
                value={form.image}
                onChange={(e) =>
                  setForm({ ...form, image: e.target.value })
                }
                placeholder="https://example.com/image.jpg"
              />

              <label>Category</label>
              <input
                required
                value={form.category}
                onChange={(e) =>
                  setForm({ ...form, category: e.target.value })
                }
                placeholder="Enter category"
              />

              <label>Supply Price (₹)</label>
              <input
                required
                type="number"
                min="0.01"
                step="0.01"
                value={form.supplyPrice}
                onChange={(e) =>
                  setForm({ ...form, supplyPrice: e.target.value })
                }
                placeholder="Your supply price"
              />

              <label>Available Stock</label>
              <input
                required
                type="number"
                min="0"
                step="1"
                value={form.stock}
                onChange={(e) =>
                  setForm({ ...form, stock: e.target.value })
                }
                placeholder="Available quantity"
              />

              <label>Low Stock Alert Quantity</label>
              <input
                type="number"
                min="0"
                step="1"
                value={form.lowStockThreshold}
                onChange={(e) =>
                  setForm({
                    ...form,
                    lowStockThreshold: e.target.value,
                  })
                }
              />

              <button type="submit" disabled={loading}>
                {loading ? "Submitting..." : "Submit for Approval"}
              </button>
            </form>
          </section>
        )}

        {section === "products" && (
          <section className="supplier-panel">
            <h2>Submitted Products</h2>

            {products.length === 0 ? (
              <p>You have not submitted any products yet.</p>
            ) : (
              <div className="supplier-product-list">
                {products.map((product) => (
                  <article className="supplier-product" key={product._id}>
                    <img src={product.image} alt={product.name} />
                    <div className="supplier-product-info">
                      <h3>{product.name}</h3>
                      <p>Category: {product.category}</p>
                      <p>Supply Price: ₹{product.supplyPrice}</p>
                      <p>Stock: {product.stock}</p>
                      <span className={`supplier-status ${product.approvalStatus}`}>
                        {product.approvalStatus}
                      </span>
                      {product.rejectionReason && (
                        <p>Reason: {product.rejectionReason}</p>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}

        {section === "profile" && (
          <section className="supplier-panel">
            <h2>Business Profile</h2>
            {profile ? (
              <div className="supplier-profile">
                <p><strong>Name:</strong> {profile.name}</p>
                <p><strong>Business:</strong> {profile.businessName || "Not provided"}</p>
                <p><strong>Email:</strong> {profile.email}</p>
                <p><strong>Phone:</strong> {profile.phone}</p>
                <p><strong>Address:</strong> {profile.address}</p>
                <p><strong>GST:</strong> {profile.gstNumber || "Not provided"}</p>
              </div>
            ) : (
              <p>Loading profile...</p>
            )}
          </section>
        )}
      </main>
    </div>
  );
}

export default WholesalerDashboard;
