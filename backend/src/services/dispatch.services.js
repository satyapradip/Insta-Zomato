// src/services/dispatch.services.js
//
// ─── WHY THIS SERVICE EXISTS ───────────────────────────────────────────────────
// Automated Geospatial Dispatch Engine:
//   1. Queries idle online delivery partners within 5km radius of the restaurant
//   2. Ranks candidates by proximity (Haversine km) and rating
//   3. Cascades dispatch offers via Socket.io (`dispatch:offer`) with a 15s accept timer (max 3 attempts)
//   4. Atomic Redis locks (`SET order:claim:{orderId} riderId NX EX 30`) to prevent race conditions
//   5. Atomic Prisma $transaction order assignments with 30s pickup verification watcher
//   6. Flags order for manual admin dispatch (`dispatch:manual_required`) upon cascade exhaustion
// ─────────────────────────────────────────────────────────────────────────────

const { prisma } = require("../db/prisma");
const { calculateHaversineDistance, getBoundingBoxWhereClause } = require("./map.services");
const {
  emitToRider,
  emitToOnlineRiders,
  emitToUser,
  emitToPartner,
  emitToOrder,
  emitToAdmin,
} = require("./socket.services");
const { calculateDeliveryPayout } = require("./earnings.services");
const redisServices = require("./redis.services");
const ApiError = require("../utils/ApiError");
const logger = require("../config/logger");

// In-memory registry of active auto-dispatch offer timers: orderId -> { queue, currentIdx, attemptCount, timer, offerPayload }
const activeDispatchOffers = new Map();

// In-memory registry of active pickup confirmation timers: orderId -> timeoutId
const activePickupTimers = new Map();

const DISPATCH_OFFER_TIMEOUT_MS = 15000; // 15 seconds per candidate
const MAX_DISPATCH_ATTEMPTS = 3; // Maximum 3 candidate attempts before admin fallback
const CLAIM_LOCK_TTL_SECONDS = 30; // 30 seconds atomic Redis lock
const PICKUP_TIMEOUT_MS = 30000; // 30 seconds for rider to confirm pickup

/**
 * Finds nearby online, unassigned delivery partners sorted by score.
 * Uses indexed bounding-box range query before precise Haversine calculation.
 *
 * @param {number} restaurantLat
 * @param {number} restaurantLng
 * @param {number} [maxDistanceKm=5]
 * @param {number} [limit=5]
 * @returns {Promise<Array<{ rider: Object, distanceKm: number, score: number }>>}
 */
