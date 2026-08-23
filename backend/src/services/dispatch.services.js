// src/services/dispatch.services.js
//
// ─── WHY THIS SERVICE EXISTS ───────────────────────────────────────────────────
// Automated Geospatial Dispatch Engine:
//   1. Queries idle online delivery partners within 5km radius of the restaurant
//   2. Ranks candidates by proximity (Haversine km) and rating
//   3. Cascades dispatch offers via Socket.io (`dispatch:offer`) with a 30s accept timer
//   4. Locks order assignment upon acceptance or falls back to broad dispatch
// ─────────────────────────────────────────────────────────────────────────────

const { prisma } = require("../db/prisma");
const { calculateHaversineDistance } = require("./map.services");
const { emitToRider, emitToOnlineRiders, emitToUser, emitToPartner, emitToOrder } = require("./socket.services");
const { calculateDeliveryPayout } = require("./earnings.services");
const logger = require("../config/logger");

// In-memory registry of active auto-dispatch offer timers: orderId -> { queue, currentIdx, timer }
const activeDispatchOffers = new Map();

const DISPATCH_OFFER_TIMEOUT_MS = 30000; // 30 seconds

/**
 * Finds candidate idle riders within maxDistanceKm (default 5km) of a location.
 * @param {Object} params
 * @param {number} params.restaurantLat - Restaurant latitude
 * @param {number} params.restaurantLng - Restaurant longitude
 * @param {number} [params.maxDistanceKm=5.0] - Search radius in km
 * @param {number} [params.limit=10] - Maximum candidate riders
 * @returns {Promise<Array<{ rider: Object, distanceKm: number, score: number }>>}
 */
async function findCandidateRiders({
  restaurantLat,
  restaurantLng,
  maxDistanceKm = 5.0,
  limit = 10,
}) {
  try {
    const lat = parseFloat(restaurantLat);
    const lng = parseFloat(restaurantLng);

    if (isNaN(lat) || isNaN(lng)) {
      logger.warn("Invalid restaurant coordinates for candidate rider search", { restaurantLat, restaurantLng });
      return [];
    }

    // 1. Query all online, idle delivery partners with active coordinates
    const onlineRiders = await prisma.deliveryPartner.findMany({
      where: {
        isOnline: true,
        currentOrderId: null,
      },
      select: {
        id: true,
        name: true,
        phone: true,
        vehicleType: true,
        vehicleNumber: true,
        rating: true,
        latitude: true,
        longitude: true,
      },
    });

    if (!onlineRiders.length) return [];

    // 2. Compute Haversine distance and filter candidates within 5km
    const candidates = [];
    for (const rider of onlineRiders) {
      if (rider.latitude !== null && rider.longitude !== null) {
        const dist = calculateHaversineDistance(lat, lng, rider.latitude, rider.longitude);
        if (dist <= maxDistanceKm) {
          // Ranking formula: Proximity is primary (70%), rating is secondary (30%)
          // Lower score = better candidate
          const normalizedDist = dist / maxDistanceKm;
          const ratingScore = (rider.rating || 4.5) / 5.0;
          const score = normalizedDist * 0.7 - ratingScore * 0.3;

          candidates.push({
            rider,
            distanceKm: Math.round(dist * 100) / 100,
            score,
          });
        }
      }
    }

    // 3. Sort ascending by score (closest + highest rated first)
    candidates.sort((a, b) => a.score - b.score);

    return candidates.slice(0, limit);
  } catch (error) {
    logger.error("Failed to find candidate riders:", { error: error.message });
    return [];
  }
}

/**
 * Initiates automated dispatch cascading for an order.
 * @param {string} orderId - Order UUID
 */
async function autoDispatchOrder(orderId) {
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        partner: true,
        items: true,
        user: { select: { fullName: true, phone: true } },
      },
    });

    if (!order) {
      logger.warn(`Cannot auto-dispatch: Order ${orderId} not found`);
      return { success: false, message: "Order not found" };
    }

    if (order.deliveryPartnerId) {
      logger.info(`Order ${orderId} is already assigned to rider ${order.deliveryPartnerId}`);
      return { success: false, message: "Order already assigned" };
    }

    // Determine restaurant coordinates
    const restLat = order.partner?.latitude || 12.9716;
    const restLng = order.partner?.longitude || 77.5946;

    // Find nearby candidate queue
    const candidates = await findCandidateRiders({
      restaurantLat: restLat,
      restaurantLng: restLng,
      maxDistanceKm: 5.0,
      limit: 5,
    });

    if (!candidates.length) {
      // Fallback broadcast to all online riders
      logger.info(`No idle riders within 5km for order #${order.orderNumber}. Broadcasting to all online riders.`);
      emitToOnlineRiders("order:available_for_pickup", {
        orderId: order.id,
        orderNumber: order.orderNumber,
        restaurantName: order.partner?.restaurantName,
        pickupAddress: order.partner?.address,
        totalAmount: order.totalAmount,
        itemCount: order.items.length,
      });
      return { success: true, mode: "BROADCAST", count: 0 };
    }

    // Store candidate queue in active offers map
    const payout = calculateDeliveryPayout({
      distanceKm: 3.5,
      tipAmount: order.tipAmount || 0,
    });

    const offerPayload = {
      orderId: order.id,
      orderNumber: order.orderNumber,
      restaurantName: order.partner?.restaurantName,
      restaurantAddress: order.partner?.address,
      deliveryAddress: order.deliveryAddress,
      itemCount: order.items.length,
      estimatedEarnings: payout.totalPayout,
      expiresInSeconds: 30,
    };

    activeDispatchOffers.set(order.id, {
      queue: candidates,
      currentIdx: 0,
      offerPayload,
      timer: null,
    });

    // Send offer to top candidate
    dispatchToCurrentCandidate(order.id);

    return {
      success: true,
      mode: "CASCADED_DISPATCH",
      candidateCount: candidates.length,
    };
  } catch (error) {
    logger.error("Auto-dispatch error:", { error: error.message, orderId });
    return { success: false, error: error.message };
  }
}

