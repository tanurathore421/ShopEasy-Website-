
async function createRazorpayRefund({
  paymentId,
  amountPaise,
  idempotencyKey,
  notes = {},
}) {
  if (
    !paymentId ||
    !Number.isSafeInteger(amountPaise) ||
    amountPaise < 100 ||
    !/^[A-Za-z0-9_-]{10,}$/.test(idempotencyKey)
  ) {
    throw new Error("Invalid refund details");
  }

  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    throw new Error("Razorpay credentials are missing");
  }

  const authorization =
    "Basic " +
    Buffer.from(`${keyId}:${keySecret}`).toString("base64");

  const response = await fetch(
    `https://api.razorpay.com/v1/payments/${encodeURIComponent(paymentId)}/refund`,
    {
      method: "POST",
      headers: {
        Authorization: authorization,
        "Content-Type": "application/json",
        "X-Refund-Idempotency": idempotencyKey,
      },
      body: JSON.stringify({
        amount: amountPaise,
        notes,
      }),
      signal: AbortSignal.timeout(20000),
    }
  );

  const result = await response.json();

  if (!response.ok) {
    throw new Error(
      result.error?.description || "Razorpay refund failed"
    );
  }

  return result;
}

module.exports = { createRazorpayRefund };
