// src/services/email.services.js
//
// ─── WHY THIS SERVICE EXISTS ───────────────────────────────────────────────────
// Centralizes outgoing transactional emails for Insta-Zomato:
//   1. Order Invoices & Receipts (HTML breakdown with items & tracking links)
//   2. Real-time Doorstep Delivery OTP emails
//   3. Delivery confirmation and customer welcome templates
// ─────────────────────────────────────────────────────────────────────────────

const nodemailer = require("nodemailer");
const config = require("../config/index");
const logger = require("../config/logger");

let transporter = null;

/**
 * Initializes and returns the active Nodemailer transporter instance.
 */
function getTransporter() {
  if (transporter) return transporter;

  if (config.smtp && config.smtp.host && config.smtp.user) {
    transporter = nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port || 587,
      secure: config.smtp.port === 465,
      auth: {
        user: config.smtp.user,
        pass: config.smtp.pass,
      },
    });
    logger.info("📧 Nodemailer SMTP transporter initialized");
  } else {
    // Development / Test Mock Transporter (Logs email payloads safely)
    transporter = {
      sendMail: async (mailOptions) => {
        logger.info(`[Email Service (Dry-Run / Dev)]: To: ${mailOptions.to} | Subject: "${mailOptions.subject}"`);
        return { messageId: `mock-msg-${Date.now()}`, response: "250 Mock Sent" };
      },
    };
    logger.info("📧 Nodemailer running in Development / Dry-Run mode");
  }

  return transporter;
}

/**
 * Dispatches an email asynchronously with error handling.
 * @param {Object} options
 * @param {string} options.to - Recipient email address
 * @param {string} options.subject - Email subject line
 * @param {string} options.html - Rendered HTML content
 * @param {string} [options.text] - Plain text fallback
 */
async function sendEmail({ to, subject, html, text }) {
  try {
    if (!to) {
      logger.warn("Cannot send email: No recipient email provided");
      return null;
    }

    const mailer = getTransporter();
    const mailOptions = {
      from: config.smtp?.from || '"Insta-Zomato Gourmet" <no-reply@insta-zomato.com>',
      to,
      subject,
      html,
      text: text || "Please open this email in an HTML-compatible client.",
    };

    const info = await mailer.sendMail(mailOptions);
    return info;
  } catch (error) {
    logger.error("Failed to send email:", { error: error.message, to, subject });
    return null;
  }
}

/**
 * Generates a responsive HTML email template for an order invoice/receipt.
 */
