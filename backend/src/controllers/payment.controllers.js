// src/controllers/payment.controllers.js
//
// ─── WHY THIS FILE EXISTS ─────────────────────────────────────────────────────
// Orchestrates the payment lifecycle:
//   1. Generates gateway checkout orders via Razorpay
//   2. Verifies cryptographic payment signatures after checkout
//   3. Processes asynchronous webhooks with idempotent safety
//   4. Executes instant 1-tap checkout from user's digital wallet
// ─────────────────────────────────────────────────────────────────────────────

const { prisma } = require("../db/prisma");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const logger = require("../config/logger");
const paymentService = require("../services/payment.services");
const walletService = require("../services/wallet.services");

/**
 * Initiates Razorpay payment for a customer's order.
 * POST /api/payment/create-order
 */
const createOrderPayment = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { orderId } = req.body;

  // 1. Fetch order & verify ownership
  const order = await prisma.order.findFirst({
    where: { id: orderId, userId },
  });

  if (!order) {
    throw new ApiError(404, "Order not found or does not belong to you");
  }

  if (order.status === "CANCELLED" || order.status === "FAILED") {
    throw new ApiError(400, `Cannot pay for an order in status '${order.status}'`);
  }

  if (order.paymentStatus === "PAID") {
    throw new ApiError(400, "This order has already been paid");
  }

  const grandTotal = Number(order.pricing?.grandTotal || 0);
  if (grandTotal <= 0) {
    throw new ApiError(400, "Invalid order amount");
  }

  // 2. Create Razorpay Order
  const razorpayOrder = await paymentService.createRazorpayOrder({
    amount: grandTotal,
    receipt: order.orderNumber,
    notes: {
      orderId: order.id,
      orderNumber: order.orderNumber,
      userId,
    },
  });

  // 3. Update Order with Razorpay Order ID & payment method
  await prisma.order.update({
    where: { id: order.id },
    data: {
      razorpayOrderId: razorpayOrder.id,
      paymentMethod: "RAZORPAY",
    },
  });

  // 4. Create / update initial PaymentRecord
  await prisma.paymentRecord.create({
    data: {
      orderId: order.id,
      userId,
      razorpayOrderId: razorpayOrder.id,
      amount: grandTotal,
      currency: razorpayOrder.currency || "INR",
      status: "PENDING",
      method: "RAZORPAY",
      metadata: {
        isMock: razorpayOrder.isMock,
        receipt: razorpayOrder.receipt,
      },
    },
  });

  res.status(200).json(
    new ApiResponse(
      200,
      {
        orderId: order.id,
        orderNumber: order.orderNumber,
        razorpayOrderId: razorpayOrder.id,
        amount: razorpayOrder.amount, // in paise for Razorpay Checkout
        amountInRupees: grandTotal,
        currency: razorpayOrder.currency,
        keyId: razorpayOrder.keyId,
        isMock: razorpayOrder.isMock,
      },
      "Razorpay payment order initialized successfully",
    ),
  );
});

/**
 * Verifies cryptographic HMAC-SHA256 signature and confirms payment.
 * POST /api/payment/verify
 */
