const express = require("express");
const router = express.Router();

const {
  placeOrder,
  getOrder,
  cancelOrder,
  removeOrder,
  placeCodOrder,
} = require("../CONTROLLERS/order.controller");

const authMiddleware = require("../MIDDLEWARE/authMiddleware");

// Existing routes
router.post("/orders", authMiddleware, placeOrder);
router.get("/orders", authMiddleware, getOrder);

// New COD route
router.post("/cod", authMiddleware, placeCodOrder);

// Cancel and remove routes
router.put("/:id/cancel", authMiddleware, cancelOrder);
router.delete("/remove/:id", authMiddleware, removeOrder);

module.exports = router;