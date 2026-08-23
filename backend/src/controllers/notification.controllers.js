// src/controllers/notification.controllers.js
//
// ─── WHY THIS CONTROLLER EXISTS ───────────────────────────────────────────────
// Exposes REST API endpoints for the In-App Notification Center:
//   1. GET /api/notifications — Retrieve paginated notifications & unread count
//   2. PATCH /api/notifications/:id/read — Mark single notification as read
//   3. PATCH /api/notifications/read-all — Mark all user notifications as read
//   4. DELETE /api/notifications/:id — Remove notification
// ─────────────────────────────────────────────────────────────────────────────

const { prisma } = require("../db/prisma");
const Notification = require("../models/notification.models");
const ApiResponse = require("../utils/ApiResponse");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");

/**
 * Resolves authenticated recipient ID and model from request.
 */
function getRecipientFromReq(req) {
  if (req.user) {
    return { id: String(req.user._id || req.user.id), model: "User" };
  }
  if (req.foodPartner) {
    return { id: String(req.foodPartner._id || req.foodPartner.id), model: "FoodPartner" };
  }
  if (req.deliveryPartner) {
    return { id: String(req.deliveryPartner._id || req.deliveryPartner.id), model: "DeliveryPartner" };
  }
  return null;
}

/**
 * Get paginated notifications for the authenticated user/partner.
 */
const getNotifications = asyncHandler(async (req, res) => {
  const recipient = getRecipientFromReq(req);
  if (!recipient) {
    throw new ApiError(401, "Authentication required to view notifications");
  }

  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));
  const skip = (page - 1) * limit;

  let notifications = [];
  let totalCount = 0;
  let unreadCount = 0;

  try {
    if (prisma && prisma.notification) {
      const where = { recipientId: recipient.id };
      if (req.query.unreadOnly === "true") {
        where.isRead = false;
      }

      [notifications, totalCount, unreadCount] = await Promise.all([
        prisma.notification.findMany({
          where,
          orderBy: { createdAt: "desc" },
          skip,
          take: limit,
        }),
        prisma.notification.count({ where }),
        prisma.notification.count({ where: { recipientId: recipient.id, isRead: false } }),
      ]);
    }
  } catch (_) {
    // Fallback to Mongoose
    if (Notification) {
      const filter = { recipient: recipient.id };
      if (req.query.unreadOnly === "true") {
        filter.isRead = false;
      }
      [notifications, totalCount, unreadCount] = await Promise.all([
        Notification.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
        Notification.countDocuments(filter),
        Notification.countDocuments({ recipient: recipient.id, isRead: false }),
      ]);
    }
  }

  const formattedNotifications = notifications.map((n) => ({
    ...n,
    _id: n.id || n._id,
  }));

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        notifications: formattedNotifications,
        unreadCount,
        pagination: {
          total: totalCount,
          page,
          limit,
          totalPages: Math.ceil(totalCount / limit) || 1,
        },
      },
      "Notifications retrieved successfully"
    )
  );
});

/**
 * Mark a single notification as read.
 */
const markAsRead = asyncHandler(async (req, res) => {
  const recipient = getRecipientFromReq(req);
  if (!recipient) {
    throw new ApiError(401, "Authentication required");
  }

  const { id } = req.params;
  let notification = null;

  try {
    if (prisma && prisma.notification) {
      notification = await prisma.notification.update({
        where: { id },
        data: { isRead: true, readAt: new Date() },
      });
    }
  } catch (_) {
    if (Notification) {
      notification = await Notification.findOneAndUpdate(
        { _id: id, recipient: recipient.id },
        { isRead: true, readAt: new Date() },
        { new: true }
      );
    }
  }

  if (!notification) {
    throw new ApiError(404, "Notification not found or access denied");
  }

  return res.status(200).json(
    new ApiResponse(200, { notification: { ...notification, _id: notification.id || notification._id } }, "Notification marked as read")
  );
});

/**
 * Mark all notifications for the authenticated recipient as read.
 */
const markAllAsRead = asyncHandler(async (req, res) => {
  const recipient = getRecipientFromReq(req);
  if (!recipient) {
    throw new ApiError(401, "Authentication required");
  }

  let modifiedCount = 0;

  try {
    if (prisma && prisma.notification) {
      const result = await prisma.notification.updateMany({
        where: { recipientId: recipient.id, isRead: false },
        data: { isRead: true, readAt: new Date() },
      });
      modifiedCount = result.count;
    }
  } catch (_) {
    if (Notification) {
      const result = await Notification.updateMany(
        { recipient: recipient.id, isRead: false },
        { isRead: true, readAt: new Date() }
      );
      modifiedCount = result.modifiedCount;
    }
  }

  return res.status(200).json(
    new ApiResponse(200, { modifiedCount }, "All notifications marked as read")
  );
});

/**
 * Delete a notification.
 */
const deleteNotification = asyncHandler(async (req, res) => {
  const recipient = getRecipientFromReq(req);
  if (!recipient) {
    throw new ApiError(401, "Authentication required");
  }

  const { id } = req.params;

  try {
    if (prisma && prisma.notification) {
      await prisma.notification.delete({ where: { id } });
    }
  } catch (_) {
    if (Notification) {
      await Notification.findOneAndDelete({ _id: id, recipient: recipient.id });
    }
  }

  return res.status(200).json(
    new ApiResponse(200, null, "Notification deleted successfully")
  );
});

module.exports = {
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
};
