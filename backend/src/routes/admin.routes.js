// src/routes/admin.routes.js
//
// ─── WHY THIS FILE EXISTS ─────────────────────────────────────────────────────
// Protected routes for SuperAdmin Platform Management:
//   1. GET /api/admin/analytics                 - Financial KPIs & Operational Overview
//   2. GET /api/admin/partners                  - List & filter restaurants
//   3. PATCH /api/admin/partners/:id/approval   - Approve/Reject restaurant partner
//   4. PATCH /api/admin/partners/:id/status     - Toggle restaurant open status
//   5. GET /api/admin/riders                    - List & filter delivery riders
//   6. PATCH /api/admin/riders/:id/approval     - Approve/Reject rider onboarding
//   7. GET /api/admin/users                     - List & filter customers
//   8. PATCH /api/admin/users/:id/ban           - Suspend/Unban customer account
//   9. GET /api/admin/reels                     - List video reels for moderation
//  10. PATCH /api/admin/reels/:id/availability  - Content take-down / restore reel
// ─────────────────────────────────────────────────────────────────────────────

const express = require("express");
const adminController = require("../controllers/admin.controllers");
const {
  requireAuth,
  requireAdmin,
} = require("../middlewares/auth.middlewares");

const router = express.Router();

// All admin routes strictly require valid JWT and Role === 'admin'
router.use(requireAuth);
router.use(requireAdmin);

// Platform Analytics Dashboard
router.get("/analytics", adminController.getDashboardAnalytics);

// Restaurant Partners KYC & Management
router.get("/partners", adminController.getFoodPartners);
router.patch("/partners/:id/approval", adminController.approveRejectPartner);
router.patch("/partners/:id/status", adminController.togglePartnerStatus);

// Delivery Riders Onboarding & Verification
router.get("/riders", adminController.getDeliveryPartners);
router.patch("/riders/:id/approval", adminController.approveRejectRider);

// Customer Account Moderation
router.get("/users", adminController.getUsers);
router.patch("/users/:id/ban", adminController.toggleUserBan);

// Video Reel Content Moderation
router.get("/reels", adminController.getReelsForModeration);
router.patch("/reels/:id/availability", adminController.moderateReel);

module.exports = router;