/**
 * Emits dispatch offer to candidate at currentIdx with 30s auto-cascade.
 */
function dispatchToCurrentCandidate(orderId) {
  const session = activeDispatchOffers.get(orderId);
  if (!session) return;

  if (session.currentIdx >= session.queue.length) {
    // Queue exhausted -> Broadcast to all online riders
    logger.info(`Candidate queue exhausted for order ${orderId}. Broadcasting to all online riders.`);
    emitToOnlineRiders("order:available_for_pickup", session.offerPayload);
    activeDispatchOffers.delete(orderId);
    return;
  }

  const currentCandidate = session.queue[session.currentIdx];
  const riderId = currentCandidate.rider.id;

  logger.info(`Dispatching offer for order ${orderId} to candidate ${riderId} (Dist: ${currentCandidate.distanceKm}km)`);
  emitToRider(riderId, "dispatch:offer", {
    ...session.offerPayload,
    distanceFromRestaurantKm: currentCandidate.distanceKm,
  });

  // Start 30-second timer to cascade if no response
  if (session.timer) clearTimeout(session.timer);

  session.timer = setTimeout(() => {
    logger.info(`Dispatch offer timeout (30s) for rider ${riderId} on order ${orderId}. Cascading to next candidate.`);
    session.currentIdx += 1;
    dispatchToCurrentCandidate(orderId);
  }, DISPATCH_OFFER_TIMEOUT_MS);
}

/**
 * Rider accepts the dispatch offer.
 */
async function acceptDispatchOffer(orderId, riderId) {
  const session = activeDispatchOffers.get(orderId);
  if (session?.timer) {
    clearTimeout(session.timer);
    activeDispatchOffers.delete(orderId);
  }

  // 1. Verify order is still available
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { partner: true, items: true, user: true },
  });

  if (!order) {
    throw new Error("Order not found");
  }

  if (order.deliveryPartnerId && order.deliveryPartnerId !== riderId) {
    throw new Error("Order was already claimed by another delivery partner");
  }

  // 2. Lock order to rider
  const updatedOrder = await prisma.order.update({
    where: { id: orderId },
    data: {
      deliveryPartnerId: riderId,
      timeline: {
        create: [
          {
            status: order.status,
            note: "Delivery dispatch offer accepted by rider",
            actorRole: "deliverypartner",
            actorId: riderId,
          },
        ],
      },
    },
    include: { partner: true, items: true, deliveryPartner: true },
  });

  // 3. Set rider's active order
  await prisma.deliveryPartner.update({
    where: { id: riderId },
    data: { currentOrderId: orderId },
  });

  // 4. Real-time updates to customer, restaurant, and order tracking
  emitToUser(order.userId, "delivery:assigned", {
    orderId,
    riderId,
    order: updatedOrder,
  });
  emitToPartner(order.partnerId, "delivery:assigned", {
    orderId,
    riderId,
  });
  emitToOrder(orderId, "order:status_update", {
    orderId,
    status: order.status,
    deliveryPartnerId: riderId,
  });

  return updatedOrder;
}

/**
 * Rider explicitly declines the dispatch offer -> Immediately cascades to next candidate.
 */
function rejectDispatchOffer(orderId, riderId) {
  const session = activeDispatchOffers.get(orderId);
  if (!session) return { success: true };

  const currentCandidate = session.queue[session.currentIdx];
  if (currentCandidate && currentCandidate.rider.id === riderId) {
    if (session.timer) clearTimeout(session.timer);
    logger.info(`Rider ${riderId} declined dispatch offer for order ${orderId}. Cascading immediately.`);
    session.currentIdx += 1;
    dispatchToCurrentCandidate(orderId);
  }

  return { success: true };
}

module.exports = {
  findCandidateRiders,
  autoDispatchOrder,
  acceptDispatchOffer,
  rejectDispatchOffer,
  DISPATCH_OFFER_TIMEOUT_MS,
};
