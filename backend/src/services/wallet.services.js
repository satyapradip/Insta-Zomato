// src/services/wallet.services.js
//
// ─── WHY THIS FILE EXISTS ─────────────────────────────────────────────────────
// Manages the In-App Digital Wallet Ledger:
//   1. Atomic balance credits (top-ups, instant order cancellation refunds)
//   2. Atomic balance debits (1-tap checkout)
//   3. Double-entry transaction history ledger for audit compliance
// ─────────────────────────────────────────────────────────────────────────────

const { prisma } = require("../db/prisma");
const ApiError = require("../utils/ApiError");
const logger = require("../config/logger");

/**
 * Retrieves the user's wallet, creating it automatically if it does not exist yet.
 * @param {string} userId
 * @returns {Promise<Object>} Wallet record with recent transactions
 */
async function getOrCreateWallet(userId) {
  let wallet = await prisma.wallet.findUnique({
    where: { userId },
    include: {
      transactions: {
        take: 10,
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!wallet) {
    wallet = await prisma.wallet.create({
      data: {
        userId,
        balance: 0,
        currency: "INR",
        isActive: true,
      },
      include: {
        transactions: true,
      },
    });
    logger.info(`Initialized fresh digital wallet for user: ${userId}`);
  }

  return wallet;
}

/**
 * Atomically credits money to a user's wallet and records an immutable ledger entry.
 *
 * @param {Object} params
 * @param {string} params.userId
 * @param {number} params.amount - Amount in INR (positive number)
 * @param {string} params.description - Human-readable note (e.g. "Refund for Order #IZ-2026-X")
 * @param {string} [params.orderId] - Associated order ID if applicable
 * @param {string} [params.referenceId] - Gateway payment / refund ID
 * @returns {Promise<{ wallet: Object, transaction: Object }>}
 */
async function creditWallet({ userId, amount, description, orderId = null, referenceId = null }) {
  const numAmount = Math.round(Number(amount) * 100) / 100;
  if (!numAmount || numAmount <= 0) {
    throw new ApiError(400, "Credit amount must be greater than 0");
  }

  return await prisma.$transaction(async (tx) => {
    // 1. Get or create wallet inside transaction
    let wallet = await tx.wallet.findUnique({ where: { userId } });
    if (!wallet) {
      wallet = await tx.wallet.create({
        data: { userId, balance: 0, currency: "INR", isActive: true },
      });
    }

    if (!wallet.isActive) {
      throw new ApiError(403, "This wallet has been disabled or suspended");
    }

    // 2. Compute updated balance
    const newBalance = Math.round((wallet.balance + numAmount) * 100) / 100;

    // 3. Update wallet balance
    const updatedWallet = await tx.wallet.update({
      where: { id: wallet.id },
      data: { balance: newBalance },
    });

    // 4. Create immutable ledger transaction
    const transaction = await tx.walletTransaction.create({
      data: {
        walletId: wallet.id,
        type: "CREDIT",
        amount: numAmount,
        balanceAfter: newBalance,
        description: description || "Wallet balance credited",
        orderId,
        referenceId,
      },
    });

    logger.info(`[WALLET CREDIT] User ${userId} +₹${numAmount} | New Balance: ₹${newBalance}`);
    return { wallet: updatedWallet, transaction };
  });
}

/**
 * Atomically debits money from a user's wallet with balance validation.
 *
 * @param {Object} params
 * @param {string} params.userId
 * @param {number} params.amount - Amount in INR
 * @param {string} params.description - Human-readable note (e.g. "Payment for Order #IZ-2026-X")
 * @param {string} [params.orderId]
 * @param {string} [params.referenceId]
 * @returns {Promise<{ wallet: Object, transaction: Object }>}
 */
async function debitWallet({ userId, amount, description, orderId = null, referenceId = null }) {
  const numAmount = Math.round(Number(amount) * 100) / 100;
  if (!numAmount || numAmount <= 0) {
    throw new ApiError(400, "Debit amount must be greater than 0");
  }

  return await prisma.$transaction(async (tx) => {
    const wallet = await tx.wallet.findUnique({ where: { userId } });

    if (!wallet) {
      throw new ApiError(404, "Wallet not found. Please initialize your wallet first.");
    }

    if (!wallet.isActive) {
      throw new ApiError(403, "This wallet has been disabled or suspended");
    }

    if (wallet.balance < numAmount) {
      throw new ApiError(
        400,
        `Insufficient wallet balance. Required: ₹${numAmount}, Available: ₹${wallet.balance}`,
      );
    }

    const newBalance = Math.round((wallet.balance - numAmount) * 100) / 100;

    const updatedWallet = await tx.wallet.update({
      where: { id: wallet.id },
      data: { balance: newBalance },
    });

    const transaction = await tx.walletTransaction.create({
      data: {
        walletId: wallet.id,
        type: "DEBIT",
        amount: numAmount,
        balanceAfter: newBalance,
        description: description || "Wallet balance debited",
        orderId,
        referenceId,
      },
    });

    logger.info(`[WALLET DEBIT] User ${userId} -₹${numAmount} | Remaining Balance: ₹${newBalance}`);
    return { wallet: updatedWallet, transaction };
  });
}

/**
 * Retrieves paginated transaction history for a user's wallet.
 */
async function getWalletTransactions(userId, { page = 1, limit = 20 } = {}) {
  const wallet = await getOrCreateWallet(userId);
  const skip = (Number(page) - 1) * Number(limit);

  const [transactions, total] = await Promise.all([
    prisma.walletTransaction.findMany({
      where: { walletId: wallet.id },
      orderBy: { createdAt: "desc" },
      skip,
      take: Number(limit),
    }),
    prisma.walletTransaction.count({
      where: { walletId: wallet.id },
    }),
  ]);

  return {
    wallet: {
      id: wallet.id,
      balance: wallet.balance,
      currency: wallet.currency,
      isActive: wallet.isActive,
    },
    transactions,
    pagination: {
      currentPage: Number(page),
      totalPages: Math.ceil(total / Number(limit)),
      totalTransactions: total,
      hasNext: skip + transactions.length < total,
    },
  };
}

module.exports = {
  getOrCreateWallet,
  creditWallet,
  debitWallet,
  getWalletTransactions,
};
