// src/models/notification.models.js
//
// ─── WHY THIS MODEL EXISTS ───────────────────────────────────────────────────
// Centralizes multi-channel notification records (in-app alerts, email logs,
// SMS dispatch status, and real-time push tracking) for Customers, Restaurant
// Partners, and Delivery Riders.
// ─────────────────────────────────────────────────────────────────────────────

const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, "Recipient ID is required"],
      refPath: "recipientModel",
      index: true,
    },
    recipientModel: {
      type: String,
      required: [true, "Recipient model type is required"],
      enum: ["User", "FoodPartner", "DeliveryPartner"],
      default: "User",
    },
    type: {
      type: String,
      required: [true, "Notification type is required"],
      enum: [
        "ORDER_PLACED",
        "ORDER_CONFIRMED",
        "ORDER_PREPARING",
        "ORDER_READY",
        "ORDER_PICKED_UP",
        "ORDER_OUT_FOR_DELIVERY",
        "ORDER_DELIVERED",
        "ORDER_CANCELLED",
        "PAYMENT_SUCCESS",
        "REFUND_CREDITED",
        "OTP_GENERATED",
        "DISCOUNT_ALERT",
        "SYSTEM_ALERT",
      ],
      index: true,
    },
    title: {
      type: String,
      required: [true, "Notification title is required"],
      trim: true,
      maxlength: 120,
    },
    message: {
      type: String,
      required: [true, "Notification message is required"],
      trim: true,
      maxlength: 500,
    },
    data: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    channels: [
      {
        type: String,
        enum: ["IN_APP", "EMAIL", "SMS", "PUSH"],
        default: "IN_APP",
      },
    ],
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    readAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for fast queries: latest unread notifications by recipient
notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });

const Notification = mongoose.model("Notification", notificationSchema);

module.exports = Notification;
