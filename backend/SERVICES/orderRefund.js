
const Payment = require("../MODELS/payment.model");
const { createRazorpayRefund } = require("./razorpayRefund");

async function refundOnlineOrderIfNeeded(order) {
  // COD orders do not need an online refund.
  if (!order.paymentRecordId) return null;

  if (
    order.refundStatus === "Processed" &&
    order.razorpayRefundId
  ) {
    return { id: order.razorpayRefundId };
  }

  const payment = await Payment.findById(order.paymentRecordId);

  if (
    !payment ||
    payment.status !== "Paid" ||
    !payment.razorpayPaymentId
  ) {
    throw new Error(
      "Online payment record is not confirmed. Manual review required."
    );
  }

  const amountPaise = Math.round(Number(order.totalAmount) * 100);

  if (!Number.isSafeInteger(amountPaise) || amountPaise < 100) {
    throw new Error("Refund amount must be at least ₹1.");
  }

  // Persist Pending before contacting Razorpay.
  order.refundStatus = "Pending";
  await order.save();

  // Stable idempotency key prevents duplicate refunds on retries.
  const refund = await createRazorpayRefund({
    paymentId: payment.razorpayPaymentId,
    amountPaise,
    idempotencyKey: `order_${String(order._id)}`,
    notes: {
      orderId: String(order._id),
      paymentRecordId: String(payment._id),
    },
  });

  order.refundStatus = "Processed";
  order.razorpayRefundId = refund.id;
  order.refundedAt = new Date();

  await order.save();

  return refund;
}

module.exports = { refundOnlineOrderIfNeeded };
