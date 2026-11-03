
const express = require("express");
const Razorpay = require("razorpay");
const mongoose = require("mongoose");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");

const Product = require("../MODELS/product.model");
const Order = require("../MODELS/order.model");
const Payment = require("../MODELS/payment.model");
const {
  createRazorpayRefund,
} = require("../SERVICES/razorpayRefund");

const router = express.Router();

const RESERVATION_MINUTES = 15;

if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
  console.error("Razorpay API keys are missing from backend .env");
}

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// JWT authentication
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

// Restore reserved inventory
async function restoreStock(items) {
  for (const item of items) {
    const result = await Product.updateOne(
      { _id: item.productId },
      { $inc: { stock: item.quantity } }
    );

    if (result.matchedCount !== 1) {
      throw new Error(
        `Could not restore stock for product ${item.productId}`
      );
    }
  }
}

// Atomically reserve inventory
async function reserveStock(items) {
  const reserved = [];

  for (const item of items) {
    const product = await Product.findOneAndUpdate(
      {
        _id: item.productId,
        isActive: { $ne: false },
        stock: { $gte: item.quantity },
      },
      {
        $inc: { stock: -item.quantity },
      },
      { new: true }
    );

    if (!product) {
      await restoreStock(reserved);

      return {
        success: false,
        productId: item.productId,
      };
    }

    reserved.push(item);
  }

  return { success: true, reserved };
}

// Create Razorpay order and reserve stock
router.post("/create-order", authenticate, async (req, res) => {
  let reservedItems = [];

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
      const quantity = (quantityMap.get(id) || 0) + item.quantity;

      if (quantity > 100) {
        return res.status(400).json({
          success: false,
          message: "Maximum quantity per product is 100",
        });
      }

      quantityMap.set(id, quantity);
    }

    const productIds = [...quantityMap.keys()].sort();

    const products = await Product.find({
      _id: { $in: productIds },
      isActive: { $ne: false },
    });

    if (products.length !== productIds.length) {
      return res.status(400).json({
        success: false,
        message: "Some products are unavailable",
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

    // Reserve stock before creating the payment order
    const reservation = await reserveStock(orderItems);

    if (!reservation.success) {
      return res.status(409).json({
        success: false,
        message: "Insufficient stock. Please update your cart.",
        productId: reservation.productId,
      });
    }

    reservedItems = reservation.reserved;

    try {
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
        stockReserved: true,
        reservationExpiresAt: new Date(
          Date.now() + RESERVATION_MINUTES * 60 * 1000
        ),
      });

      reservedItems = [];

      return res.json({
        success: true,
        orderId: razorpayOrder.id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        keyId: process.env.RAZORPAY_KEY_ID,
      });
    } catch (error) {
      // Release inventory if Razorpay order or payment record creation fails
      await restoreStock(reservedItems);
      reservedItems = [];
      throw error;
    }
  } catch (error) {
    console.error("Create payment order error:", error);

    if (reservedItems.length > 0) {
      try {
        await restoreStock(reservedItems);
      } catch (restoreError) {
        console.error("Stock restoration error:", restoreError);
      }
    }

    return res.status(500).json({
      success: false,
      message: "Unable to create payment order",
    });
  }
});

// Release reservation after checkout is closed without a successful payment
router.post("/release-reservation", authenticate, async (req, res) => {
  try {
    const { razorpay_order_id } = req.body;

    if (typeof razorpay_order_id !== "string") {
      return res.status(400).json({
        success: false,
        message: "Razorpay order ID is required",
      });
    }

    const payment = await Payment.findOne({
      razorpayOrderId: razorpay_order_id,
      userId: req.userId,
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment order not found",
      });
    }

    if (payment.status === "Paid") {
      return res.status(409).json({
        success: false,
        message: "Payment is already completed",
      });
    }

    if (!payment.stockReserved) {
      return res.json({
        success: true,
        message: "Stock reservation was already released",
      });
    }

    // Check Razorpay before releasing inventory.
    // Do not release while a payment is captured, authorized, or in progress.
    const paymentList = await razorpay.orders.fetchPayments(
      razorpay_order_id
    );

    const payments = paymentList.items || [];

    const paymentInProgress = payments.some((item) =>
      ["created", "authorized", "captured"].includes(item.status)
    );

    if (paymentInProgress) {
      return res.status(409).json({
        success: false,
        message:
          "A payment attempt is still active. Stock has been kept reserved.",
      });
    }

    // Lock this payment so concurrent requests cannot restore stock twice
    const lockedPayment = await Payment.findOneAndUpdate(
      {
        _id: payment._id,
        userId: req.userId,
        status: "Created",
        stockReserved: true,
      },
      {
        $set: { status: "Releasing" },
      },
      { new: true }
    );

    if (!lockedPayment) {
      return res.status(409).json({
        success: false,
        message: "Payment reservation is already being processed",
      });
    }

    await restoreStock(lockedPayment.items);

    lockedPayment.stockReserved = false;
    lockedPayment.stockReleasedAt = new Date();
    lockedPayment.status = "Failed";

    await lockedPayment.save();

    return res.json({
      success: true,
      message: "Stock reservation released successfully",
    });
  } catch (error) {
    console.error("Release reservation error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to release stock reservation",
    });
  }
});

