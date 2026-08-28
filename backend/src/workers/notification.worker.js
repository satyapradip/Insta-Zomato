// src/workers/notification.worker.js
//
// ─── WHY THIS FILE EXISTS ─────────────────────────────────────────────────────
// BullMQ Worker for the 'notifications' queue.
// Offloads asynchronous email (SMTP/Nodemailer) and SMS dispatch so that
// high-latency external network I/O never blocks the HTTP API server.
// ─────────────────────────────────────────────────────────────────────────────

const { Worker } = require("bullmq");
const { sharedConnection } = require("../queues/connection");
const { sendEmail } = require("../services/email.services");
const { sendOtpSms } = require("../services/sms.services");
const logger = require("../config/logger");

/**
 * Core business logic for processing Notification queue jobs.
 * @param {import("bullmq").Job} job
 */
async function processNotificationJob(job) {
  const { name, data } = job;
  logger.info(`[NOTIFICATION WORKER] Processing job ${job.id} (${name})`);

  if (name === "send-email") {
    const { to, subject, html } = data;
    if (!to) throw new Error("Missing recipient email address");

    await sendEmail({ to, subject, html });
    logger.info(`[NOTIFICATION WORKER] Email dispatched successfully to ${to}`);
    return { success: true, channel: "EMAIL", to };
  }

  if (name === "send-sms") {
    const { phone, otp, orderNumber } = data;
    if (!phone || !otp) throw new Error("Missing recipient phone or OTP");

    await sendOtpSms({ phone, otp, orderNumber });
    logger.info(`[NOTIFICATION WORKER] SMS dispatched successfully to ${phone}`);
    return { success: true, channel: "SMS", phone };
  }

  logger.warn(`[NOTIFICATION WORKER] Unknown job name '${name}'. Skipping.`);
  return { success: false, reason: "unknown_job_name" };
}

function createNotificationWorker(customConnection = null) {
  const worker = new Worker("notifications", processNotificationJob, {
    connection: customConnection || sharedConnection,
    concurrency: 10,
  });

  worker.on("completed", (job) => {
    logger.info(`[NOTIFICATION WORKER] Job ${job.id} completed successfully`);
  });

  worker.on("failed", (job, err) => {
    logger.error(`[NOTIFICATION WORKER] Job ${job?.id} failed: ${err.message}`);
  });

  worker.on("error", (err) => {
    logger.error(`[NOTIFICATION WORKER] Worker encountered error: ${err.message}`);
  });

  return worker;
}

module.exports = {
  processNotificationJob,
  createNotificationWorker,
};
