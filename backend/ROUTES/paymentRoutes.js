
const express = require("express");
const Razorpay = require("razorpay");
const mongoose = require("mongoose");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");

const Product = require("../MODELS/product.model");
const Order = require("../MODELS/order.model");
const Payment = require("../MODELS/payment.model");

const router = express.Router();

if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
  console.error("Razorpay API keys are missing from backend .env");
}

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// Authenticate using the existing JWT token
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7)
    : null;

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Please login before payment",
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (!decoded.userId) {
      return res.status(401).json({
        success: false,
        message: "Invalid login token",
      });
    }

    req.userId = decoded.userId;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired login token",
    });
  }
}

// Create Razorpay order using actual database prices
router.post("/create-order", authenticate, async (req, res) => {
  try {
    const { items } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Your cart is empty",
      });
    }

    if (items.length > 100) {
      return res.status(400).json({
        success: false,
        message: "Too many products in cart",
      });
    }

    const quantityMap = new Map();

    for (const item of items) {
      if (
        !item ||
        !mongoose.Types.ObjectId.isValid(item.productId) ||
        !Number.isSafeInteger(item.quantity) ||
        item.quantity < 1 ||
        item.quantity > 100
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid product or quantity",
        });
      }

      const id = String(item.productId);
      const newQuantity = (quantityMap.get(id) || 0) + item.quantity;

      if (newQuantity > 100) {
        return res.status(400).json({
          success: false,
          message: "Maximum quantity per product is 100",
        });
      }

      quantityMap.set(id, newQuantity);
    }

    const productIds = [...quantityMap.keys()];

    const products = await Product.find({
      _id: { $in: productIds },
    });

    if (products.length !== productIds.length) {
      return res.status(400).json({
        success: false,
        message: "Some products were not found",
      });
    }

    const productMap = new Map(
      products.map((product) => [String(product._id), product])
    );

    const orderItems = [];
    let totalPaise = 0;

    for (const [productId, quantity] of quantityMap) {
      const product = productMap.get(productId);
      const pricePaise = Math.round(Number(product.price) * 100);

      if (!Number.isSafeInteger(pricePaise) || pricePaise <= 0) {
        return res.status(400).json({
          success: false,
          message: "Invalid product price",
        });
      }

      const itemTotalPaise = pricePaise * quantity;
      totalPaise += itemTotalPaise;

      if (!Number.isSafeInteger(totalPaise)) {
        return res.status(400).json({
          success: false,
          message: "Cart total is too large",
        });
      }

      orderItems.push({
        productId: product._id,
        quantity,
        price: pricePaise / 100,
        totalAmount: itemTotalPaise / 100,
      });
    }

    if (totalPaise <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid cart total",
      });
    }

    const razorpayOrder = await razorpay.orders.create({
      amount: totalPaise,
      currency: "INR",
      receipt: `rcpt_${Date.now()}`,
    });

    await Payment.create({
      userId: req.userId,
      razorpayOrderId: razorpayOrder.id,
      items: orderItems,
      totalAmount: totalPaise / 100,
      status: "Created",
    });

    return res.json({
      success: true,
      orderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
    });
  } catch (error) {
    console.error("Create payment order error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to create payment order",
    });
  }
});

// Verify payment and save orders without MongoDB transactions
router.post("/verify-payment", authenticate, async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = req.body;

    if (
      typeof razorpay_order_id !== "string" ||
      typeof razorpay_payment_id !== "string" ||
      typeof razorpay_signature !== "string"
    ) {
      return res.status(400).json({
        success: false,
        message: "Payment verification details are missing",
      });
    }

    const paymentRecord = await Payment.findOne({
      razorpayOrderId: razorpay_order_id,
      userId: req.userId,
    });

    if (!paymentRecord) {
      return res.status(404).json({
        success: false,
        message: "Payment order not found",
      });
    }

    if (paymentRecord.status === "Paid") {
      return res.json({
        success: true,
        message: "Payment was already verified",
      });
    }

    // Verify Razorpay signature
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    const received = Buffer.from(razorpay_signature, "hex");
    const expected = Buffer.from(expectedSignature, "hex");

    if (
      received.length !== expected.length ||
      !crypto.timingSafeEqual(received, expected)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment signature",
      });
    }

    // Confirm payment details directly with Razorpay
    const razorpayPayment = await razorpay.payments.fetch(
      razorpay_payment_id
    );

    if (
      razorpayPayment.order_id !== razorpay_order_id ||
      razorpayPayment.amount !== Math.round(paymentRecord.totalAmount * 100) ||
      razorpayPayment.currency !== "INR"
    ) {
      return res.status(400).json({
        success: false,
        message: "Payment details do not match the order",
      });
    }

    if (razorpayPayment.status !== "captured") {
      return res.status(409).json({
        success: false,
        message:
          "Payment is not captured yet. Check Razorpay Dashboard before retrying.",
      });
    }

    // Reload payment record in case another request already processed it
    const currentPayment = await Payment.findOne({
      _id: paymentRecord._id,
      userId: req.userId,
    });

    if (!currentPayment) {
      return res.status(404).json({
        success: false,
        message: "Payment record not found",
      });
    }

    if (currentPayment.status === "Paid") {
      return res.json({
        success: true,
        message: "Payment was already verified",
      });
    }

    // Ensure duplicate protection index exists in order.model.js.
    // This avoids using transactions on standalone MongoDB.
    for (const item of currentPayment.items) {
      await Order.updateOne(
        {
          paymentRecordId: currentPayment._id,
          productId: item.productId,
        },
        {
          $setOnInsert: {
            paymentRecordId: currentPayment._id,
            userId: currentPayment.userId,
            productId: item.productId,
            quantity: item.quantity,
            price: item.price,
            totalAmount: item.totalAmount,
            status: "Processing",
          },
        },
        { upsert: true }
      );
    }

    // Mark payment Paid only after all order items have been saved
    currentPayment.razorpayPaymentId = razorpay_payment_id;
    currentPayment.razorpaySignature = razorpay_signature;
    currentPayment.status = "Paid";

    await currentPayment.save();

    return res.json({
      success: true,
      message: "Payment verified and order saved successfully",
    });
  } catch (error) {
    console.error("Payment verification error:", error);

    return res.status(500).json({
      success: false,
      message:
        "Verification or order saving failed. Check backend logs and Razorpay payment status.",
    });
  }
});

module.exports = router;
