// src/controllers/wallet.controllers.js
//
// ─── WHY THIS FILE EXISTS ─────────────────────────────────────────────────────
// Manages the user's in-app wallet:
//   1. Inspecting current balance and transaction history
//   2. Initiating wallet top-up via Razorpay
//   3. Cryptographically verifying top-up payment and crediting balance
// ─────────────────────────────────────────────────────────────────────────────

const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const walletService = require("../services/wallet.services");
const paymentService = require("../services/payment.services");

/**
 * Gets user's current wallet and paginated transaction ledger.
 * GET /api/wallet
 */
const getWallet = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { page = 1, limit = 20 } = req.query;

  const result = await walletService.getWalletTransactions(userId, { page, limit });

  res
    .status(200)
    .json(new ApiResponse(200, result, "Wallet details retrieved successfully"));
});

/**
 * Initiates Razorpay payment order for wallet top-up.
 * POST /api/wallet/topup/create-order
 */
const createWalletTopupOrder = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { amount } = req.body;

  const numAmount = Number(amount);
  if (!numAmount || numAmount < 1) {
    throw new ApiError(400, "Top-up amount must be at least ₹1");
  }

  const receipt = `wtop_${Date.now()}`;
  const razorpayOrder = await paymentService.createRazorpayOrder({
    amount: numAmount,
    receipt,
    notes: {
      type: "WALLET_TOPUP",
      userId,
    },
  });

  res.status(200).json(
    new ApiResponse(
      200,
      {
        razorpayOrderId: razorpayOrder.id,
        amount: razorpayOrder.amount, // in paise
        amountInRupees: numAmount,
        currency: razorpayOrder.currency,
        keyId: razorpayOrder.keyId,
        isMock: razorpayOrder.isMock,
      },
      "Wallet top-up order generated successfully",
    ),
  );
});

/**
 * Verifies Razorpay payment signature and credits the user's digital wallet.
 * POST /api/wallet/topup/verify
 */
const verifyWalletTopup = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { razorpayOrderId, razorpayPaymentId, razorpaySignature, amount } = req.body;

  const numAmount = Number(amount);
  if (!numAmount || numAmount <= 0) {
    throw new ApiError(400, "Invalid top-up amount");
  }

  // 1. Verify HMAC cryptographic signature
  const isValid = paymentService.verifyPaymentSignature({
    razorpayOrderId,
    razorpayPaymentId,
    razorpaySignature,
  });

  if (!isValid) {
    throw new ApiError(
      400,
      "Top-up verification failed: Invalid cryptographic signature (Potential tampering detected)",
    );
  }

  // 2. Atomically credit user's wallet
  const creditResult = await walletService.creditWallet({
    userId,
    amount: numAmount,
    description: `Wallet top-up via Razorpay (ID: ${razorpayPaymentId})`,
    referenceId: razorpayPaymentId,
  });

  res.status(200).json(
    new ApiResponse(
      200,
      {
        balance: creditResult.wallet.balance,
        transaction: creditResult.transaction,
      },
      `₹${numAmount} successfully added to your In-App Wallet`,
    ),
  );
});

module.exports = {
  getWallet,
  createWalletTopupOrder,
  verifyWalletTopup,
};