// Verify payment and create orders

router.post("/verify-payment", authenticate, async (req, res) => {
  let lockedPayment = null;
  let previousStatus = null;

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

    if (paymentRecord.status === "Refunded") {
      return res.json({
        success: true,
        paymentRefunded: true,
        message: "Late payment was already refunded",
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

    // Always confirm directly with Razorpay
    const razorpayPayment = await razorpay.payments.fetch(
      razorpay_payment_id
    );

    if (
      razorpayPayment.order_id !== razorpay_order_id ||
      razorpayPayment.amount !==
        Math.round(paymentRecord.totalAmount * 100) ||
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
        message: "Payment is not captured yet",
      });
    }

    // If stock was already released, refund the late payment.
    if (!paymentRecord.stockReserved) {
      if (!["Failed", "Expired"].includes(paymentRecord.status)) {
        return res.status(409).json({
          success: false,
          message: "Payment reservation is being processed. Please retry.",
        });
      }

      previousStatus = paymentRecord.status;

      lockedPayment = await Payment.findOneAndUpdate(
        {
          _id: paymentRecord._id,
          userId: req.userId,
          status: previousStatus,
          stockReserved: false,
        },
        {
          $set: { status: "Verifying" },
        },
        { new: true }
      );

      if (!lockedPayment) {
        const latest = await Payment.findById(paymentRecord._id);

        if (latest?.status === "Refunded") {
          return res.json({
            success: true,
            paymentRefunded: true,
            message: "Late payment was already refunded",
          });
        }

        return res.status(409).json({
          success: false,
          message: "Payment is already being processed",
        });
      }

      const refund = await createRazorpayRefund({
        paymentId: razorpay_payment_id,
        amountPaise: Math.round(
          Number(lockedPayment.totalAmount) * 100
        ),
        idempotencyKey: `late_payment_${lockedPayment._id}`,
        notes: {
          razorpayOrderId: lockedPayment.razorpayOrderId,
          reason: "Stock reservation expired",
        },
      });

      await Payment.updateOne(
        {
          _id: lockedPayment._id,
          status: "Verifying",
          stockReserved: false,
        },
        {
          $set: {
            status: "Refunded",
            razorpayPaymentId: razorpay_payment_id,
            razorpaySignature: razorpay_signature,
            lateRefundId: refund.id,
            lateRefundedAt: new Date(),
          },
        }
      );

      lockedPayment = null;

      return res.json({
        success: true,
        paymentRefunded: true,
        message:
          "Payment was captured after stock release. Full refund initiated; no order was created.",
      });
    }

    // Normal payment verification: stock was reserved already.
    previousStatus = "Created";

    lockedPayment = await Payment.findOneAndUpdate(
      {
        _id: paymentRecord._id,
        userId: req.userId,
        status: "Created",
        stockReserved: true,
      },
      {
        $set: { status: "Verifying" },
      },
      { new: true }
    );

    if (!lockedPayment) {
      const latest = await Payment.findById(paymentRecord._id);

      if (latest?.status === "Paid") {
        return res.json({
          success: true,
          message: "Payment was already verified",
        });
      }

      return res.status(409).json({
        success: false,
        message: "Payment verification is already in progress",
      });
    }

    // Stock was deducted during reservation. Never deduct again here.
    for (const item of lockedPayment.items) {
      await Order.updateOne(
        {
          paymentRecordId: lockedPayment._id,
          productId: item.productId,
        },
        {
          $setOnInsert: {
            paymentRecordId: lockedPayment._id,
            userId: lockedPayment.userId,
            productId: item.productId,
            quantity: item.quantity,
            price: item.price,
            totalAmount: item.totalAmount,
            status: "Processing",
            stockDeducted: true,
          },
        },
        { upsert: true }
      );
    }

    lockedPayment.razorpayPaymentId = razorpay_payment_id;
    lockedPayment.razorpaySignature = razorpay_signature;
    lockedPayment.status = "Paid";
    lockedPayment.stockReserved = false;
    lockedPayment.stockCommittedAt = new Date();
    lockedPayment.reservationExpiresAt = null;

    await lockedPayment.save();
    lockedPayment = null;

    return res.json({
      success: true,
      message: "Payment verified and order saved successfully",
    });
  } catch (error) {
    console.error("Payment verification error:", error);

    if (lockedPayment && previousStatus) {
      await Payment.updateOne(
        {
          _id: lockedPayment._id,
          status: "Verifying",
        },
        {
          $set: { status: previousStatus },
        }
      );
    }

    return res.status(500).json({
      success: false,
      message:
        "Payment verification or refund failed. Check Razorpay Dashboard before retrying.",
    });
  }
});


module.exports = router;


/* 
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
 */