function renderOrderInvoiceTemplate({ order, user, partner }) {
  const itemsHtml = (order.items || [])
    .map(
      (item) => `
      <tr style="border-bottom: 1px solid #f0f0f0;">
        <td style="padding: 12px 0; font-family: sans-serif; font-size: 14px; color: #18181b;">
          <strong>${item.quantity}x ${item.title || "Dish"}</strong>
          ${item.variant?.name ? `<div style="font-size: 12px; color: #dc2626;">Size: ${item.variant.name}</div>` : ""}
          ${item.addOns && item.addOns.length ? `<div style="font-size: 11px; color: #71717a;">+ ${item.addOns.map((a) => a.name).join(", ")}</div>` : ""}
        </td>
        <td style="padding: 12px 0; text-align: right; font-family: monospace; font-size: 14px; font-weight: bold; color: #18181b;">
          ₹${((item.price || 0) * (item.quantity || 1)).toFixed(2)}
        </td>
      </tr>
    `
    )
    .join("");

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f4f5f8; margin: 0; padding: 20px; }
          .container { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.05); }
          .header { background: linear-gradient(135deg, #dc2626, #ff5722); padding: 30px 24px; color: #ffffff; text-align: center; }
          .content { padding: 24px; }
          .bill-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 13px; color: #71717a; }
          .total-row { border-top: 2px dashed #e4e4e7; margin-top: 12px; padding-top: 12px; font-size: 16px; font-weight: 900; color: #18181b; }
          .otp-box { background: #fef3c7; border: 1px solid #fde68a; border-radius: 12px; padding: 14px; text-align: center; margin: 20px 0; }
          .cta-btn { display: inline-block; background: #dc2626; color: #ffffff !important; text-decoration: none; padding: 14px 28px; border-radius: 12px; font-weight: bold; font-size: 14px; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0; font-size: 24px; font-weight: 900; letter-spacing: -0.5px;">Insta-Zomato</h1>
            <p style="margin: 6px 0 0 0; font-size: 13px; opacity: 0.9;">Order Invoice & Confirmation</p>
          </div>
          <div class="content">
            <p style="font-size: 15px; color: #18181b; margin-top: 0;">
              Hi <strong>${user?.name || "Foodie"}</strong>, your order has been placed successfully! 🍕
            </p>
            <div style="background: #fafafa; border-radius: 12px; padding: 12px; margin-bottom: 20px; font-size: 12px; color: #52525b;">
              <div><strong>Order Number:</strong> ${order.orderNumber || order._id || "#IZ-ORDER"}</div>
              <div><strong>Restaurant:</strong> ${partner?.restaurantName || "Partner Restaurant"}</div>
              <div><strong>Delivery Address:</strong> ${order.deliveryAddress?.street || "Customer Doorstep"}</div>
            </div>

            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
              ${itemsHtml}
            </table>

            <div style="border-top: 1px solid #f0f0f0; padding-top: 12px;">
              <table style="width: 100%; font-size: 13px; color: #71717a;">
                <tr><td>Item Subtotal</td><td style="text-align: right; font-weight: 600; color: #18181b;">₹${(order.subtotal || 0).toFixed(2)}</td></tr>
                <tr><td>Delivery Fee</td><td style="text-align: right; font-weight: 600; color: #18181b;">₹${(order.deliveryFee || 0).toFixed(2)}</td></tr>
                <tr><td>Platform & Tax (GST 5%)</td><td style="text-align: right; font-weight: 600; color: #18181b;">₹${((order.tax || 0) + (order.platformFee || 0)).toFixed(2)}</td></tr>
                ${order.discountAmount ? `<tr><td style="color: #10b981;">Coupon Discount</td><td style="text-align: right; font-weight: bold; color: #10b981;">-₹${order.discountAmount.toFixed(2)}</td></tr>` : ""}
                <tr style="font-size: 16px; font-weight: 900; color: #18181b; border-top: 1px solid #e4e4e7;">
                  <td style="padding-top: 8px;">Total Paid</td>
                  <td style="text-align: right; padding-top: 8px; color: #dc2626;">₹${(order.totalAmount || 0).toFixed(2)}</td>
                </tr>
              </table>
            </div>

            ${
              order.deliveryOtp
                ? `
              <div class="otp-box">
                <div style="font-size: 11px; font-weight: bold; color: #b45309; text-transform: uppercase; letter-spacing: 0.5px;">Doorstep Delivery OTP</div>
                <div style="font-size: 28px; font-weight: 900; color: #b45309; letter-spacing: 6px; margin: 4px 0;">${order.deliveryOtp}</div>
                <div style="font-size: 10px; color: #78350f;">Share this PIN with your rider only upon delivery handover.</div>
              </div>
            `
                : ""
            }

            <div style="text-align: center; margin-top: 10px;">
              <a href="http://localhost:3000/order/${order._id || order.id}/track" class="cta-btn">
                Track Live Order GPS ➔
              </a>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;
}

/**
 * Generates an HTML email for order delivered confirmation.
 */
function renderOrderDeliveredTemplate({ order, user }) {
  return `
    <!DOCTYPE html>
    <html>
      <body style="font-family: sans-serif; background-color: #f4f5f8; padding: 20px;">
        <div style="max-width: 540px; margin: 0 auto; background: #ffffff; border-radius: 16px; padding: 24px; text-align: center;">
          <div style="font-size: 40px; margin-bottom: 12px;">🎉</div>
          <h2 style="color: #18181b; margin: 0 0 8px 0;">Your Order Was Delivered!</h2>
          <p style="font-size: 14px; color: #71717a; margin-top: 0;">
            Order <strong>${order.orderNumber || order._id}</strong> has been handed over safely at your doorstep.
          </p>
          <p style="font-size: 14px; color: #18181b; font-weight: bold;">
            Enjoy your delicious gourmet meal! 😋
          </p>
          <a href="http://localhost:3000/orders" style="display: inline-block; background: #dc2626; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 10px; font-weight: bold; margin-top: 12px;">
            Rate Your Food & Rider ⭐
          </a>
        </div>
      </body>
    </html>
  `;
}

module.exports = {
  sendEmail,
  renderOrderInvoiceTemplate,
  renderOrderDeliveredTemplate,
  getTransporter,
};
