
const express = require("express");
const router = express.Router();

const authMiddleware = require("../MIDDLEWARE/authMiddleware");
const authorizeRoles = require("../MIDDLEWARE/authorizeRoles");

const {
  createWholesaler,
  getWholesalers,
  updateWholesaler,
  updateWholesalerStatus,

  getDashboardStats,

  getCustomers,
  updateCustomerStatus,

  getAdminOrders,
  updateAdminOrderStatus,

  getAdminProducts,
  createAdminProduct,
  updateAdminProduct,
  updateAdminProductStatus,

  getInventoryStats,
} = require("../CONTROLLERS/admin.controller");



// All admin APIs require authentication and admin authorization.
router.use(authMiddleware, authorizeRoles("admin"));

// ==========================================
// INVENTORY MANAGEMENT
// ==========================================

// Inventory summary
router.get("/inventory/summary", getInventoryStats);

// ==========================================
// DASHBOARD
// ==========================================
router.get("/dashboard", getDashboardStats);

// ==========================================
// WHOLESALER MANAGEMENT
// ==========================================
router.post("/wholesalers", createWholesaler);
router.get("/wholesalers", getWholesalers);
router.put("/wholesalers/:id", updateWholesaler);

router.patch(
  "/wholesalers/:id/status",
  updateWholesalerStatus
);

// ==========================================
// CUSTOMER MANAGEMENT
// ==========================================
router.get("/customers", getCustomers);

router.patch(
  "/customers/:id/status",
  updateCustomerStatus
);

// ==========================================
// ORDER MANAGEMENT
// ==========================================
router.get("/orders", getAdminOrders);

router.patch(
  "/orders/:id/status",
  updateAdminOrderStatus
);

// ==========================================
// PRODUCT MANAGEMENT
// ==========================================
router.get("/products", getAdminProducts);

router.post("/products", createAdminProduct);

router.put(
  "/products/:id",
  updateAdminProduct
);

router.patch(
  "/products/:id/status",
  updateAdminProductStatus
);

module.exports = router;
