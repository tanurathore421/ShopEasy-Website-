
const Razorpay = require("razorpay");

const Payment = require("../MODELS/payment.model");
const Product = require("../MODELS/product.model");
const Order = require("../MODELS/order.model");

const CHECK_INTERVAL = 60 * 1000;
const RETRY_MINUTES = 5;

let razorpay = null;
let timer = null;
let isRunning = false;

function getRazorpay() {
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    throw new Error("Razorpay credentials are missing");
  }

  if (!razorpay) {
    razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
  }

  return razorpay;
}

async function retryLater(paymentId) {
  await Payment.updateOne(
    {
      _id: paymentId,
      status: "Releasing",
      stockReserved: true,
    },
    {
      $set: {
        status: "Created",
        reservationExpiresAt: new Date(
          Date.now() + RETRY_MINUTES * 60 * 1000
        ),
      },
    }
  );
}

async function processExpiredPayment(payment) {
  // Claim this reservation so another cleanup request cannot process it.
  const lockedPayment = await Payment.findOneAndUpdate(
    {
      _id: payment._id,
      status: "Created",
      stockReserved: true,
      reservationExpiresAt: { $lte: new Date() },
    },
    {
      $set: { status: "Releasing" },
    },
    { new: true }
  );

  if (!lockedPayment) return;

  let paymentAttempts;

  try {
    const response = await getRazorpay().orders.fetchPayments(
      lockedPayment.razorpayOrderId
    );

    paymentAttempts = response.items || [];
  } catch (error) {
    console.error(
      "Could not check Razorpay payment:",
      lockedPayment.razorpayOrderId,
      error.message
    );

    await retryLater(lockedPayment._id);
    return;
  }

  // Never release stock if a captured payment exists.
  const capturedPayment = paymentAttempts.find(
    (item) =>
      item.order_id === lockedPayment.razorpayOrderId &&
      item.status === "captured"
  );

  if (capturedPayment) {
    const expectedAmount = Math.round(
      Number(lockedPayment.totalAmount) * 100
    );

    if (
      capturedPayment.amount !== expectedAmount ||
      capturedPayment.currency !== "INR"
    ) {
      console.error(
        "Captured payment amount mismatch. Manual review required:",
        lockedPayment.razorpayOrderId
      );

      await retryLater(lockedPayment._id);
      return;
    }

    try {
      // Stock was deducted during reservation.
      // Create orders without deducting stock again.
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

      await Payment.updateOne(
        {
          _id: lockedPayment._id,
          status: "Releasing",
          stockReserved: true,
        },
        {
          $set: {
            status: "Paid",
            stockReserved: false,
            stockCommittedAt: new Date(),
            reservationExpiresAt: null,
            razorpayPaymentId: capturedPayment.id,
          },
        }
      );

      console.log(
        "Expired reservation reconciled as paid:",
        lockedPayment.razorpayOrderId
      );

      return;
    } catch (error) {
      console.error("Captured payment reconciliation error:", error);

      // Existing upserts are duplicate-protected.
      await retryLater(lockedPayment._id);
      return;
    }
  }

  // Keep stock reserved while payment is created or authorized.
  const paymentInProgress = paymentAttempts.some((item) =>
    ["created", "authorized"].includes(item.status)
  );

  if (paymentInProgress) {
    await retryLater(lockedPayment._id);
    return;
  }

  // Release only when every returned attempt is terminal.
  const allAttemptsTerminal = paymentAttempts.every((item) =>
    ["failed", "refunded"].includes(item.status)
  );

  if (!allAttemptsTerminal) {
    console.error(
      "Unknown Razorpay payment status; keeping stock reserved:",
      lockedPayment.razorpayOrderId
    );

    await retryLater(lockedPayment._id);
    return;
  }

  // Restore each product's inventory.
  // If restoration fails partway, keep the payment in Releasing
  // for manual reconciliation rather than risk restoring twice.
  try {
    for (const item of lockedPayment.items) {
      const result = await Product.updateOne(
        { _id: item.productId },
        { $inc: { stock: item.quantity } }
      );

      if (result.matchedCount !== 1) {
        throw new Error(
          `Product not found while restoring stock: ${item.productId}`
        );
      }
    }

    const finalStatus =
      paymentAttempts.length === 0 ? "Expired" : "Failed";

    await Payment.updateOne(
      {
        _id: lockedPayment._id,
        status: "Releasing",
        stockReserved: true,
      },
      {
        $set: {
          status: finalStatus,
          stockReserved: false,
          stockReleasedAt: new Date(),
          reservationExpiresAt: null,
        },
      }
    );

    console.log(
      "Expired stock reservation released:",
      lockedPayment.razorpayOrderId
    );
  } catch (error) {
    console.error(
      "Stock restoration needs manual review:",
      lockedPayment.razorpayOrderId,
      error.message
    );
  }
}

async function cleanupExpiredPayments() {
  if (isRunning) return;

  isRunning = true;

  try {
    const expiredPayments = await Payment.find({
      status: "Created",
      stockReserved: true,
      reservationExpiresAt: { $lte: new Date() },
    })
      .sort({ reservationExpiresAt: 1 })
      .limit(25);

    for (const payment of expiredPayments) {
      await processExpiredPayment(payment);
    }
  } catch (error) {
    console.error("Payment cleanup error:", error.message);
  } finally {
    isRunning = false;
  }
}

function startPaymentReservationCleanup() {
  if (timer) return;

  console.log("Payment reservation cleanup started");

  cleanupExpiredPayments();

  timer = setInterval(() => {
    cleanupExpiredPayments();
  }, CHECK_INTERVAL);
}

module.exports = {
  startPaymentReservationCleanup,
  cleanupExpiredPayments,
};
