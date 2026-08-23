// src/services/admin.services.js
//
// ─── WHY THIS SERVICE EXISTS ───────────────────────────────────────────────────
// Central Administration & Analytics Engine for Insta-Zomato:
//   1. Platform Financial & Operational KPIs (GMV, Active Orders, Fleet Status, Growth)
//   2. Restaurant KYC Verification & Approval / Rejection Workflow
//   3. Delivery Rider Fleet Verification & Onboarding Approval
//   4. Customer Moderation & Account Suspension (Ban / Unban)
//   5. Video Reel Content Moderation (Content Take-down & Availability Toggle)
// ─────────────────────────────────────────────────────────────────────────────

const { prisma } = require("../db/prisma");
const { emitToPartner, emitToRider } = require("./socket.services");
const logger = require("../config/logger");

/**
 * Aggregates high-level platform analytics and business KPIs.
 */
async function getPlatformAnalyticsOverview() {
  try {
    // 1. Order KPIs & GMV aggregation
    const allOrders = await prisma.order.findMany({
      select: {
        id: true,
        orderNumber: true,
        status: true,
        pricing: true,
        createdAt: true,
        user: { select: { fullName: true } },
        partner: { select: { restaurantName: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    let gmvTotal = 0;
    let deliveredOrdersCount = 0;
    let activeOrdersCount = 0;
    let cancelledOrdersCount = 0;

    const activeStatuses = ["CONFIRMED", "PREPARING", "READY_FOR_PICKUP", "PICKED_UP", "OUT_FOR_DELIVERY"];

    for (const ord of allOrders) {
      const grandTotal = (ord.pricing && typeof ord.pricing === "object" && ord.pricing.grandTotal) || 0;
      if (ord.status === "DELIVERED") {
        gmvTotal += grandTotal;
        deliveredOrdersCount++;
      } else if (activeStatuses.includes(ord.status)) {
        activeOrdersCount++;
      } else if (ord.status === "CANCELLED") {
        cancelledOrdersCount++;
      }
    }

    // 2. Delivery Partner Fleet Metrics
    const totalRiders = await prisma.deliveryPartner.count();
    const onlineRiders = await prisma.deliveryPartner.count({ where: { isOnline: true } });
    const pendingRiders = await prisma.deliveryPartner.count({ where: { isApproved: false } });

    // 3. Restaurant Partner Metrics
    const totalPartners = await prisma.foodPartner.count();
    const openPartners = await prisma.foodPartner.count({ where: { isOpen: true } });
    const pendingPartners = await prisma.foodPartner.count({ where: { isApproved: false } });

    // 4. User Base Metrics
    const totalUsers = await prisma.user.count({ where: { role: "customer" } });
    const bannedUsers = await prisma.user.count({ where: { isBanned: true } });

    // 5. Total Food Items / Video Reels
    const totalFoodItems = await prisma.food.count();
    const activeFoodItems = await prisma.food.count({ where: { isAvailable: true } });

    return {
      financials: {
        totalGmv: Math.round(gmvTotal * 100) / 100,
        deliveredOrdersCount,
        averageOrderValue: deliveredOrdersCount > 0 ? Math.round((gmvTotal / deliveredOrdersCount) * 100) / 100 : 0,
      },
      orders: {
        totalOrders: allOrders.length,
        activeOrdersCount,
        cancelledOrdersCount,
        recentOrders: allOrders.slice(0, 8).map((o) => ({
          id: o.id,
          orderNumber: o.orderNumber,
          status: o.status,
          customerName: o.user?.fullName,
          restaurantName: o.partner?.restaurantName,
          amount: (o.pricing && o.pricing.grandTotal) || 0,
          createdAt: o.createdAt,
        })),
      },
      fleet: {
        totalRiders,
        onlineRiders,
        pendingRiders,
      },
      partners: {
        totalPartners,
        openPartners,
        pendingPartners,
      },
      users: {
        totalUsers,
        bannedUsers,
      },
      catalog: {
        totalFoodItems,
        activeFoodItems,
      },
    };
  } catch (error) {
    logger.error("getPlatformAnalyticsOverview error:", { error: error.message });
    throw error;
  }
}

/**
 * Gets paginated list of restaurant partners with search & approval filtering.
 */
async function getPartnersList({ status = "all", search = "", page = 1, limit = 20 } = {}) {
  const where = {};
  if (status === "pending") where.isApproved = false;
  if (status === "approved") where.isApproved = true;

  if (search.trim()) {
    const q = search.trim();
    where.OR = [
      { restaurantName: { contains: q, mode: "insensitive" } },
      { name: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
      { city: { contains: q, mode: "insensitive" } },
    ];
  }

  const parsedPage = Math.max(1, parseInt(page, 10) || 1);
  const parsedLimit = Math.max(1, Math.min(100, parseInt(limit, 10) || 20));
  const skip = (parsedPage - 1) * parsedLimit;

  const [totalCount, partners] = await Promise.all([
    prisma.foodPartner.count({ where }),
    prisma.foodPartner.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        restaurantName: true,
        fssaiLicenseNumber: true,
        address: true,
        city: true,
        isOpen: true,
        isApproved: true,
        avgRating: true,
        createdAt: true,
        _count: { select: { foods: true, orders: true } },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: parsedLimit,
    }),
  ]);

  return {
    partners: partners.map((p) => ({
      ...p,
      foodCount: p._count?.foods || 0,
      orderCount: p._count?.orders || 0,
    })),
    pagination: {
      page: parsedPage,
      limit: parsedLimit,
      totalCount,
      totalPages: Math.ceil(totalCount / parsedLimit) || 1,
    },
  };
}

/**
 * Approves or rejects a restaurant partner account.
 */
async function updatePartnerApproval(partnerId, { isApproved, reason = "" }) {
  const partner = await prisma.foodPartner.update({
    where: { id: partnerId },
    data: { isApproved: Boolean(isApproved) },
  });

  emitToPartner(partnerId, "partner:status_update", {
    isApproved: partner.isApproved,
    reason,
  });

  return partner;
}

/**
 * Toggles a restaurant's operational availability.
 */
async function togglePartnerOpenStatus(partnerId, { isOpen }) {
  const partner = await prisma.foodPartner.update({
    where: { id: partnerId },
    data: { isOpen: Boolean(isOpen) },
  });
  return partner;
}

/**
 * Gets paginated list of delivery partners with search & approval filtering.
 */
async function getRidersList({ status = "all", search = "", page = 1, limit = 20 } = {}) {
  const where = {};
  if (status === "pending") where.isApproved = false;
  if (status === "approved") where.isApproved = true;

  if (search.trim()) {
    const q = search.trim();
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
      { phone: { contains: q, mode: "insensitive" } },
      { vehicleNumber: { contains: q, mode: "insensitive" } },
    ];
  }

  const parsedPage = Math.max(1, parseInt(page, 10) || 1);
  const parsedLimit = Math.max(1, Math.min(100, parseInt(limit, 10) || 20));
  const skip = (parsedPage - 1) * parsedLimit;

  const [totalCount, riders] = await Promise.all([
    prisma.deliveryPartner.count({ where }),
    prisma.deliveryPartner.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        vehicleType: true,
        vehicleNumber: true,
        drivingLicenseNumber: true,
        isOnline: true,
        isApproved: true,
        rating: true,
        totalDeliveries: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: parsedLimit,
    }),
  ]);

  return {
    riders,
    pagination: {
      page: parsedPage,
      limit: parsedLimit,
      totalCount,
      totalPages: Math.ceil(totalCount / parsedLimit) || 1,
    },
  };
}

/**
 * Approves or rejects a delivery partner onboarding.
 */
async function updateRiderApproval(riderId, { isApproved, reason = "" }) {
  const rider = await prisma.deliveryPartner.update({
    where: { id: riderId },
    data: { isApproved: Boolean(isApproved) },
  });

  emitToRider(riderId, "rider:status_update", {
    isApproved: rider.isApproved,
    reason,
  });

  return rider;
}

/**
 * Gets paginated list of customers for moderation.
 */
async function getUsersList({ search = "", isBanned, page = 1, limit = 20 } = {}) {
  const where = { role: "customer" };
  if (isBanned !== undefined && isBanned !== null && isBanned !== "") {
    where.isBanned = isBanned === true || isBanned === "true";
  }

  if (search.trim()) {
    const q = search.trim();
    where.OR = [
      { fullName: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
      { phone: { contains: q, mode: "insensitive" } },
    ];
  }

  const parsedPage = Math.max(1, parseInt(page, 10) || 1);
  const parsedLimit = Math.max(1, Math.min(100, parseInt(limit, 10) || 20));
  const skip = (parsedPage - 1) * parsedLimit;

  const [totalCount, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        avatarUrl: true,
        isBanned: true,
        createdAt: true,
        _count: { select: { orders: true, likes: true, comments: true } },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: parsedLimit,
    }),
  ]);

  return {
    users: users.map((u) => ({
      ...u,
      orderCount: u._count?.orders || 0,
      activityCount: (u._count?.likes || 0) + (u._count?.comments || 0),
    })),
    pagination: {
      page: parsedPage,
      limit: parsedLimit,
      totalCount,
      totalPages: Math.ceil(totalCount / parsedLimit) || 1,
    },
  };
}

