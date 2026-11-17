
import React, { useCallback, useEffect, useMemo, useState } from "react";
import "./ManageSupplierProducts.css";

const API_URL = "http://localhost:3000/api/admin/supplier-products";

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);

const ManageSupplierProducts = () => {
  const [products, setProducts] = useState([]);
  const [status, setStatus] = useState("pending");
  const [sellingPrices, setSellingPrices] = useState({});
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const token = localStorage.getItem("token");

  const loadProducts = useCallback(async () => {
    if (!token) {
      setError("Admin login required. Please log in again.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const query =
        status === "all"
          ? ""
          : `?status=${encodeURIComponent(status)}`;

      const response = await fetch(`${API_URL}${query}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Could not load supplier products."
        );
      }

      const list = Array.isArray(data.products)
        ? data.products
        : [];

      setProducts(list);

      setSellingPrices((previous) => {
        const next = { ...previous };

        list.forEach((product) => {
          if (next[product._id] === undefined) {
            next[product._id] =
              product.price > 0 ? String(product.price) : "";
          }
        });

        return next;
      });
    } catch (err) {
      setError(
        err.message || "Could not connect to the server."
      );
    } finally {
      setLoading(false);
    }
  }, [status, token]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const updateSellingPrice = (id, value) => {
    setSellingPrices((previous) => ({
      ...previous,
      [id]: value,
    }));
  };

  const handleApprove = async (product) => {
    const sellingPrice = Number(
      sellingPrices[product._id]
    );

    if (
      !Number.isFinite(sellingPrice) ||
      sellingPrice <= 0
    ) {
      setError(
        "Enter a valid customer selling price before approval."
      );
      return;
    }

    if (
      !window.confirm(
        `Approve ${product.name} at ${formatCurrency(sellingPrice)}?`
      )
    ) {
      return;
    }

    setUpdatingId(product._id);
    setError("");
    setMessage("");

    try {
      const response = await fetch(
        `${API_URL}/${product._id}/approve`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ sellingPrice }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Product approval failed."
        );
      }

      setMessage(
        data.message || "Product approved successfully."
      );

      await loadProducts();
    } catch (err) {
      setError(
        err.message || "Could not approve product."
      );
    } finally {
      setUpdatingId("");
    }
  };

  const handleReject = async (product) => {
    const reason = window.prompt(
      `Enter rejection reason for ${product.name}:`
    );

    if (reason === null) return;

    if (!reason.trim()) {
      setError("A rejection reason is required.");
      return;
    }

    setUpdatingId(product._id);
    setError("");
    setMessage("");

    try {
      const response = await fetch(
        `${API_URL}/${product._id}/reject`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            reason: reason.trim(),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Product rejection failed."
        );
      }

      setMessage(
        data.message || "Product rejected successfully."
      );

      await loadProducts();
    } catch (err) {
      setError(
        err.message || "Could not reject product."
      );
    } finally {
      setUpdatingId("");
    }
  };

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return products;

    return products.filter((product) =>
      [
        product.name,
        product.category,
        product.supplierId?.name,
        product.supplierId?.businessName,
        product.supplierId?.email,
      ].some((value) =>
        String(value || "").toLowerCase().includes(query)
      )
    );
  }, [products, search]);

  return (
    <section className="supplier-approval-page">

      <div className="supplier-approval-heading">
        <div>
          <h2>Wholesaler Product Approvals</h2>
          <p>
            Review supplier submissions and set the
            customer selling price.
          </p>
        </div>

        <button
          className="supplier-refresh-btn"
          onClick={loadProducts}
          disabled={loading}
        >
          {loading ? "Loading..." : "Refresh"}
        </button>
      </div>

      <div className="supplier-approval-toolbar">

        <div
          className="supplier-status-tabs"
          role="group"
          aria-label="Filter by approval status"
        >
          {["pending", "approved", "rejected", "all"].map(
            (item) => (
              <button
                key={item}
                className={
                  status === item ? "selected" : ""
                }
                onClick={() => setStatus(item)}
              >
                {item === "all"
                  ? "All"
                  : item[0].toUpperCase() + item.slice(1)}
              </button>
            )
          )}
        </div>

        <input
          type="search"
          value={search}
          onChange={(event) =>
            setSearch(event.target.value)
          }
          placeholder="Search product or wholesaler..."
          aria-label="Search product or wholesaler"
        />
      </div>

      {error && (
        <div className="supplier-alert supplier-alert-error">
          {error}
        </div>
      )}

      {message && (
        <div className="supplier-alert supplier-alert-success">
          {message}
        </div>
      )}

      {loading ? (
        <div className="supplier-empty-state">
          Loading supplier products...
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="supplier-empty-state">
          <strong>No supplier products found</strong>
          <span>
            There are no products in this status matching your search.
          </span>
        </div>
      ) : (
        <div className="supplier-product-grid">

          {filteredProducts.map((product) => {
            const supplier = product.supplierId || {};
            const busy = updatingId === product._id;

            return (
              <article
                className="supplier-product-card"
                key={product._id}
              >

                <div className="supplier-product-image-wrap">

                  {product.image ? (
                    <img
                      src={product.image}
                      alt={product.name}
                      onError={(event) => {
                        event.currentTarget.style.display = "none";
                      }}
                    />
                  ) : (
                    <span>No image</span>
                  )}

                  <span
                    className={`supplier-status-badge ${
                      product.approvalStatus || "pending"
                    }`}
                  >
                    {product.approvalStatus || "pending"}
                  </span>
                </div>

                <div className="supplier-product-content">

                  <div className="supplier-product-title-row">
                    <h3>{product.name}</h3>
                    <span>{product.category}</span>
                  </div>

                  <div className="supplier-details">

                    <p>
                      <b>Wholesaler:</b>{" "}
                      {supplier.businessName ||
                        supplier.name ||
                        "Supplier details unavailable"}
                    </p>

                    {supplier.name &&
                      supplier.businessName && (
                        <p>
                          <b>Contact:</b> {supplier.name}
                        </p>
                      )}

                    {supplier.email && (
                      <p>
                        <b>Email:</b> {supplier.email}
                      </p>
                    )}

                    {supplier.phone && (
                      <p>
                        <b>Phone:</b> {supplier.phone}
                      </p>
                    )}

                  </div>

                  <div className="supplier-price-row">

                    <div>
                      <span>Supply price</span>
                      <strong>
                        {formatCurrency(product.supplyPrice)}
                      </strong>
                    </div>

                    <div>
                      <span>Submitted stock</span>
                      <strong>
                        {Number(product.stock) || 0}
                      </strong>
                    </div>

                  </div>

                  {product.approvalStatus === "rejected" &&
                    product.rejectionReason && (
                      <p className="supplier-rejection-reason">
                        <b>Rejection reason:</b>{" "}
                        {product.rejectionReason}
                      </p>
                    )}

                  {product.approvalStatus !== "approved" && (
                    <label className="supplier-selling-price">
                      Customer selling price (₹)

                      <input
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={
                          sellingPrices[product._id] ?? ""
                        }
                        onChange={(event) =>
                          updateSellingPrice(
                            product._id,
                            event.target.value
                          )
                        }
                        placeholder="Enter selling price"
                      />
                    </label>
                  )}

                  {product.approvalStatus === "pending" ||
                  product.approvalStatus === "rejected" ? (
                    <div className="supplier-card-actions">

                      <button
                        className="supplier-approve-btn"
                        disabled={busy}
                        onClick={() => handleApprove(product)}
                      >
                        {busy
                          ? "Please wait..."
                          : "Approve Product"}
                      </button>

                      {product.approvalStatus === "pending" && (
                        <button
                          className="supplier-reject-btn"
                          disabled={busy}
                          onClick={() => handleReject(product)}
                        >
                          Reject
                        </button>
                      )}

                    </div>
                  ) : (
                    <div className="supplier-approved-note">
                      Published selling price:{" "}
                      {formatCurrency(product.price)}
                    </div>
                  )}

                </div>
              </article>
            );
          })}

        </div>
      )}
    </section>
  );
};

export default ManageSupplierProducts;