async function findCandidateRiders(restaurantLat, restaurantLng, maxDistanceKm = 5, limit = 5) {
  try {
    let lat, lng, maxDist = maxDistanceKm, maxLimit = limit;
    if (typeof restaurantLat === "object" && restaurantLat !== null) {
      lat = parseFloat(restaurantLat.restaurantLat ?? restaurantLat.latitude ?? restaurantLat.lat);
      lng = parseFloat(restaurantLat.restaurantLng ?? restaurantLat.longitude ?? restaurantLat.lng);
      maxDist = parseFloat(restaurantLat.maxDistanceKm ?? 5);
      maxLimit = parseInt(restaurantLat.limit ?? 5, 10);
    } else {
      lat = parseFloat(restaurantLat);
      lng = parseFloat(restaurantLng);
    }

    if (isNaN(lat) || isNaN(lng)) {
      logger.warn("Invalid restaurant coordinates for candidate rider search", {
        restaurantLat,
        restaurantLng,
      });
      return [];
    }

    // 1. Calculate indexed bounding-box WHERE clause (minLat/maxLat, minLng/maxLng)
    const geoBounds = getBoundingBoxWhereClause(lat, lng, maxDist);

    // 2. Query online, idle delivery partners within bounding box
    const onlineRiders = await prisma.deliveryPartner.findMany({
      where: {
        isOnline: true,
        currentOrderId: null,
        ...geoBounds,
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
      expiresInSeconds: 15,
    };

    if (!candidates.length) {
      // Fallback broadcast to all online riders
      logger.info(
        `No idle riders within 5km for order #${order.orderNumber}. Broadcasting to all online riders.`
      );
      emitToOnlineRiders("order:available_for_pickup", offerPayload);
      return { success: true, mode: "BROADCAST", count: 0 };
    }

    // Store candidate queue in active offers map
    activeDispatchOffers.set(order.id, {
      queue: candidates,
      currentIdx: 0,
      attemptCount: 0,
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
 * Emits dispatch offer to candidate at currentIdx with 15s auto-cascade (max 3 attempts).
 */
function dispatchToCurrentCandidate(orderId) {
  const session = activeDispatchOffers.get(orderId);
  if (!session) return;

  // Check if max 3 attempts reached or candidates exhausted
  if (session.attemptCount >= MAX_DISPATCH_ATTEMPTS || session.currentIdx >= session.queue.length) {
    logger.warn(
      `Dispatch attempts exhausted (attempts: ${session.attemptCount}, candidates: ${session.currentIdx}) for order ${orderId}. Flagging for manual admin dispatch.`
    );

    // 1. Audit log in DB timeline
    prisma.orderTimeline
      .create({
        data: {
          orderId,
          status: "READY_FOR_PICKUP",
          note: `Automated rider dispatch exhausted ${session.attemptCount} attempts without acceptance. Flagged for manual admin dispatch.`,
          actorRole: "system",
        },
      })
      .catch((err) =>
        logger.error("Failed to create timeline entry for dispatch exhaustion:", {
          error: err.message,
          orderId,
        })
      );

    // 2. Alert SuperAdmin room
    emitToAdmin("dispatch:manual_required", {
      orderId,
      orderNumber: session.offerPayload?.orderNumber,
      reason: "exhausted_candidates_3_attempts",
      timestamp: new Date(),
    });

    // 3. Fallback broadcast to all online riders as open pool
    emitToOnlineRiders("order:available_for_pickup", session.offerPayload);
    activeDispatchOffers.delete(orderId);
    return;
  }

  const currentCandidate = session.queue[session.currentIdx];
  const riderId = currentCandidate.rider.id;
  session.attemptCount += 1;

  logger.info(
    `Dispatching offer (attempt ${session.attemptCount}/${MAX_DISPATCH_ATTEMPTS}) for order ${orderId} to candidate ${riderId} (Dist: ${currentCandidate.distanceKm}km)`
  );

  emitToRider(riderId, "dispatch:offer", {
    ...session.offerPayload,
    distanceFromRestaurantKm: currentCandidate.distanceKm,
    attemptNumber: session.attemptCount,
    maxAttempts: MAX_DISPATCH_ATTEMPTS,
    expiresInSeconds: 15,
  });

  // Start 15-second timer to cascade if no response
  if (session.timer) clearTimeout(session.timer);

  session.timer = setTimeout(() => {
    logger.info(
      `Dispatch offer timeout (15s) for rider ${riderId} on order ${orderId}. Cascading to next candidate.`
    );
    session.currentIdx += 1;
    dispatchToCurrentCandidate(orderId);
  }, DISPATCH_OFFER_TIMEOUT_MS);
}

/**
 * Claims and assigns an order to a delivery rider atomically.
 * Uses atomic Redis lock (SET NX EX 30) + Prisma $transaction.
 * @param {Object} params
 * @param {string} params.orderId - Order UUID
 * @param {string} params.riderId - Rider UUID
 * @param {string} [params.riderName] - Optional rider name
 * @returns {Promise<Object>} Updated order record
 */
async function claimAndAssignOrder({ orderId, riderId, riderName = "Delivery Partner" }) {
  const lockKey = `order:claim:${orderId}`;

  // 1. Atomic Redis Lock: key = `order:claim:{orderId}`, value = riderId, expiry = 30 seconds
  const lockAcquired = await redisServices.acquireLock(lockKey, riderId, CLAIM_LOCK_TTL_SECONDS);

  if (!lockAcquired) {
    logger.warn(`Rider ${riderId} attempted to claim order ${orderId} but lock was already held.`);
    emitToRider(riderId, "order:claim:rejected", {
      orderId,
      reason: "already_assigned",
    });
    throw new ApiError(409, "Order has already been claimed or assigned to another delivery partner");
  }

  try {
    // 2. Wrap the actual DB assignment in a Prisma transaction ($transaction)
    const updatedOrder = await prisma.$transaction(async (tx) => {
      // Check if rider already has an active uncompleted order
      const activeOrder = await tx.order.findFirst({
        where: {
          deliveryPartnerId: riderId,
          status: { in: ["PICKED_UP", "OUT_FOR_DELIVERY"] },
        },
      });

      if (activeOrder) {
        throw new ApiError(
          400,
          `You already have an active order in progress (#${activeOrder.orderNumber}). Complete it before accepting a new one.`
        );
      }

      // Fetch order and verify availability
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: { partner: true, items: true, user: true },
      });

      if (!order) {
        throw new ApiError(404, "Order not found");
      }

      if (["DELIVERED", "CANCELLED", "FAILED"].includes(order.status)) {
        throw new ApiError(
          400,
          `Cannot accept order in terminal status '${order.status}'.`
        );
      }

      if (order.deliveryPartnerId && order.deliveryPartnerId !== riderId) {
        throw new ApiError(409, "Order has already been assigned to another delivery partner");
      }

      // Update Order with delivery partner and timeline entry
      const savedOrder = await tx.order.update({
        where: { id: orderId },
        data: {
          deliveryPartnerId: riderId,
          timeline: {
            create: [
              {
                status: order.status,
                note: "Delivery partner accepted the order dispatch",
                actorRole: "deliverypartner",
                actorId: riderId,
              },
            ],
          },
        },
        include: { partner: true, items: true, timeline: true, user: true, deliveryPartner: true },
      });

      // Update Rider's active order pointer
      await tx.deliveryPartner.update({
        where: { id: riderId },
        data: { currentOrderId: orderId },
      });

      return savedOrder;
    }, {
      maxWait: 15000,
      timeout: 25000,
    });

    // 3. Clear any active auto-dispatch offer timer
    const session = activeDispatchOffers.get(orderId);
    if (session?.timer) {
      clearTimeout(session.timer);
    }
    activeDispatchOffers.delete(orderId);

    // 4. Start 30-second pickup confirmation watcher
    schedulePickupTimeout(orderId, riderId);

    // 5. Emit real-time WebSocket events
    emitToRider(riderId, "order:claim:accepted", {
      orderId,
      order: updatedOrder,
    });

    emitToUser(updatedOrder.userId, "delivery:assigned", {
      orderId,
      riderId,
      riderName,
      order: updatedOrder,
    });

    emitToPartner(updatedOrder.partnerId, "delivery:assigned", {
      orderId,
      riderId,
      riderName,
    });

    emitToOrder(orderId, "order:status_update", {
      orderId,
      status: updatedOrder.status,
      deliveryPartnerId: riderId,
      order: updatedOrder,
    });

    return updatedOrder;
  } catch (error) {
    // If DB transaction fails or throws, release the Redis lock immediately
    await redisServices.releaseLock(lockKey, riderId);

    if (error.statusCode === 409 || error.message.includes("already")) {
      emitToRider(riderId, "order:claim:rejected", {
        orderId,
        reason: "already_assigned",
      });
    }

    throw error;
  }
}

/**
 * Schedules a 30-second pickup confirmation watcher.
 * If rider does not confirm pickup within 30s, releases lock, unassigns rider, and re-dispatches.
 * @param {string} orderId
 * @param {string} riderId
 */
function schedulePickupTimeout(orderId, riderId) {
  clearPickupTimeout(orderId);

  const timer = setTimeout(async () => {
    activePickupTimers.delete(orderId);
    try {
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        select: { id: true, status: true, deliveryPartnerId: true, orderNumber: true },
      });

      if (order && order.deliveryPartnerId === riderId && order.status === "READY_FOR_PICKUP") {
        logger.warn(
          `Pickup not confirmed within 30s for order #${order.orderNumber} by rider ${riderId}. Releasing lock and re-dispatching.`
        );

        // 1. Release Redis claim lock
        await redisServices.releaseLock(`order:claim:${orderId}`, riderId);

        // 2. Transactionally unassign the rider
        await prisma.$transaction(async (tx) => {
          await tx.order.update({
            where: { id: orderId },
            data: {
              deliveryPartnerId: null,
              timeline: {
                create: [
                  {
                    status: "READY_FOR_PICKUP",
                    note: "Assigned rider did not confirm pickup within 30s window. Released for re-dispatch.",
                    actorRole: "system",
                  },
                ],
              },
            },
          });

          await tx.deliveryPartner.update({
            where: { id: riderId },
            data: { currentOrderId: null },
          });
        }, {
          maxWait: 15000,
          timeout: 25000,
        });

        // 3. Notify rider and tracking rooms
        emitToRider(riderId, "order:unassigned", {
          orderId,
          reason: "pickup_timeout_exceeded",
        });

        emitToOrder(orderId, "order:status_update", {
          orderId,
          status: "READY_FOR_PICKUP",
          deliveryPartnerId: null,
        });

        // 4. Re-initiate automated cascading dispatch
        autoDispatchOrder(orderId).catch((err) =>
          logger.error("Auto re-dispatch failed after pickup timeout:", {
            error: err.message,
            orderId,
          })
        );
      }
    } catch (err) {
      logger.error("Error during pickup timeout processing:", { error: err.message, orderId });
    }
  }, PICKUP_TIMEOUT_MS);

  activePickupTimers.set(orderId, timer);
}

/**
 * Clears the active pickup watcher when pickup is confirmed.
 * @param {string} orderId
 */
function clearPickupTimeout(orderId) {
  if (activePickupTimers.has(orderId)) {
    clearTimeout(activePickupTimers.get(orderId));
    activePickupTimers.delete(orderId);
  }
}

/**
 * Backwards-compatible alias for accepting dispatch offer.
 */
async function acceptDispatchOffer(orderId, riderId) {
  return claimAndAssignOrder({ orderId, riderId });
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
    logger.info(
      `Rider ${riderId} declined dispatch offer for order ${orderId}. Cascading immediately.`
    );
    session.currentIdx += 1;
    dispatchToCurrentCandidate(orderId);
  }

  return { success: true };
}

module.exports = {
  findCandidateRiders,
  autoDispatchOrder,
  claimAndAssignOrder,
  acceptDispatchOffer,
  rejectDispatchOffer,
  schedulePickupTimeout,
  clearPickupTimeout,
  DISPATCH_OFFER_TIMEOUT_MS,
  MAX_DISPATCH_ATTEMPTS,
  CLAIM_LOCK_TTL_SECONDS,
  PICKUP_TIMEOUT_MS,
};
