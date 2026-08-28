// src/queues/notification.queue.js
//
// ─── WHY THIS FILE EXISTS ─────────────────────────────────────────────────────
// Manages the BullMQ 'notifications' queue:
//   Enqueues asynchronous Email (SMTP) and SMS dispatch jobs so third-party
//   network calls never block the HTTP API request/response cycle.
// ─────────────────────────────────────────────────────────────────────────────

const { Queue } = require("bullmq");
const { sharedConnection } = require("./connection");
const logger = require("../config/logger");

const notificationsQueue = new Queue("notifications", {
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

notificationsQueue.on("error", () => {
  // Handle offline redis gracefully
});

/**
 * Enqueues an asynchronous email job with timeout fallback.
 * @param {Object} payload
 * @param {string} payload.to
 * @param {string} payload.subject
 * @param {string} payload.html
 * @returns {Promise<any>}
 */
async function enqueueEmailJob({ to, subject, html }) {
  try {
    const jobPromise = notificationsQueue.add("send-email", { to, subject, html });
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Redis queue timeout")), 1500),
    );
    const job = await Promise.race([jobPromise, timeoutPromise]);
    logger.debug(`[NOTIFICATIONS QUEUE] Enqueued email job ${job.id} to ${to}`);
    return job;
  } catch (err) {
    logger.warn(`[NOTIFICATIONS QUEUE] Failed to enqueue email job to ${to}: ${err.message}. Falling back to inline dispatch.`);
    try {
      const { sendEmail } = require("../services/email.services");
      await sendEmail({ to, subject, html });
    } catch (_) {}
    return { id: `inline-email-${Date.now()}`, data: { to, subject, html } };
  }
}

/**
 * Enqueues an asynchronous SMS OTP job with timeout fallback.
 * @param {Object} payload
 * @param {string} payload.phone
 * @param {string} payload.otp
 * @param {string} [payload.orderNumber]
 * @returns {Promise<any>}
 */
async function enqueueSmsJob({ phone, otp, orderNumber }) {
  try {
    const jobPromise = notificationsQueue.add("send-sms", { phone, otp, orderNumber });
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Redis queue timeout")), 1500),
    );
    const job = await Promise.race([jobPromise, timeoutPromise]);
    logger.debug(`[NOTIFICATIONS QUEUE] Enqueued SMS job ${job.id} to ${phone}`);
    return job;
  } catch (err) {
    logger.warn(`[NOTIFICATIONS QUEUE] Failed to enqueue SMS job to ${phone}: ${err.message}. Falling back to inline dispatch.`);
    try {
      const { sendOtpSms } = require("../services/sms.services");
      await sendOtpSms({ phone, otp, orderNumber });
    } catch (_) {}
    return { id: `inline-sms-${Date.now()}`, data: { phone, otp, orderNumber } };
  }
}

module.exports = {
  notificationsQueue,
  enqueueEmailJob,
  enqueueSmsJob,
};
