// src/controllers/delivery.controllers.js
//
// ─── WHY THIS FILE EXISTS ─────────────────────────────────────────────────────
// Manages delivery partner (rider) operations:
//   1. Real-time GPS location streaming with throttled DB write & Socket.io broadcast
//   2. Toggling online/offline dispatch availability
//   3. Rider profile and current assignment inspection
// ─────────────────────────────────────────────────────────────────────────────

const { prisma } = require("../db/prisma");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const { emitToOrder, emitToUser } = require("../services/socket.services");

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

  // If rider is currently delivering an active order, broadcast live GPS to tracking room
  if (rider.currentOrderId) {
    const order = await prisma.order.findUnique({
      where: { id: rider.currentOrderId },
      select: { id: true, userId: true },
    });

    if (order) {
      const locationPayload = {
        orderId: order.id,
        riderId,
        coordinates: [lng, lat],
        heading: parseFloat(heading) || 0,
        speed: parseFloat(speed) || 0,
        timestamp: new Date(),
      };

      emitToOrder(order.id, "order:location_update", locationPayload);
      emitToUser(order.userId, "order:location_update", locationPayload);
    }
  }

  res.status(200).json(
    new ApiResponse(
      200,
      {
        coordinates: [lng, lat],
        heading: parseFloat(heading) || 0,
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
        status: updatedRider.status,
      },
      `Status updated to ${updatedRider.isOnline ? "ONLINE 🟢" : "OFFLINE 🔴"}`,
    ),
  );
});

/**
 * Gets rider's profile and active delivery assignment.
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
      status: true,
      totalDeliveries: true,
      rating: true,
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
        partner: { select: { restaurantName: true, phone: true, address: true, location: true } },
        items: true,
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

module.exports = {
  updateLocation,
  toggleOnlineStatus,
  getDeliveryProfile,
};
