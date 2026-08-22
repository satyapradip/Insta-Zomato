// src/routes/wallet.routes.js
//
// ─── WHY THIS FILE EXISTS ─────────────────────────────────────────────────────
// Routes for user digital wallet inspection, top-up order generation, and top-up verification.
// ─────────────────────────────────────────────────────────────────────────────

const express = require("express");
const walletController = require("../controllers/wallet.controllers");
const paymentValidators = require("../validators/payment.validators");
const validate = require("../middlewares/validate.middleware");
const {
  requireAuth,
  requireCustomer,
} = require("../middlewares/auth.middlewares");

const router = express.Router();

// All wallet routes require customer authentication
router.use(requireAuth);
router.use(requireCustomer);

// GET /api/wallet — View balance and ledger history
router.get("/", walletController.getWallet);

// POST /api/wallet/topup/create-order — Generate Razorpay top-up order
router.post(
  "/topup/create-order",
  paymentValidators.walletTopupValidator,
  validate,
  walletController.createWalletTopupOrder,
);

// POST /api/wallet/topup/verify — Verify Razorpay signature and credit wallet
router.post(
  "/topup/verify",
  paymentValidators.verifyWalletTopupValidator,
  validate,
  walletController.verifyWalletTopup,
);

module.exports = router;
