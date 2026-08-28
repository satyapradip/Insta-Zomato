// src/controllers/delivery.controllers.js
//
// ─── WHY THIS FILE EXISTS ─────────────────────────────────────────────────────
// Manages delivery partner (rider) operations:
//   1. Real-time GPS location streaming with throttled DB write & Socket.io broadcast
//   2. Toggling online/offline dispatch availability
//   3. Rider profile and current assignment inspection
//   4. Auto-dispatch offer acceptance & rejection cascade
//   5. Available orders query within proximity
//   6. Rider earnings ledger & payout calculation
// ─────────────────────────────────────────────────────────────────────────────

const { prisma } = require("../db/prisma");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const { emitToOrder, emitToUser } = require("../services/socket.services");
const {
  claimAndAssignOrder,
  acceptDispatchOffer,
  rejectDispatchOffer,
} = require("../services/dispatch.services");
const { calculateDeliveryPayout, getRiderEarningsSummary } = require("../services/earnings.services");
const { calculateHaversineDistance } = require("../services/map.services");

/**
 * Updates the rider's real-time GPS coordinates.
 * PUT /api/delivery/location
 */
const updateLocation = asyncHandler(async (req, res) => {
  const riderId = req.user.id;
  const { latitude, longitude, heading = 0, speed = 0 } = req.body;

  if (latitude === undefined || longitude === undefined) {
    throw new ApiError(400, "Latitude and longitude coordinates are required");
  }

  const lat = parseFloat(latitude);
  const lng = parseFloat(longitude);

  if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    throw new ApiError(400, "Invalid coordinates provided");
  }

  const rider = await prisma.deliveryPartner.findUnique({
    where: { id: riderId },
  });

  if (!rider) {
    throw new ApiError(404, "Delivery partner profile not found");
  }

  // Update rider's current location in database
  await prisma.deliveryPartner.update({
    where: { id: riderId },
    data: {
      latitude: lat,
      longitude: lng,
    },
  });

  let etaMinutes = 10;
  let progressPercent = 50;

  // If rider is currently delivering an active order, broadcast live GPS to tracking room
  if (rider.currentOrderId) {
    const order = await prisma.order.findUnique({
      where: { id: rider.currentOrderId },
      select: {
        id: true,
        userId: true,
        status: true,
        deliveryAddress: true,
        partner: { select: { latitude: true, longitude: true } },
      },
    });

    if (order) {
      // Calculate dynamic ETA based on drop coordinates or default 25 km/h urban speed
      if (order.deliveryAddress?.coordinates) {
        const dropLat = order.deliveryAddress.coordinates[1] || order.deliveryAddress.coordinates.lat;
        const dropLng = order.deliveryAddress.coordinates[0] || order.deliveryAddress.coordinates.lng;
        if (dropLat && dropLng) {
          const remainingDist = calculateHaversineDistance(lat, lng, dropLat, dropLng);
          etaMinutes = Math.max(2, Math.round((remainingDist / 20) * 60)); // 20 km/h avg urban speed
          progressPercent = Math.min(95, Math.max(10, Math.round(100 - (remainingDist / 5) * 100)));
        }
      }

      const locationPayload = {
        orderId: order.id,
        riderId,
        coordinates: [lng, lat],
        heading: parseFloat(heading) || 0,
        speed: parseFloat(speed) || 0,
        etaMinutes,
        progressPercent,
        timestamp: new Date(),
      };

      emitToOrder(order.id, "order:location_update", locationPayload);
      emitToOrder(order.id, "order:rider_location", { etaMinutes, progressPercent });
      emitToUser(order.userId, "order:location_update", locationPayload);
      emitToUser(order.userId, "order:rider_location", { etaMinutes, progressPercent });
    }
  }

  res.status(200).json(
    new ApiResponse(
      200,
      {
        coordinates: [lng, lat],
        heading: parseFloat(heading) || 0,
        speed: parseFloat(speed) || 0,
        etaMinutes,
        currentOrderId: rider.currentOrderId,
      },
      "Rider location updated successfully",
    ),
  );
});

/**
 * Toggles delivery partner's online availability status.
 * PUT /api/delivery/toggle-online
 */
const toggleOnlineStatus = asyncHandler(async (req, res) => {
  const riderId = req.user.id;

  const rider = await prisma.deliveryPartner.findUnique({
    where: { id: riderId },
  });

  if (!rider) {
    throw new ApiError(404, "Delivery partner profile not found");
  }

  const updatedRider = await prisma.deliveryPartner.update({
    where: { id: riderId },
    data: {
      isOnline: !rider.isOnline,
    },
  });

  res.status(200).json(
    new ApiResponse(
      200,
      {
        isOnline: updatedRider.isOnline,
      },
      `Status updated to ${updatedRider.isOnline ? "ONLINE 🟢" : "OFFLINE 🔴"}`,
    ),
  );
});

