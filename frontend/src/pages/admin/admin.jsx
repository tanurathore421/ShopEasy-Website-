import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import ManageWholesalers from "./ManageWholesalers";
import ManageCustomers from "./ManageCustomers";
import ManageOrders from "./ManageOrders";
import ManageProducts from "./ManageProducts";
import "./admin.css";

const API_URL = "http://localhost:3000/api/admin/dashboard";

const initialStats = {
  totalProducts: 0,
  totalOrders: 0,
  totalCustomers: 0,
  totalWholesalers: 0,
  activeWholesalers: 0,
  pendingOrders: 0,
  deliveredRevenue: 0,
};

const formatNumber = (value) =>
  new Intl.NumberFormat("en-IN").format(Number(value) || 0);

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);

const AdminDashboard = () => {
  const navigate = useNavigate();

  const [activeSection, setActiveSection] = useState("overview");
  const [stats, setStats] = useState(initialStats);
  const [loading, setLoading] = useState(true);
  const [dashboardError, setDashboardError] = useState("");

  const token = localStorage.getItem("token");
  const storedRole = localStorage.getItem("role");

  const loadDashboard = useCallback(async () => {
    if (!token) {
      setDashboardError("Please log in to access the admin dashboard.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setDashboardError("");

    try {
      const response = await fetch(API_URL, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to load dashboard statistics.");
      }

      setStats({
        ...initialStats,
        ...(data.stats || {}),
      });
    } catch (error) {
      setDashboardError(error.message || "Could not connect to the backend.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (activeSection === "overview") {
      loadDashboard();
    }
  }, [activeSection, loadDashboard]);

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    navigate("/login", { replace: true });
  };

  const openSection = (section) => {
  
    setActiveSection(section);
  };

  const pageDetails = {
    overview: {
      title: "Dashboard Overview",
      description: "Monitor your store and business operations.",
    },
    wholesalers: {
      title: "Wholesaler Management",
      description: "Create and manage wholesale business accounts.",
    },
    customers: {
      title: "Customer Management",
      description: "Customer account administration.",
    },
    orders: {
      title: "Order Management",
      description: "Review orders and manage fulfilment status.",
    },
    products: {
  title: "Product Management",
  description: "Manage your store catalog and product availability.",
},
  };

  if (storedRole && storedRole !== "admin") {
    return (
      <div className="admin-access-denied">
        <div className="admin-access-denied-card">
          <div className="admin-brand-mark">SS</div>
          <h1>Administrator Access Required</h1>
          <p>
            This area is restricted to authorized administrators. Please log in
            using your admin account.
          </p>
          <button onClick={() => navigate("/login")}>Go to Login</button>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-dashboard">
      <aside className="admin-sidebar">
        <div className="admin-brand">
          <div className="admin-brand-mark">SS</div>
          <div>
            <h2>Store Admin</h2>
            <p>Management Console</p>
          </div>
        </div>

        <div className="admin-menu-label">WORKSPACE</div>

        <nav className="admin-nav">
          <button
            className={activeSection === "overview" ? "active" : ""}
            onClick={() => openSection("overview")}
          >
            <span className="admin-nav-mark">OV</span>
            Dashboard
          </button>

          <button onClick={() => openSection("products")}>
            <span className="admin-nav-mark">PR</span>
            Products
            <span className="admin-nav-arrow">↗</span>
          </button>

          <button onClick={() => openSection("orders")}>
            <span className="admin-nav-mark">OR</span>
            Orders
            <span className="admin-nav-arrow">↗</span>
          </button>

          <button
            className={activeSection === "customers" ? "active" : ""}
            onClick={() => openSection("customers")}
          >
            <span className="admin-nav-mark">CU</span>
            Customers
          </button>

          <button
            className={activeSection === "wholesalers" ? "active" : ""}
            onClick={() => openSection("wholesalers")}
          >
            <span className="admin-nav-mark">WH</span>
            Wholesalers
            <span className="admin-nav-count">
              {formatNumber(stats.totalWholesalers)}
            </span>
          </button>
        </nav>

        <div className="admin-sidebar-bottom">
          <div className="admin-user-card">
            <div className="admin-avatar">A</div>
            <div className="admin-user-info">
              <strong>Administrator</strong>
              <span>Full store access</span>
            </div>
            <span className="admin-online-dot" />
          </div>

          <button className="admin-logout-btn" onClick={logout}>
            <span className="admin-nav-mark">EX</span>
            Sign Out
          </button>
        </div>
      </aside>

      <main className="admin-main">
        <header className="admin-topbar">
          <div className="admin-breadcrumb">
            <span>Store Management</span>
            <span className="breadcrumb-separator">/</span>
            <strong>{pageDetails[activeSection]?.title || "Dashboard"}</strong>
          </div>

          <div className="admin-topbar-right">
            <span className="admin-role-badge">ADMINISTRATOR</span>
            <div className="admin-top-avatar">A</div>
          </div>
        </header>

        <div className="admin-content">
          <section className="admin-page-heading">
            <div>
              <p className="admin-eyebrow">YOUR STORE AT A GLANCE</p>
              <h1>{pageDetails[activeSection]?.title || "Dashboard"}</h1>
              <p className="admin-page-description">
                {pageDetails[activeSection]?.description || ""}
              </p>
            </div>

            {activeSection === "overview" && (
              <button
                className="admin-primary-btn"
                onClick={() => openSection("wholesalers")}
              >
                + Add Wholesaler
              </button>
            )}
          </section>

          {activeSection === "overview" && (
            <>
              {dashboardError && (
                <div className="admin-alert admin-alert-error" role="alert">
                  <div>
                    <strong>Dashboard data unavailable</strong>
                    <p>{dashboardError}</p>
                  </div>
                  <button onClick={loadDashboard}>Retry</button>
                </div>
              )}

              <section className="admin-stats-grid">
                <article className="admin-stat-card">
                  <div className="admin-stat-top">
                    <span className="admin-stat-symbol symbol-blue">PR</span>
                    <span className="admin-stat-caption">CATALOG</span>
                  </div>
                  <p>Total Products</p>
                  <h2>{loading ? "—" : formatNumber(stats.totalProducts)}</h2>
                  <button onClick={() => openSection("products")}>
                    Manage products <span>→</span>
                  </button>
                </article>

                <article className="admin-stat-card">
                  <div className="admin-stat-top">
                    <span className="admin-stat-symbol symbol-violet">OR</span>
                    <span className="admin-stat-caption">FULFILMENT</span>
                  </div>
                  <p>Total Orders</p>
                  <h2>{loading ? "—" : formatNumber(stats.totalOrders)}</h2>
                  <button onClick={() => openSection("orders")}>
                    View orders <span>→</span>
                  </button>
                </article>

                <article className="admin-stat-card">
                  <div className="admin-stat-top">
                    <span className="admin-stat-symbol symbol-teal">CU</span>
                    <span className="admin-stat-caption">CUSTOMERS</span>
                  </div>
                  <p>Registered Customers</p>
                  <h2>{loading ? "—" : formatNumber(stats.totalCustomers)}</h2>
                  <button onClick={() => openSection("customers")}>
                    Customer management <span>→</span>
                  </button>
                </article>

                <article className="admin-stat-card">
                  <div className="admin-stat-top">
                    <span className="admin-stat-symbol symbol-amber">PD</span>
                    <span className="admin-stat-caption">ACTION REQUIRED</span>
                  </div>
                  <p>Pending Orders</p>
                  <h2>{loading ? "—" : formatNumber(stats.pendingOrders)}</h2>
                  <button onClick={() => openSection("orders")}>
                    Review orders <span>→</span>
                  </button>
                </article>

                <article className="admin-stat-card admin-stat-wholesaler">
                  <div className="admin-stat-top">
                    <span className="admin-stat-symbol symbol-green">WH</span>
                    <span className="admin-stat-caption">B2B ACCOUNTS</span>
                  </div>
                  <p>Total Wholesalers</p>
                  <h2>
                    {loading ? "—" : formatNumber(stats.totalWholesalers)}
                  </h2>
                  <div className="admin-stat-foot">
                    {loading
                      ? "Loading account status"
                      : `${formatNumber(stats.activeWholesalers)} active accounts`}
                  </div>
                  <button onClick={() => openSection("wholesalers")}>
                    Manage wholesalers <span>→</span>
                  </button>
                </article>

                <article className="admin-stat-card">
                  <div className="admin-stat-top">
                    <span className="admin-stat-symbol symbol-rose">₹</span>
                    <span className="admin-stat-caption">COMPLETED SALES</span>
                  </div>
                  <p>Delivered Revenue</p>
                  <h2 className="admin-revenue-value">
                    {loading ? "—" : formatCurrency(stats.deliveredRevenue)}
                  </h2>
                  <div className="admin-stat-foot">
                    Revenue from delivered orders
                  </div>
                  <button onClick={() => openSection("orders")}>
                    Review orders <span>→</span>
                  </button>
                </article>
              </section>

              <section className="admin-overview-bottom">
                <div className="admin-panel admin-welcome-panel">
                  <div className="admin-panel-heading">
                    <div>
                      <p className="admin-eyebrow">MANAGEMENT CENTER</p>
                      <h2>Welcome to your store</h2>
                    </div>
                    <span className="admin-panel-mark">SS</span>
                  </div>

                  <p>
                    Manage your product catalog, monitor orders, and control
                    customer and wholesaler accounts from one place.
                  </p>

                  <div className="admin-quick-actions">
                    <button onClick={() => openSection("wholesalers")}>
                      <span className="quick-action-mark">WH</span>
                      <span>
                        <strong>Wholesalers</strong>
                        <small>Add or manage B2B accounts</small>
                      </span>
                      <b>→</b>
                    </button>

                    <button onClick={() => openSection("products")}>
                      <span className="quick-action-mark">PR</span>
                      <span>
                        <strong>Products</strong>
                        <small>Open your product catalog</small>
                      </span>
                      <b>→</b>
                    </button>

                    <button onClick={() => openSection("orders")}>
                      <span className="quick-action-mark">OR</span>
                      <span>
                        <strong>Orders</strong>
                        <small>Review order records</small>
                      </span>
                      <b>→</b>
                    </button>
                  </div>
                </div>

                <div className="admin-panel admin-summary-panel">
                  <div className="admin-panel-heading">
                    <div>
                      <p className="admin-eyebrow">WHOLESALER STATUS</p>
                      <h2>Business Accounts</h2>
                    </div>
                  </div>

                  <div className="admin-status-row">
                    <span className="admin-status-dot active-dot" />
                    <span>Active accounts</span>
                    <strong>
                      {loading ? "—" : formatNumber(stats.activeWholesalers)}
                    </strong>
                  </div>

                  <div className="admin-status-row">
                    <span className="admin-status-dot inactive-dot" />
                    <span>Inactive accounts</span>
                    <strong>
                      {loading
                        ? "—"
                        : formatNumber(
                            Math.max(
                              0,
                              stats.totalWholesalers - stats.activeWholesalers,
                            ),
                          )}
                    </strong>
                  </div>

                  <div className="admin-summary-note">
                    Account access can be managed from the Wholesalers section.
                  </div>

                  <button
                    className="admin-outline-btn"
                    onClick={() => openSection("wholesalers")}
                  >
                    Open Wholesaler Management
                  </button>
                </div>
              </section>
            </>
          )}

          {activeSection === "wholesalers" && <ManageWholesalers />}
          {activeSection === "customers" && <ManageCustomers />}
          {activeSection === "orders" && <ManageOrders />}
          {activeSection === "products" && <ManageProducts />}
        </div>

        <footer className="admin-footer">
          <span>Store Admin Console</span>
          <span>Protected administration area</span>
        </footer>
      </main>
    </div>
  );
};

export default AdminDashboard;
