
const express = require("express");
const router = express.Router();

const {
  getWholesalerDashboard,
  getMyProducts,
  submitProduct,
  updateMyProduct,
  getMyProfile,
} = require("../CONTROLLERS/wholesaler.controller");

const authMiddleware = require("../MIDDLEWARE/authMiddleware");
const authorizeRoles = require("../MIDDLEWARE/authorizeRoles");

// Wholesaler-only access
router.use(authMiddleware, authorizeRoles("wholesaler"));

// Dashboard
router.get("/dashboard", getWholesalerDashboard);

// Profile
router.get("/profile", getMyProfile);

// Product management
router.get("/products", getMyProducts);
router.post("/products", submitProduct);
router.put("/products/:id", updateMyProduct);

module.exports = router;
