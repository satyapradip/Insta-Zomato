// src/controllers/admin.controllers.js
//
// ─── WHY THIS FILE EXISTS ─────────────────────────────────────────────────────
// Handles SuperAdmin Platform Management & Moderation HTTP API requests:
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

const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const adminService = require("../services/admin.services");

/**
 * SuperAdmin platform KPIs & financial metrics.
 * GET /api/admin/analytics
 */
const getDashboardAnalytics = asyncHandler(async (req, res) => {
  const analytics = await adminService.getPlatformAnalyticsOverview();
  return res.status(200).json(
    new ApiResponse(200, analytics, "Platform analytics retrieved successfully")
  );
});

/**
 * Lists restaurant partners with search & approval filters.
 * GET /api/admin/partners
 */
const getFoodPartners = asyncHandler(async (req, res) => {
  const { status, search, page, limit } = req.query;
  const result = await adminService.getPartnersList({ status, search, page, limit });
  return res.status(200).json(
    new ApiResponse(200, result, "Restaurant partners retrieved successfully")
  );
});

/**
 * Approves or rejects a restaurant partner account.
 * PATCH /api/admin/partners/:id/approval
 */
const approveRejectPartner = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { isApproved, reason } = req.body;

  if (isApproved === undefined) {
    throw new ApiError(400, "isApproved boolean is required");
  }

  const updatedPartner = await adminService.updatePartnerApproval(id, { isApproved, reason });
  return res.status(200).json(
    new ApiResponse(200, { partner: updatedPartner }, `Partner ${isApproved ? "Approved ✅" : "Rejected ❌"}`)
  );
});

/**
 * Toggles a restaurant's operational availability.
 * PATCH /api/admin/partners/:id/status
 */
const togglePartnerStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { isOpen } = req.body;

  if (isOpen === undefined) {
    throw new ApiError(400, "isOpen boolean is required");
  }

  const updatedPartner = await adminService.togglePartnerOpenStatus(id, { isOpen });
  return res.status(200).json(
    new ApiResponse(200, { partner: updatedPartner }, `Restaurant status updated to ${isOpen ? "OPEN" : "CLOSED"}`)
  );
});

/**
 * Lists delivery riders with search & approval filters.
 * GET /api/admin/riders
 */
const getDeliveryPartners = asyncHandler(async (req, res) => {
  const { status, search, page, limit } = req.query;
  const result = await adminService.getRidersList({ status, search, page, limit });
  return res.status(200).json(
    new ApiResponse(200, result, "Delivery partners retrieved successfully")
  );
});

/**
 * Approves or rejects a delivery partner onboarding.
 * PATCH /api/admin/riders/:id/approval
 */
const approveRejectRider = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { isApproved, reason } = req.body;

  if (isApproved === undefined) {
    throw new ApiError(400, "isApproved boolean is required");
  }

  const updatedRider = await adminService.updateRiderApproval(id, { isApproved, reason });
  return res.status(200).json(
    new ApiResponse(200, { rider: updatedRider }, `Rider ${isApproved ? "Approved ✅" : "Rejected ❌"}`)
  );
});

/**
 * Lists customer accounts for moderation.
 * GET /api/admin/users
 */
const getUsers = asyncHandler(async (req, res) => {
  const { search, isBanned, page, limit } = req.query;
  const result = await adminService.getUsersList({ search, isBanned, page, limit });
  return res.status(200).json(
    new ApiResponse(200, result, "User accounts retrieved successfully")
  );
});

/**
 * Bans or reinstates a user account.
 * PATCH /api/admin/users/:id/ban
 */
const toggleUserBan = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { isBanned, reason } = req.body;

  if (isBanned === undefined) {
    throw new ApiError(400, "isBanned boolean is required");
  }

  const updatedUser = await adminService.updateUserBanStatus(id, { isBanned, reason });
  return res.status(200).json(
    new ApiResponse(200, { user: updatedUser }, `User account ${isBanned ? "BANNED 🚫" : "REINSTATED 🟢"}`)
  );
});

/**
 * Lists food video reels for moderation.
 * GET /api/admin/reels
 */
const getReelsForModeration = asyncHandler(async (req, res) => {
  const { page, limit, isAvailable } = req.query;
  const result = await adminService.getModerationReelsList({ page, limit, isAvailable });
  return res.status(200).json(
    new ApiResponse(200, result, "Food reels for moderation retrieved successfully")
  );
});

/**
 * Takes down or restores a food video reel.
 * PATCH /api/admin/reels/:id/availability
 */
const moderateReel = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { isAvailable, reason } = req.body;

  if (isAvailable === undefined) {
    throw new ApiError(400, "isAvailable boolean is required");
  }

  const updatedReel = await adminService.updateReelModerationStatus(id, { isAvailable, reason });
  return res.status(200).json(
    new ApiResponse(200, { reel: updatedReel }, `Reel status set to ${isAvailable ? "ACTIVE 🟢" : "TAKEN DOWN 🚫"}`)
  );
});

module.exports = {
  getDashboardAnalytics,
  getFoodPartners,
  approveRejectPartner,
  togglePartnerStatus,
  getDeliveryPartners,
  approveRejectRider,
  getUsers,
  toggleUserBan,
  getReelsForModeration,
  moderateReel,
};
