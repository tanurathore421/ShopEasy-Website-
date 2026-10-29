const mongoose = require("mongoose");

const userAuthSchema = new mongoose.Schema(
  {
    // User's full name
    name: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },

    // Login email
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    // Store only the hashed password
    password: {
      type: String,
      required: true,
    },

    // Contact number
    phone: {
      type: String,
      required: true,
      trim: true,
    },

    // Residential or business address
    address: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },

    // Account role
    role: {
      type: String,
      enum: ["customer", "admin", "wholesaler"],
      default: "customer",
      required: true,
    },

    // Wholesaler business details
    businessName: {
      type: String,
      trim: true,
      uppercase: true,
      default: "",
    },

    // Optional GST registration number
    gstNumber: {
      type: String,
      trim: true,
      uppercase: true,
      default: "",
    },

    // Allow the admin to enable or disable an account
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Auth", userAuthSchema);