/**
 * Gets rider's profile, active order, and performance metrics.
 * GET /api/delivery/profile
 */
const getDeliveryProfile = asyncHandler(async (req, res) => {
  const riderId = req.user.id;

  const rider = await prisma.deliveryPartner.findUnique({
    where: { id: riderId },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      vehicleType: true,
      vehicleNumber: true,
      isOnline: true,
      totalDeliveries: true,
      rating: true,
      latitude: true,
      longitude: true,
      currentOrderId: true,
    },
  });

  if (!rider) {
    throw new ApiError(404, "Delivery partner profile not found");
  }

  let activeOrder = null;
  if (rider.currentOrderId) {
    activeOrder = await prisma.order.findUnique({
      where: { id: rider.currentOrderId },
      include: {
        partner: { select: { restaurantName: true, phone: true, address: true, latitude: true, longitude: true } },
        items: true,
        user: { select: { fullName: true, phone: true } },
      },
    });
  }

  res.status(200).json(
    new ApiResponse(
      200,
      {
        rider,
        activeOrder,
      },
      "Delivery profile fetched successfully",
    ),
  );
});

/**
 * Gets open/available orders nearby for the delivery rider.
 * GET /api/delivery/orders/available
 */
const getAvailableOrders = asyncHandler(async (req, res) => {
  const riderId = req.user.id;
  const rider = await prisma.deliveryPartner.findUnique({ where: { id: riderId } });

  const orders = await prisma.order.findMany({
    where: {
      status: { in: ["CONFIRMED", "PREPARING", "READY_FOR_PICKUP"] },
      deliveryPartnerId: null,
    },
    include: {
      partner: true,
      items: true,
    },
    take: 20,
    orderBy: { createdAt: "desc" },
  });

  const formatted = orders.map((ord) => {
    let distanceKm = 2.5;
    if (rider && rider.latitude && ord.partner?.latitude) {
      distanceKm = Math.round(calculateHaversineDistance(rider.latitude, rider.longitude, ord.partner.latitude, ord.partner.longitude) * 10) / 10;
    }

    const payout = calculateDeliveryPayout({
      distanceKm,
      tipAmount: ord.tipAmount || 0,
    });

    return {
      orderId: ord.id,
      orderNumber: ord.orderNumber,
      status: ord.status,
      restaurantName: ord.partner?.restaurantName,
      restaurantAddress: ord.partner?.address,
      deliveryAddress: ord.deliveryAddress,
      itemCount: ord.items.length,
      distanceKm,
      estimatedEarnings: payout.totalPayout,
      createdAt: ord.createdAt,
    };
  });

  res.status(200).json(
    new ApiResponse(200, { orders: formatted }, "Available orders retrieved successfully")
  );
});

/**
 * Rider accepts a dispatched order offer.
 * POST /api/delivery/orders/:id/accept
 */
const acceptOrder = asyncHandler(async (req, res) => {
  const riderId = req.user.id;
  const { id: orderId } = req.params;
  const riderName = req.user.name || req.user.fullName || "Delivery Partner";

  const updatedOrder = await claimAndAssignOrder({
    orderId,
    riderId,
    riderName,
  });

  return res.status(200).json(
    new ApiResponse(200, { order: updatedOrder }, "Delivery offer accepted successfully! 🛵")
  );
});

/**
 * Rider rejects a dispatched order offer.
 * POST /api/delivery/orders/:id/reject
 */
const rejectOrder = asyncHandler(async (req, res) => {
  const riderId = req.user.id;
  const { id: orderId } = req.params;

  const result = rejectDispatchOffer(orderId, riderId);
  return res.status(200).json(
    new ApiResponse(200, result, "Delivery offer declined")
  );
});

/**
 * Gets rider's earnings breakdown.
 * GET /api/delivery/earnings
 */
const getRiderEarnings = asyncHandler(async (req, res) => {
  const riderId = req.user.id;
  const { period = "all" } = req.query;

  const summary = await getRiderEarningsSummary(riderId, { period });
  if (!summary) {
    throw new ApiError(404, "Delivery partner not found");
  }

  return res.status(200).json(
    new ApiResponse(200, summary, "Rider earnings retrieved successfully")
  );
});

module.exports = {
  updateLocation,
  toggleOnlineStatus,
  getDeliveryProfile,
  getAvailableOrders,
  acceptOrder,
  rejectOrder,
  getRiderEarnings,
};
