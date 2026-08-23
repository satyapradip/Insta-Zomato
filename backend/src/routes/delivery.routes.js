// src/routes/delivery.routes.js
//
// ─── WHY THIS FILE EXISTS ─────────────────────────────────────────────────────
// Routes for delivery partners (riders):
//   1. PUT /api/delivery/location          - Stream real-time GPS coordinates
//   2. PUT /api/delivery/toggle-online     - Toggle rider online/offline status
//   3. GET /api/delivery/profile           - Rider profile & active delivery order
//   4. GET /api/delivery/orders/available  - View available orders nearby
//   5. POST /api/delivery/orders/:id/accept - Accept dispatch proposal
//   6. POST /api/delivery/orders/:id/reject - Reject dispatch proposal
//   7. GET /api/delivery/earnings          - View trip earnings breakdown
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

// Available orders & dispatch actions
router.get("/orders/available", deliveryController.getAvailableOrders);
router.post("/orders/:id/accept", deliveryController.acceptOrder);
router.post("/orders/:id/reject", deliveryController.rejectOrder);

// Rider earnings ledger
router.get("/earnings", deliveryController.getRiderEarnings);

module.exports = router;
