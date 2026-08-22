// src/services/payment.services.js
//
// ─── WHY THIS FILE EXISTS ─────────────────────────────────────────────────────
// Handles all communication with Razorpay Payment Gateway:
//   1. Creating payment orders (amount converted to paise to avoid float errors)
//   2. Verifying HMAC-SHA256 signatures to prevent client-side payment forgery
//   3. Validating incoming Webhook signatures for asynchronous reliability
//   4. Processing refunds on cancelled orders
// ─────────────────────────────────────────────────────────────────────────────

const crypto = require("crypto");
const Razorpay = require("razorpay");
const config = require("../config/index");
const logger = require("../config/logger");
const ApiError = require("../utils/ApiError");

let razorpayInstance = null;

// Initialize Razorpay client if credentials are configured
if (config.razorpay.keyId && config.razorpay.keySecret) {
  try {
    razorpayInstance = new Razorpay({
      key_id: config.razorpay.keyId,
      key_secret: config.razorpay.keySecret,
    });
    logger.info("Razorpay client initialized with configured credentials");
  } catch (err) {
    logger.warn(`Failed to initialize Razorpay client: ${err.message}`);
  }
}

/**
 * Creates a Razorpay Order.
 * @param {Object} params
 * @param {number} params.amount - Amount in Indian Rupees (e.g. 249.50)
 * @param {string} [params.currency="INR"] - Currency code
 * @param {string} [params.receipt] - Unique internal identifier (e.g. orderNumber or orderId)
 * @param {Object} [params.notes={}] - Key-value metadata attached to payment
 * @returns {Promise<Object>} Razorpay Order Object
 */
async function createRazorpayOrder({ amount, currency = "INR", receipt, notes = {} }) {
  if (!amount || Number(amount) <= 0) {
    throw new ApiError(400, "Invalid payment amount: must be greater than 0");
  }

  // Razorpay strictly requires amount in paise (1 INR = 100 paise)
  const amountInPaise = Math.round(Number(amount) * 100);

  if (razorpayInstance) {
    try {
      const options = {
        amount: amountInPaise,
        currency,
        receipt: (receipt || `rcpt_${Date.now()}`).substring(0, 40),
        notes,
      };
      const order = await razorpayInstance.orders.create(options);
      return {
        id: order.id,
        amount: order.amount,
        currency: order.currency,
        receipt: order.receipt,
        status: order.status,
        keyId: config.razorpay.keyId,
        isMock: false,
      };
    } catch (error) {
      logger.error(`Razorpay order creation error: ${error.message}`);
      throw new ApiError(502, `Payment Gateway Error: ${error.description || error.message}`);
    }
  }

  // ── MOCK SIMULATION MODE (Used when API keys are not provided) ─────────────
  // This allows unit testing and development to proceed without live credentials.
  const mockOrderId = `order_mock_${crypto.randomBytes(8).toString("hex")}`;
  logger.info(`[MOCK PAYMENT] Created simulated Razorpay order: ${mockOrderId} for ₹${amount}`);
  return {
    id: mockOrderId,
    amount: amountInPaise,
    currency,
    receipt: receipt || `rcpt_${Date.now()}`,
    status: "created",
    keyId: config.razorpay.keyId || "rzp_test_mock_key_id",
    isMock: true,
  };
}

/**
 * Verifies cryptographic HMAC-SHA256 signature returned by Razorpay Checkout.
 *
 * Formula:
 *   expectedSignature = HMAC_SHA256(razorpayOrderId + "|" + razorpayPaymentId, keySecret)
 *
 * @param {Object} params
 * @param {string} params.razorpayOrderId
 * @param {string} params.razorpayPaymentId
 * @param {string} params.razorpaySignature
 * @param {string} [params.secretOverride] - Optional secret override for test suites
 * @returns {boolean} True if signature is valid, false otherwise
 */
function verifyPaymentSignature({
  razorpayOrderId,
  razorpayPaymentId,
  razorpaySignature,
  secretOverride = null,
}) {
  if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
    return false;
  }

  const secret = secretOverride || config.razorpay.keySecret || "mock_secret_for_tests";
  const payload = `${razorpayOrderId}|${razorpayPaymentId}`;

  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex");

  // Constant-time comparison to prevent timing-attack vulnerabilities
  const expectedBuf = Buffer.from(expectedSignature, "utf8");
  const actualBuf = Buffer.from(razorpaySignature, "utf8");

  if (expectedBuf.length !== actualBuf.length) {
    return false;
  }

  return crypto.timingSafeEqual(expectedBuf, actualBuf);
}

/**
 * Generates a valid HMAC signature for mock / test suite verification.
 */
function generateTestSignature(razorpayOrderId, razorpayPaymentId, secret = null) {
  const keySecret = secret || config.razorpay.keySecret || "mock_secret_for_tests";
  return crypto
    .createHmac("sha256", keySecret)
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest("hex");
}

/**
 * Validates the HMAC signature on incoming Razorpay Webhooks.
 *
 * @param {Object} params
 * @param {string|Buffer} params.rawBody - Raw unparsed HTTP request body string
 * @param {string} params.signature - Header 'x-razorpay-signature'
 * @param {string} [params.webhookSecret] - Webhook secret from Razorpay Dashboard
 * @returns {boolean}
 */
function verifyWebhookSignature({ rawBody, signature, webhookSecret = null }) {
  if (!rawBody || !signature) {
    return false;
  }

  const secret =
    webhookSecret ||
    config.razorpay.webhookSecret ||
    config.razorpay.keySecret ||
    "mock_webhook_secret";

  let bodyPayload;
  if (Buffer.isBuffer(rawBody) || typeof rawBody === "string") {
    bodyPayload = rawBody;
  } else {
    bodyPayload = JSON.stringify(rawBody);
  }

  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(bodyPayload)
    .digest("hex");

  const expectedBuf = Buffer.from(expectedSignature, "utf8");
  const actualBuf = Buffer.from(signature, "utf8");

  if (expectedBuf.length !== actualBuf.length) {
    return false;
  }

  return crypto.timingSafeEqual(expectedBuf, actualBuf);
}

/**
 * Initiates a refund for a captured payment.
 * @param {Object} params
 * @param {string} params.paymentId - Razorpay Payment ID
 * @param {number} params.amount - Refund amount in INR
 * @param {Object} [params.notes={}]
 */
async function processRefund({ paymentId, amount, notes = {} }) {
  const amountInPaise = Math.round(Number(amount) * 100);

  if (razorpayInstance && !paymentId.startsWith("pay_mock_")) {
    try {
      const refund = await razorpayInstance.payments.refund(paymentId, {
        amount: amountInPaise,
        notes,
      });
      return {
        refundId: refund.id,
        status: refund.status,
        amount: refund.amount / 100,
        isMock: false,
      };
    } catch (error) {
      logger.error(`Razorpay refund failed: ${error.message}`);
      throw new ApiError(502, `Refund failed: ${error.description || error.message}`);
    }
  }

  // Mock refund response
  const mockRefundId = `rfnd_mock_${crypto.randomBytes(8).toString("hex")}`;
  logger.info(`[MOCK REFUND] Refunded ₹${amount} for payment ${paymentId}`);
  return {
    refundId: mockRefundId,
    status: "processed",
    amount: Number(amount),
    isMock: true,
  };
}

module.exports = {
  createRazorpayOrder,
  verifyPaymentSignature,
  generateTestSignature,
  verifyWebhookSignature,
  processRefund,
};
