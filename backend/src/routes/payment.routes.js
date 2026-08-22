// src/routes/payment.routes.js
//
// ─── WHY THIS FILE EXISTS ─────────────────────────────────────────────────────
// Routes for Razorpay payment lifecycle and in-app wallet 1-tap checkout.
// ─────────────────────────────────────────────────────────────────────────────

const express = require("express");
const paymentController = require("../controllers/payment.controllers");
const paymentValidators = require("../validators/payment.validators");
const validate = require("../middlewares/validate.middleware");
const {
  requireAuth,
  requireCustomer,
} = require("../middlewares/auth.middlewares");

const router = express.Router();

// ── Webhook Endpoint (Public server-to-server with HMAC verification) ────────
// Razorpay ping directly to this endpoint with x-razorpay-signature header
router.post("/webhook", paymentController.handleRazorpayWebhook);

// ── Customer Protected Routes ────────────────────────────────────────────────
router.use(requireAuth);
router.use(requireCustomer);

// POST /api/payment/create-order — Initialize Razorpay order
router.post(
  "/create-order",
  paymentValidators.createOrderPaymentValidator,
  validate,
  paymentController.createOrderPayment,
);

// POST /api/payment/verify — Cryptographically verify payment & confirm order
router.post(
  "/verify",
  paymentValidators.verifyOrderPaymentValidator,
  validate,
  paymentController.verifyOrderPayment,
);

// POST /api/payment/wallet-pay — Instant 1-tap payment via In-App Wallet
router.post(
  "/wallet-pay",
  paymentValidators.walletPayValidator,
  validate,
  paymentController.payWithWallet,
);

module.exports = router;
