const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Auth",
      required: true,
    },

    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },

    quantity: {
      type: Number,
      required: true,
      default: 1,
      min: 1,
    },

    price: {
      type: Number,
      required: true,
      min: 0,
    },

    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },

    orderDate: {
      type: Date,
      default: Date.now,
    },

    status: {
      type: String,
      enum: ["Pending", "Processing", "Shipped", "Delivered", "Cancelled"],
      default: "Pending",
    },

    paymentRecordId: {
  type: mongoose.Schema.Types.ObjectId,
  ref: "Payment",
},
  },
  {
    timestamps: true,
  },
);

orderSchema.index(
  { paymentRecordId: 1, productId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      paymentRecordId: { $exists: true },
    },
  }
);
module.exports = mongoose.model("Order", orderSchema);
