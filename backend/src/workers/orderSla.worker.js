// src/workers/orderSla.worker.js
//
// ─── WHY THIS FILE EXISTS ─────────────────────────────────────────────────────
// BullMQ Worker for the 'order-sla' queue.
// Processes delayed SLA expiration jobs:
//   If an order is still PENDING after the SLA window, transitions it to
//   CANCELLED via the Order State Machine, refunds the customer's wallet if
//   paid, and broadcasts real-time & multi-channel notifications.
// ─────────────────────────────────────────────────────────────────────────────

const { Worker } = require("bullmq");
const { sharedConnection } = require("../queues/connection");
const { prisma } = require("../db/prisma");
const { validateTransition } = require("../services/orderStateMachine.services");
const walletService = require("../services/wallet.services");
const { emitToUser, emitToPartner, emitToOrder } = require("../services/socket.services");
const { notifyRecipient } = require("../services/notification.services");
const logger = require("../config/logger");

/**
 * Core business logic for processing an Order SLA timeout.
 * @param {import("bullmq").Job} job
 */
async function processOrderSlaJob(job) {
  const { orderId, orderNumber } = job.data;
  logger.info(`[ORDER SLA WORKER] Processing SLA check for order #${orderNumber} (${orderId})`);

  // 1. Fetch current order state
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      partner: true,
      user: true,
      timeline: true,
    },
  });

  if (!order) {
    logger.warn(`[ORDER SLA WORKER] Order ${orderId} not found. Skipping SLA job.`);
    return { success: true, reason: "order_not_found" };
  }

  // 2. Check if order is still PENDING
  if (order.status !== "PENDING") {
    logger.info(
      `[ORDER SLA WORKER] Order #${order.orderNumber} has progressed to status '${order.status}'. SLA auto-cancellation skipped.`,
    );
    return { success: true, skipped: true, currentStatus: order.status };
  }

  // 3. Validate FSM transition from PENDING -> CANCELLED using state machine
  validateTransition(order.status, "CANCELLED", "admin");

  // 4. Build cancellation snapshot and timeline entries
  const reason = "Auto-cancelled: Restaurant did not confirm order within SLA window";
  const cancellation = {
    reason,
    cancelledBy: "system",
    cancelledAt: new Date(),
    refundStatus: order.paymentStatus === "PAID" ? "PROCESSED" : "NOT_APPLICABLE",
    refundAmount: order.pricing?.grandTotal || 0,
    refundedTo: order.paymentStatus === "PAID" ? "WALLET" : undefined,
  };

  const timelineEntries = [
    {
      status: "CANCELLED",
      note: `Auto-cancelled by system: Restaurant did not confirm within SLA window`,
      actorRole: "system",
    },
  ];

  // 5. If order was paid, credit instant refund to customer wallet
  if (order.paymentStatus === "PAID" && Number(order.pricing?.grandTotal || 0) > 0) {
    const refundAmount = Number(order.pricing.grandTotal);
    const refundTx = await walletService.creditWallet({
      userId: order.userId,
      amount: refundAmount,
      description: `Instant refund for auto-cancelled Order #${order.orderNumber}`,
      orderId: order.id,
      referenceId: `sla_cancel_${order.id}`,
    });
    cancellation.refundTransactionId = refundTx.transaction.id;
    timelineEntries.push({
      status: "CANCELLED",
      note: `Instant refund of ₹${refundAmount} credited to customer In-App Wallet`,
      actorRole: "system",
    });
  }

  // 6. Atomically update order in PostgreSQL
  const updatedOrder = await prisma.order.update({
    where: { id: order.id },
    data: {
      status: "CANCELLED",
      paymentStatus: order.paymentStatus === "PAID" ? "REFUNDED" : order.paymentStatus,
      cancellation,
      timeline: {
        create: timelineEntries,
      },
    },
    include: { items: true, timeline: true, partner: true, user: true },
  });

  // 7. Real-Time Socket.io broadcasts
  emitToPartner(order.partnerId, "order:cancelled", {
    orderId: order.id,
    orderNumber: order.orderNumber,
    reason,
    cancelledBy: "system",
  });
  emitToUser(order.userId, "order:cancelled", {
    orderId: order.id,
    orderNumber: order.orderNumber,
    reason,
    cancelledBy: "system",
  });
  emitToOrder(order.id, "order:status_update", {
    orderId: order.id,
    status: "CANCELLED",
    order: updatedOrder,
  });

  // 8. Multi-Channel Customer Notification
  if (order.user) {
    await notifyRecipient({
      recipientId: order.userId,
      recipientModel: "User",
      type: "ORDER_CANCELLED",
      title: `Order Auto-Cancelled ⚠️`,
      message: `Your order #${order.orderNumber} was cancelled as the restaurant did not confirm in time.${order.paymentStatus === "PAID" ? ` ₹${order.pricing?.grandTotal} has been refunded to your wallet.` : ""}`,
      data: {
        orderId: order.id,
        orderNumber: order.orderNumber,
        refundAmount: cancellation.refundAmount,
      },
      channels: ["IN_APP", "EMAIL"],
      recipientEmail: order.user.email,
    });
  }

  logger.info(
    `[ORDER SLA WORKER] Order #${order.orderNumber} successfully auto-cancelled due to SLA timeout`,
  );
  return { success: true, cancelled: true, orderId: order.id };
}

function createOrderSlaWorker(customConnection = null) {
  const worker = new Worker("order-sla", processOrderSlaJob, {
    connection: customConnection || sharedConnection,
    concurrency: 5,
  });

  worker.on("completed", (job) => {
    logger.info(`[ORDER SLA WORKER] Job ${job.id} completed successfully`);
  });

  worker.on("failed", (job, err) => {
    logger.error(`[ORDER SLA WORKER] Job ${job?.id} failed: ${err.message}`);
  });

  worker.on("error", (err) => {
    logger.error(`[ORDER SLA WORKER] Worker encountered error: ${err.message}`);
  });

  return worker;
}

module.exports = {
  processOrderSlaJob,
  createOrderSlaWorker,
};
