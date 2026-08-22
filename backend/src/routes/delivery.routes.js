// src/routes/delivery.routes.js
//
// ─── WHY THIS FILE EXISTS ─────────────────────────────────────────────────────
// Routes for delivery partners (riders):
//   1. PUT /api/delivery/location       - Stream real-time GPS coordinates
//   2. PUT /api/delivery/toggle-online  - Toggle rider online/offline status
//   3. GET /api/delivery/profile        - Rider profile & active delivery order
// ─────────────────────────────────────────────────────────────────────────────

const express = require("express");
const deliveryController = require("../controllers/delivery.controllers");
const {
  requireAuth,
  requireDeliveryPartner,
} = require("../middlewares/auth.middlewares");

const router = express.Router();

// All delivery routes require rider authentication
router.use(requireAuth);
router.use(requireDeliveryPartner);

// Stream real-time GPS location
router.put("/location", deliveryController.updateLocation);

// Toggle online / offline availability
router.put("/toggle-online", deliveryController.toggleOnlineStatus);

// View rider profile & current assignment
router.get("/profile", deliveryController.getDeliveryProfile);

module.exports = router;
