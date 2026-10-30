
import React, { useCallback, useEffect, useState } from "react";
import "./ManageProducts.css";

const API_URL = "http://localhost:3000/api/admin/products";
const INVENTORY_URL = "http://localhost:3000/api/admin/inventory/summary";

const emptyForm = {
  image: "",
  name: "",
  price: "",
  category: "",
  stock: "0",
  lowStockThreshold: "5",
};

const initialInventory = {
  totalProducts: 0,
  totalStock: 0,
  lowStockProducts: 0,
  outOfStockProducts: 0,
};

const ManageProducts = () => {
  const [products, setProducts] = useState([]);
  const [inventory, setInventory] = useState(initialInventory);

  const [form, setForm] = useState({ ...emptyForm });
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(0);
  const [total, setTotal] = useState(0);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [updatingId, setUpdatingId] = useState("");

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const token = localStorage.getItem("token");

  const loadProducts = useCallback(
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
          search: search.trim(),
          status,
        });

        const [productResponse, inventoryResponse] = await Promise.all([
          fetch(`${API_URL}?${params.toString()}`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
            signal,
          }),

          fetch(INVENTORY_URL, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
            signal,
          }),
        ]);

        const productData = await productResponse.json();
        const inventoryData = await inventoryResponse.json();

        if (!productResponse.ok) {
          throw new Error(
            productData.message || "Could not load products."
          );
        }

        setProducts(productData.products || []);
        setTotal(productData.total || 0);
        setPages(productData.pages || 0);

        if (inventoryResponse.ok) {
          setInventory({
            ...initialInventory,
            ...(inventoryData.inventory || {}),
          });
        }
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
    [token, page, search, status]
  );

  useEffect(() => {
    const controller = new AbortController();

    const timer = setTimeout(() => {
      loadProducts(controller.signal);
    }, 250);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [loadProducts]);

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
    setShowForm(false);
    setError("");
  };

  const openAddForm = () => {
    resetForm();
    setMessage("");
    setShowForm(true);
  };

  const handleEdit = (product) => {
    setForm({
      image: product.image || "",
      name: product.name || "",
      price: String(product.price ?? ""),
      category: product.category || "",
      stock: String(product.stock ?? 0),
      lowStockThreshold: String(product.lowStockThreshold ?? 5),
    });

    setEditingId(product._id);
    setShowForm(true);
    setError("");
    setMessage("");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");
    setMessage("");

    if (!token) {
      setError("Please log in again with your admin account.");
      return;
    }

    const price = Number(form.price);
    const stock = Number(form.stock);
    const lowStockThreshold = Number(form.lowStockThreshold);

    if (!Number.isFinite(price) || price < 0) {
      setError("Please enter a valid product price.");
      return;
    }

    if (!Number.isSafeInteger(stock) || stock < 0) {
      setError("Stock must be a non-negative whole number.");
      return;
    }

    if (
      !Number.isSafeInteger(lowStockThreshold) ||
      lowStockThreshold < 0
    ) {
      setError("Low stock threshold must be a non-negative whole number.");
      return;
    }

    setSaving(true);

    try {
      const response = await fetch(
        editingId ? `${API_URL}/${editingId}` : API_URL,
        {
          method: editingId ? "PUT" : "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            image: form.image.trim(),
            name: form.name.trim(),
            price,
            category: form.category.trim(),
            stock,
            lowStockThreshold,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Could not save product.");
      }

      setMessage(
        editingId
          ? "Product and stock updated successfully."
          : "Product added successfully."
      );

      setForm({ ...emptyForm });
      setEditingId(null);
      setShowForm(false);
      setPage(1);

      await loadProducts();
    } catch (err) {
      setError(err.message || "Could not save product.");
    } finally {
      setSaving(false);
    }
  };

  const handleStatusToggle = async (product) => {
    const nextStatus = product.isActive === false;

    if (
      !window.confirm(
        `Are you sure you want to ${
          nextStatus ? "activate" : "deactivate"
        } "${product.name}"?`
      )
    ) {
      return;
    }

    setError("");
    setMessage("");
    setUpdatingId(product._id);

    try {
      const response = await fetch(
        `${API_URL}/${product._id}/status`,
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
        throw new Error(data.message || "Could not update product status.");
      }

      setMessage(data.message || "Product status updated.");

      await loadProducts();
    } catch (err) {
      setError(err.message || "Could not update product status.");
    } finally {
      setUpdatingId("");
    }
  };

  const getStockStatus = (product) => {
    const stock = Number(product.stock ?? 0);
    const threshold = Number(product.lowStockThreshold ?? 5);

    if (stock <= 0) {
      return {
        label: "Out of Stock",
        className: "stock-out",
      };
    }

    if (stock <= threshold) {
      return {
        label: "Low Stock",
        className: "stock-low",
      };
    }

    return {
      label: "In Stock",
      className: "stock-available",
    };
  };

  return (
    <div className="manage-products">
      <section className="products-toolbar">
        <div>
          <h2>Product Inventory</h2>
          <p>Manage products, prices and available stock.</p>
        </div>

        <div className="products-toolbar-actions">
          <button
            type="button"
            className="products-refresh-btn"
            onClick={() => loadProducts()}
            disabled={loading}
          >
            Refresh
          </button>

          <button
            type="button"
            className="products-add-btn"
            onClick={openAddForm}
          >
            + Add Product
          </button>
        </div>
      </section>

      {error && (
        <div className="products-alert products-error" role="alert">
          {error}
        </div>
      )}

      {message && (
        <div className="products-alert products-success" role="status">
          {message}
        </div>
      )}

      {/* Inventory Summary */}
      <section className="products-summary-card">
        <div>
          <span>Active Products</span>
          <strong>
            {loading ? "—" : inventory.totalProducts}
          </strong>
        </div>

        <div>
          <span>Total Available Units</span>
          <strong>
            {loading ? "—" : inventory.totalStock}
          </strong>
        </div>

        <div>
          <span>Low Stock Products</span>
          <strong className="inventory-low-number">
            {loading ? "—" : inventory.lowStockProducts}
          </strong>
        </div>

        <div>
          <span>Out of Stock</span>
          <strong className="inventory-out-number">
            {loading ? "—" : inventory.outOfStockProducts}
          </strong>
        </div>
      </section>

      {/* Add / Edit Product Form */}
      {showForm && (
        <section className="product-form-card">
          <div className="product-form-heading">
            <div>
              <h3>{editingId ? "Edit Product" : "Add New Product"}</h3>
              <p>Enter product details and inventory quantities.</p>
            </div>

            <button
              type="button"
              className="product-close-btn"
              onClick={resetForm}
              disabled={saving}
            >
              ×
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="product-form-grid">
              <label>
                Product Name *
                <input
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  required
                  maxLength={150}
                  placeholder="Enter product name"
                />
              </label>

              <label>
                Price (₹) *
                <input
                  type="number"
                  name="price"
                  value={form.price}
                  onChange={handleChange}
                  min="0"
                  step="0.01"
                  required
                  placeholder="Enter product price"
                />
              </label>

              <label>
                Category *
                <input
                  type="text"
                  name="category"
                  value={form.category}
                  onChange={handleChange}
                  required
                  maxLength={100}
                  placeholder="Example: Clothes"
                />
              </label>

              <label>
                Product Image URL *
                <input
                  type="url"
                  name="image"
                  value={form.image}
                  onChange={handleChange}
                  required
                  placeholder="https://example.com/product.jpg"
                />
              </label>

              <label>
                Stock Quantity *
                <input
                  type="number"
                  name="stock"
                  value={form.stock}
                  onChange={handleChange}
                  min="0"
                  step="1"
                  required
                  placeholder="Enter available units"
                />
                <small>Current physical stock available for sale.</small>
              </label>

              <label>
                Low Stock Alert Threshold *
                <input
                  type="number"
                  name="lowStockThreshold"
                  value={form.lowStockThreshold}
                  onChange={handleChange}
                  min="0"
                  step="1"
                  required
                  placeholder="Example: 5"
                />
                <small>Show a warning when stock reaches this quantity.</small>
              </label>
            </div>

            {form.image.trim() && (
              <div className="product-image-preview">
                <span>Image Preview</span>
                <img
                  src={form.image}
                  alt="Product preview"
                  onError={(event) => {
                    event.currentTarget.style.display = "none";
                  }}
                  onLoad={(event) => {
                    event.currentTarget.style.display = "block";
                  }}
                />
              </div>
            )}

            <div className="product-form-actions">
              <button type="submit" disabled={saving}>
                {saving
                  ? "Saving..."
                  : editingId
                    ? "Update Product"
                    : "Save Product"}
              </button>

              <button
                type="button"
                className="product-cancel-btn"
                onClick={resetForm}
                disabled={saving}
              >
                Cancel
              </button>
            </div>
          </form>
        </section>
      )}

      {/* Product List */}
      <section className="products-table-card">
        <div className="products-filter-bar">
          <input
            type="search"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder="Search product name or category..."
            aria-label="Search products"
          />

          <select
            value={status}
            onChange={(event) => {
              setStatus(event.target.value);
              setPage(1);
            }}
            aria-label="Filter products by status"
          >
            <option value="all">All Products</option>
            <option value="active">Active Products</option>
            <option value="inactive">Inactive Products</option>
          </select>
        </div>

        {loading ? (
          <div className="products-empty">Loading products...</div>
        ) : products.length === 0 ? (
          <div className="products-empty">
            No products match your filters.
          </div>
        ) : (
          <div className="products-table-wrapper">
            <table className="products-table">
              <thead>
                <tr>
                  <th>Image</th>
                  <th>Product</th>
                  <th>Category</th>
                  <th>Price</th>
                  <th>Available Stock</th>
                  <th>Inventory Status</th>
                  <th>Product Status</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {products.map((product) => {
                  const active = product.isActive !== false;
                  const stockStatus = getStockStatus(product);

                  return (
                    <tr key={product._id}>
                      <td>
                        <img
                          className="product-table-image"
                          src={product.image}
                          alt={product.name}
                          onError={(event) => {
                            event.currentTarget.style.visibility = "hidden";
                          }}
                        />
                      </td>

                      <td>
                        <strong className="product-table-name">
                          {product.name}
                        </strong>
                      </td>

                      <td>{product.category}</td>

                      <td className="product-table-price">
                        ₹{Number(product.price || 0).toLocaleString("en-IN")}
                      </td>

                      <td>
                        <strong>{product.stock ?? 0}</strong>
                        <small className="product-threshold">
                          Alert at {product.lowStockThreshold ?? 5}
                        </small>
                      </td>

                      <td>
                        <span
                          className={`product-stock-badge ${stockStatus.className}`}
                        >
                          {stockStatus.label}
                        </span>
                      </td>

                      <td>
                        <span
                          className={`product-status ${
                            active ? "product-active" : "product-inactive"
                          }`}
                        >
                          {active ? "Active" : "Inactive"}
                        </span>
                      </td>

                      <td>
                        <div className="product-row-actions">
                          <button
                            type="button"
                            className="product-edit-btn"
                            onClick={() => handleEdit(product)}
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            className={
                              active
                                ? "product-deactivate-btn"
                                : "product-activate-btn"
                            }
                            disabled={updatingId === product._id}
                            onClick={() => handleStatusToggle(product)}
                          >
                            {updatingId === product._id
                              ? "Saving..."
                              : active
                                ? "Deactivate"
                                : "Activate"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="products-pagination">
          <span>
            {total === 0
              ? "No products"
              : `Page ${page} of ${pages} · ${total} products`}
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
    </div>
  );
};

export default ManageProducts;
