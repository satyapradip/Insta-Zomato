// src/services/sms.services.js
//
// ─── WHY THIS SERVICE EXISTS ───────────────────────────────────────────────────
// Centralizes outbound SMS & Doorstep Delivery OTP dispatch.
// In development, logs OTP messages safely; in production, connects to SMS
// providers like Twilio, Fast2SMS, or AWS SNS.
// ─────────────────────────────────────────────────────────────────────────────

const logger = require("../config/logger");

/**
 * Sends a 4-digit doorstep delivery verification OTP via SMS.
 * @param {Object} options
 * @param {string} options.phone - Customer phone number
 * @param {string} options.otp - 4-digit OTP code (e.g. '8392')
 * @param {string} options.orderNumber - Order identifier (e.g. '#IZ-40921')
 * @returns {Promise<{ success: boolean, messageId?: string }>}
 */
async function sendOtpSms({ phone, otp, orderNumber }) {
  try {
    if (!phone || !otp) {
      logger.warn("Cannot send OTP SMS: Phone or OTP missing", { phone });
      return { success: false, error: "Phone or OTP missing" };
    }

    const message = `Your Insta-Zomato delivery PIN for order ${orderNumber || ""} is: ${otp}. Please share this with the rider only when receiving your order.`;

    // In production, integrate Twilio / Fast2SMS API client here
    logger.info(`📱 [SMS Dispatch (Dev Mode)]: Sent to ${phone} -> "${message}"`);

    return {
      success: true,
      messageId: `sms-mock-${Date.now()}`,
    };
  } catch (error) {
    logger.error("Failed to send OTP SMS:", { error: error.message, phone });
    return { success: false, error: error.message };
  }
}

/**
 * Sends general delivery alert SMS (e.g. Rider arrived at doorstep).
 */
async function sendDeliveryAlertSms({ phone, message }) {
  try {
    if (!phone || !message) return { success: false };

    logger.info(`📱 [SMS Alert (Dev Mode)]: Sent to ${phone} -> "${message}"`);
    return { success: true, messageId: `sms-alert-${Date.now()}` };
  } catch (error) {
    logger.error("Failed to send delivery alert SMS:", { error: error.message });
    return { success: false, error: error.message };
  }
}

module.exports = {
  sendOtpSms,
  sendDeliveryAlertSms,
};