const verifyOrderPayment = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { orderId, razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;

  // 1. Fetch order
  const order = await prisma.order.findFirst({
    where: { id: orderId, userId },
  });

  if (!order) {
    throw new ApiError(404, "Order not found or does not belong to you");
  }

  if (order.paymentStatus === "PAID") {
    return res.status(200).json(
      new ApiResponse(
        200,
        { orderId: order.id, paymentStatus: "PAID" },
        "Order has already been confirmed and paid",
      ),
    );
  }

  // 2. Cryptographic signature check
  const isValid = paymentService.verifyPaymentSignature({
    razorpayOrderId,
    razorpayPaymentId,
    razorpaySignature,
  });

  if (!isValid) {
    logger.warn(
      `[SECURITY ALERT] Invalid payment signature attempt! Order: ${orderId}, User: ${userId}`,
    );

    // Record failed payment attempt for security auditing
    await prisma.paymentRecord.create({
      data: {
        orderId: order.id,
        userId,
        razorpayOrderId,
        razorpayPaymentId,
        razorpaySignature,
        amount: Number(order.pricing?.grandTotal || 0),
        status: "FAILED",
        failureReason: "HMAC signature mismatch — Tampering detected",
      },
    });

    throw new ApiError(
      400,
      "Payment verification failed: Invalid cryptographic signature (Potential tampering detected)",
    );
  }

  // 3. Atomically update Order and Payment Records
  const updatedOrder = await prisma.$transaction(async (tx) => {
    // Record successful payment
    await tx.paymentRecord.create({
      data: {
        orderId: order.id,
        userId,
        razorpayOrderId,
        razorpayPaymentId,
        razorpaySignature,
        amount: Number(order.pricing?.grandTotal || 0),
        status: "PAID",
        method: "RAZORPAY",
      },
    });

    // Update order payment status and timeline
    return await tx.order.update({
      where: { id: order.id },
      data: {
        paymentStatus: "PAID",
        paymentMethod: "RAZORPAY",
        razorpayPaymentId,
        razorpayOrderId,
        timeline: {
          create: [
            {
              status: order.status,
              note: `Payment of ₹${order.pricing?.grandTotal} successfully verified via Razorpay (Payment ID: ${razorpayPaymentId})`,
              actorRole: "customer",
              actorId: userId,
            },
          ],
        },
      },
      include: {
        items: true,
        timeline: true,
      },
    });
  });

  logger.info(
    `[PAYMENT SUCCESS] Order ${order.orderNumber} successfully paid (₹${order.pricing?.grandTotal})`,
  );

  res.status(200).json(
    new ApiResponse(
      200,
      {
        orderId: updatedOrder.id,
        orderNumber: updatedOrder.orderNumber,
        paymentStatus: "PAID",
        paymentMethod: "RAZORPAY",
        razorpayPaymentId,
      },
      "Payment verified and order confirmed successfully",
    ),
  );
});

/**
 * Handles incoming server-to-server Razorpay Webhooks.
 * POST /api/payment/webhook
 */
const handleRazorpayWebhook = asyncHandler(async (req, res) => {
  const signature = req.headers["x-razorpay-signature"];

  // Webhooks must be verified using the raw body buffer/string
  const rawBody = req.rawBody || req.body;

  const isValid = paymentService.verifyWebhookSignature({
    rawBody,
    signature,
  });

  if (!isValid) {
    logger.warn("[SECURITY ALERT] Received Razorpay Webhook with invalid signature");
    return res.status(400).json({ error: "Invalid webhook signature" });
  }

  const event = req.body.event;
  const payload = req.body.payload;

  logger.info(`[WEBHOOK RECEIVED] Event: ${event}`);

  // ── Event: payment.captured or order.paid ─────────────────────────────────
  if (event === "payment.captured" || event === "order.paid") {
    const paymentEntity = payload?.payment?.entity;
    const razorpayOrderId = paymentEntity?.order_id;
    const razorpayPaymentId = paymentEntity?.id;
    const amountInRupees = (paymentEntity?.amount || 0) / 100;

    if (razorpayOrderId) {
      const order = await prisma.order.findFirst({
        where: { razorpayOrderId },
      });

      if (order && order.paymentStatus !== "PAID") {
        await prisma.$transaction(async (tx) => {
          await tx.order.update({
            where: { id: order.id },
            data: {
              paymentStatus: "PAID",
              razorpayPaymentId,
              timeline: {
                create: [
                  {
                    status: order.status,
                    note: `Payment of ₹${amountInRupees} verified via asynchronous Razorpay Webhook (${event})`,
                    actorRole: "system",
                  },
                ],
              },
            },
          });

          await tx.paymentRecord.create({
            data: {
              orderId: order.id,
              userId: order.userId,
              razorpayOrderId,
              razorpayPaymentId,
              amount: amountInRupees,
              status: "PAID",
              method: "RAZORPAY",
              metadata: { event, webhookId: req.body?.account_id },
            },
          });
        });

        logger.info(`[WEBHOOK SYNC] Order ${order.orderNumber} marked PAID via webhook`);
      }
    }
  }

  // ── Event: payment.failed ──────────────────────────────────────────────────
  else if (event === "payment.failed") {
    const paymentEntity = payload?.payment?.entity;
    const razorpayOrderId = paymentEntity?.order_id;
    const errorDesc = paymentEntity?.error_description || "Payment failed at bank";

    if (razorpayOrderId) {
      const order = await prisma.order.findFirst({ where: { razorpayOrderId } });
      if (order) {
        await prisma.paymentRecord.create({
          data: {
            orderId: order.id,
            userId: order.userId,
            razorpayOrderId,
            razorpayPaymentId: paymentEntity?.id,
            amount: (paymentEntity?.amount || 0) / 100,
            status: "FAILED",
            failureReason: errorDesc,
          },
        });
      }
    }
  }

  // ── Event: refund.processed ────────────────────────────────────────────────
  else if (event === "refund.processed") {
    const refundEntity = payload?.refund?.entity;
    const paymentId = refundEntity?.payment_id;

    if (paymentId) {
      const order = await prisma.order.findFirst({
        where: { razorpayPaymentId: paymentId },
      });
      if (order) {
        await prisma.order.update({
          where: { id: order.id },
          data: {
            paymentStatus: "REFUNDED",
            timeline: {
              create: [
                {
                  status: order.status,
                  note: `Refund of ₹${(refundEntity.amount || 0) / 100} confirmed via Webhook`,
                  actorRole: "system",
                },
              ],
            },
          },
        });
      }
    }
  }

  res.status(200).json({ received: true, event });
});

