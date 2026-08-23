// src/routes/notification.routes.js
//
// ─── WHY THIS ROUTE FILE EXISTS ───────────────────────────────────────────────
// Mounts REST endpoints for the Multi-Channel In-App Notification Center.
// ─────────────────────────────────────────────────────────────────────────────

const express = require("express");
const { requireAuth } = require("../middlewares/auth.middlewares");
const {
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
} = require("../controllers/notification.controllers");

const router = express.Router();

// All notification routes require authenticated session
router.use(requireAuth);

router.get("/", getNotifications);
router.patch("/read-all", markAllAsRead);
router.patch("/:id/read", markAsRead);
router.delete("/:id", deleteNotification);

module.exports = router;
