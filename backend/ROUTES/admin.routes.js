
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
} = require("../CONTROLLERS/admin.controller");

// Require a valid login and the admin role for every route below.
router.use(authMiddleware, authorizeRoles("admin"));

// Get dashboard statistics
router.get("/dashboard", getDashboardStats);

// Get the customer list
router.get("/customers", getCustomers);

// Activate or deactivate a customer
router.patch(
  "/customers/:id/status",
  updateCustomerStatus
);

// Create a wholesaler account
router.post("/wholesalers", createWholesaler);

// Get the list of wholesalers
router.get("/wholesalers", getWholesalers);

// Update wholesaler details
router.put("/wholesalers/:id", updateWholesaler);

// Activate or deactivate a wholesaler
router.patch(
  "/wholesalers/:id/status",
  updateWholesalerStatus
);

// Get all orders
router.get("/orders", getAdminOrders);

// Update the status of an order
router.patch("/orders/:id/status", updateAdminOrderStatus);


module.exports = router;