/**
 * Suspends (bans) or reinstates a user account.
 */
async function updateUserBanStatus(userId, { isBanned, reason = "" }) {
  const user = await prisma.user.update({
    where: { id: userId },
    data: { isBanned: Boolean(isBanned) },
    select: { id: true, fullName: true, email: true, isBanned: true },
  });

  logger.info(`User ${userId} ban status updated to: ${user.isBanned}. Reason: ${reason}`);
  return user;
}

/**
 * Gets paginated list of food reels for video content moderation.
 */
async function getModerationReelsList({ page = 1, limit = 20, isAvailable } = {}) {
  const where = {};
  if (isAvailable !== undefined && isAvailable !== null && isAvailable !== "") {
    where.isAvailable = isAvailable === true || isAvailable === "true";
  }

  const parsedPage = Math.max(1, parseInt(page, 10) || 1);
  const parsedLimit = Math.max(1, Math.min(100, parseInt(limit, 10) || 20));
  const skip = (parsedPage - 1) * parsedLimit;

  const [totalCount, foods] = await Promise.all([
    prisma.food.count({ where }),
    prisma.food.findMany({
      where,
      include: {
        foodPartner: {
          select: { id: true, restaurantName: true, email: true, phone: true },
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: parsedLimit,
    }),
  ]);

  return {
    reels: foods,
    pagination: {
      page: parsedPage,
      limit: parsedLimit,
      totalCount,
      totalPages: Math.ceil(totalCount / parsedLimit) || 1,
    },
  };
}

/**
 * Takes down or restores a food video reel.
 */
async function updateReelModerationStatus(foodId, { isAvailable, reason = "" }) {
  const food = await prisma.food.update({
    where: { id: foodId },
    data: { isAvailable: Boolean(isAvailable) },
    include: { foodPartner: { select: { id: true, restaurantName: true } } },
  });

  logger.info(`Food reel ${foodId} (${food.name}) availability set to: ${food.isAvailable}. Reason: ${reason}`);
  return food;
}

module.exports = {
  getPlatformAnalyticsOverview,
  getPartnersList,
  updatePartnerApproval,
  togglePartnerOpenStatus,
  getRidersList,
  updateRiderApproval,
  getUsersList,
  updateUserBanStatus,
  getModerationReelsList,
  updateReelModerationStatus,
};
