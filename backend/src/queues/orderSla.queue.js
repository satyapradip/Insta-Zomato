// src/queues/orderSla.queue.js
//
// ─── WHY THIS FILE EXISTS ─────────────────────────────────────────────────────
// Manages the BullMQ 'order-sla' queue:
//   Enqueues delayed jobs when an order enters PENDING status to enforce
//   restaurant confirmation SLAs and auto-cancel orders if unconfirmed.
// ─────────────────────────────────────────────────────────────────────────────

const { Queue } = require("bullmq");
const { sharedConnection } = require("./connection");
const config = require("../config/index");
const logger = require("../config/logger");

const orderSlaQueue = new Queue("order-sla", {
  connection: sharedConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 2000,
    },
    removeOnComplete: true,
    removeOnFail: false,
  },
});

orderSlaQueue.on("error", () => {
  // Handle offline redis gracefully
});

/**
 * Schedules a delayed SLA check job for an order.
 * @param {string} orderId
 * @param {string} orderNumber
 * @param {number} [customDelayMs] - Optional override in milliseconds
 * @returns {Promise<any>}
 */
async function scheduleOrderSlaJob(orderId, orderNumber, customDelayMs = null) {
  const delay =
    customDelayMs !== null
      ? customDelayMs
      : (config.order.confirmationTimeoutMinutes || 5) * 60 * 1000;

  try {
    const jobPromise = orderSlaQueue.add(
      "auto-cancel-unconfirmed",
      { orderId, orderNumber },
      {
        jobId: `sla:order:${orderId}`,
        delay,
      },
    );
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Redis queue timeout")), 1500),
    );
    const job = await Promise.race([jobPromise, timeoutPromise]);

    logger.info(
      `[ORDER SLA QUEUE] Scheduled SLA auto-cancel check for order #${orderNumber} (${orderId}) with delay ${delay}ms`,
    );
    return job;
  } catch (err) {
    logger.warn(`[ORDER SLA QUEUE] Failed to enqueue SLA job for order ${orderId}: ${err.message}`);
    return null;
  }
}

module.exports = {
  orderSlaQueue,
  scheduleOrderSlaJob,
};
