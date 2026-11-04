
const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    image: {
      type: String,
      required: true,
      trim: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    // Customer selling price
    price: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },

    category: {
      type: String,
      required: true,
      trim: true,
    },

    // Product visibility
    isActive: {
      type: Boolean,
      default: true,
    },

    // Available stock
    stock: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: "Stock must be a whole number",
      },
    },

    // Low stock alert
    lowStockThreshold: {
      type: Number,
      default: 5,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: "Low stock threshold must be a whole number",
      },
    },

    // Wholesaler information
    supplierId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Auth",
      default: null,
    },

    // Wholesaler supply price
    supplyPrice: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Admin product approval
    approvalStatus: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "approved",
    },

    rejectionReason: {
      type: String,
      default: "",
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

const Product = mongoose.model("Product", productSchema);

module.exports = Product;