/**
 * 1-Tap Checkout using In-App Digital Wallet balance.
 * POST /api/payment/wallet-pay
 */
const payWithWallet = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { orderId } = req.body;

  const order = await prisma.order.findFirst({
    where: { id: orderId, userId },
  });

  if (!order) {
    throw new ApiError(404, "Order not found or does not belong to you");
  }

  if (order.status === "CANCELLED" || order.status === "FAILED") {
    throw new ApiError(400, `Cannot pay for an order in status '${order.status}'`);
  }

  if (order.paymentStatus === "PAID") {
    throw new ApiError(400, "This order has already been paid");
  }

  const grandTotal = Number(order.pricing?.grandTotal || 0);

  // 1. Atomically debit customer wallet
  const debitResult = await walletService.debitWallet({
    userId,
    amount: grandTotal,
    description: `Payment for Order #${order.orderNumber}`,
    orderId: order.id,
  });

  // 2. Mark order PAID
  const updatedOrder = await prisma.order.update({
    where: { id: order.id },
    data: {
      paymentStatus: "PAID",
      paymentMethod: "WALLET",
      timeline: {
        create: [
          {
            status: order.status,
            note: `Payment of ₹${grandTotal} completed instantly via In-App Wallet`,
            actorRole: "customer",
            actorId: userId,
          },
        ],
      },
    },
    include: { items: true, timeline: true },
  });

  // 3. Create PaymentRecord
  await prisma.paymentRecord.create({
    data: {
      orderId: order.id,
      userId,
      amount: grandTotal,
      status: "PAID",
      method: "WALLET",
      metadata: { transactionId: debitResult.transaction.id },
    },
  });

  res.status(200).json(
    new ApiResponse(
      200,
      {
        orderId: updatedOrder.id,
        orderNumber: updatedOrder.orderNumber,
        paymentStatus: "PAID",
        paymentMethod: "WALLET",
        walletBalance: debitResult.wallet.balance,
      },
      "Payment completed successfully using your In-App Wallet",
    ),
  );
});

module.exports = {
  createOrderPayment,
  verifyOrderPayment,
  handleRazorpayWebhook,
  payWithWallet,
};
