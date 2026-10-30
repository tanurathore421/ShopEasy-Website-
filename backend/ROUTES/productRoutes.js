const express = require("express");
const router = express.Router();

const {
  addProduct,
  getProducts,
} = require("../CONTROLLERS/product.controller");

const authMiddleware = require("../MIDDLEWARE/authMiddleware");
const authorizeRoles = require("../MIDDLEWARE/authorizeRoles");

// Only administrators can add products through this endpoint.
router.post(
  "/add",
  authMiddleware,
  authorizeRoles("admin"),
  addProduct
);

// Public product listing.
router.get("/all", getProducts);

module.exports = router;