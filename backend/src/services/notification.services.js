// src/services/notification.services.js
//
// ─── WHY THIS SERVICE EXISTS ───────────────────────────────────────────────────
// Central Multi-Channel Notification Dispatcher.
// Dispatches notifications simultaneously across:
//   1. In-App Database Records (Persistent Notification Center)
//   2. Real-Time Socket.io WebSockets (`notification:new` event)
//   3. Transactional HTML Emails (Nodemailer)
//   4. SMS / Doorstep OTP Dispatch
// ─────────────────────────────────────────────────────────────────────────────

const { prisma } = require("../db/prisma");
const Notification = require("../models/notification.models");
const { emitToUser, emitToPartner, emitToRider } = require("./socket.services");
const { sendEmail, renderOrderInvoiceTemplate, renderOrderDeliveredTemplate } = require("./email.services");
const { sendOtpSms } = require("./sms.services");
const logger = require("../config/logger");

/**
 * Unified notification dispatcher.
 * @param {Object} payload
 * @param {string} payload.recipientId - User/Partner/Rider ID
 * @param {'User'|'FoodPartner'|'DeliveryPartner'} [payload.recipientModel='User']
 * @param {string} payload.type - Notification enum type
 * @param {string} payload.title - Short title
 * @param {string} payload.message - Description
 * @param {Object} [payload.data={}] - Associated metadata (orderId, amount, otp, url)
 * @param {Array<'IN_APP'|'EMAIL'|'SMS'|'PUSH'>} [payload.channels=['IN_APP']]
 * @param {string} [payload.recipientEmail] - Optional email for EMAIL channel
 * @param {string} [payload.recipientPhone] - Optional phone for SMS channel
 * @param {string} [payload.emailHtml] - Pre-rendered HTML email (if custom)
 * @returns {Promise<any>}
 */
async function notifyRecipient({
  recipientId,
  recipientModel = "User",
  type,
  title,
  message,
  data = {},
  channels = ["IN_APP"],
  recipientEmail,
  recipientPhone,
  emailHtml,
}) {
  try {
    // 1. Create In-App Notification in DB
    let notification = null;
    if (channels.includes("IN_APP")) {
      try {
        if (prisma && prisma.notification) {
          notification = await prisma.notification.create({
            data: {
              recipientId: String(recipientId),
              recipientRole: recipientModel.toLowerCase(),
              type: type,
              title,
              message,
              data: data || {},
              channels,
              isRead: false,
            },
          });
        }
      } catch (prismaErr) {
        if (Notification && Notification.create) {
          try {
            notification = await Notification.create({
              recipient: recipientId,
              recipientModel,
              type,
              title,
              message,
              data,
              channels,
              isRead: false,
            });
          } catch (_) {}
        }
      }
    }

    // 2. Real-time WebSocket emission
    const socketPayload = {
      id: notification ? (notification.id || notification._id) : `notif-${Date.now()}`,
      type,
      title,
      message,
      data,
      createdAt: new Date(),
    };

    if (recipientModel === "User") {
      emitToUser(recipientId, "notification:new", socketPayload);
    } else if (recipientModel === "FoodPartner") {
      emitToPartner(recipientId, "notification:new", socketPayload);
    } else if (recipientModel === "DeliveryPartner") {
      emitToRider(recipientId, "notification:new", socketPayload);
    }

    // 3. Email Channel Dispatch (Non-blocking)
    if (channels.includes("EMAIL") && recipientEmail) {
      sendEmail({
        to: recipientEmail,
        subject: title,
        html: emailHtml || `<p>${message}</p>`,
      }).catch((err) => logger.error("Async email dispatch failed:", err));
    }

    // 4. SMS Channel Dispatch (Non-blocking)
    if (channels.includes("SMS") && recipientPhone && data.otp) {
      sendOtpSms({
        phone: recipientPhone,
        otp: data.otp,
        orderNumber: data.orderNumber || "",
      }).catch((err) => logger.error("Async SMS dispatch failed:", err));
    }

    return notification;
  } catch (error) {
    logger.error("Failed in notifyRecipient:", { error: error.message, recipientId, type });
    return null;
  }
}

/**
 * Dispatches multi-channel notification for a newly placed order.
 */
async function notifyOrderPlaced({ order, user, partner }) {
  const invoiceHtml = renderOrderInvoiceTemplate({ order, user, partner });

  return notifyRecipient({
    recipientId: user._id || user.id,
    recipientModel: "User",
    type: "ORDER_PLACED",
    title: `Order Placed Successfully! 🍕`,
    message: `Your order #${order.orderNumber || order._id} from ${partner?.restaurantName || "Restaurant"} is confirmed.`,
    data: {
      orderId: order._id || order.id,
      orderNumber: order.orderNumber,
      totalAmount: order.totalAmount,
      deliveryOtp: order.deliveryOtp,
    },
    channels: ["IN_APP", "EMAIL"],
    recipientEmail: user.email,
    emailHtml: invoiceHtml,
  });
}

/**
 * Dispatches multi-channel notification when an order is out for delivery with OTP.
 */
async function notifyOrderOutForDelivery({ order, user, rider }) {
  return notifyRecipient({
    recipientId: user._id || user.id,
    recipientModel: "User",
    type: "ORDER_OUT_FOR_DELIVERY",
    title: `Order Out For Delivery! 🛵`,
    message: `Rider ${rider?.name || "Partner"} is heading to your doorstep. Security OTP: ${order.deliveryOtp}`,
    data: {
      orderId: order._id || order.id,
      orderNumber: order.orderNumber,
      otp: order.deliveryOtp,
      riderName: rider?.name,
      riderPhone: rider?.phone,
    },
    channels: ["IN_APP", "SMS"],
    recipientPhone: user.phone || user.contactNumber,
  });
}

/**
 * Dispatches notification when order is handed over and delivered.
 */
async function notifyOrderDelivered({ order, user }) {
  const deliveredHtml = renderOrderDeliveredTemplate({ order, user });

  return notifyRecipient({
    recipientId: user._id || user.id,
    recipientModel: "User",
    type: "ORDER_DELIVERED",
    title: `Order Delivered! 🎉`,
    message: `Your food from #${order.orderNumber || order._id} was safely delivered. Enjoy your meal!`,
    data: {
      orderId: order._id || order.id,
      orderNumber: order.orderNumber,
    },
    channels: ["IN_APP", "EMAIL"],
    recipientEmail: user.email,
    emailHtml: deliveredHtml,
  });
}

/**
 * Dispatches notification when a refund is credited to user wallet.
 */
async function notifyRefundCredited({ user, amount, orderNumber }) {
  return notifyRecipient({
    recipientId: user._id || user.id,
    recipientModel: "User",
    type: "REFUND_CREDITED",
    title: `Refund Credited: ₹${amount} 💰`,
    message: `₹${amount} has been refunded to your Insta-Zomato wallet for order #${orderNumber}.`,
    data: {
      amount,
      orderNumber,
    },
    channels: ["IN_APP"],
  });
}

module.exports = {
  notifyRecipient,
  notifyOrderPlaced,
  notifyOrderOutForDelivery,
  notifyOrderDelivered,
  notifyRefundCredited,
};
