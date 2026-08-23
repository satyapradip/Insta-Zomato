// src/services/earnings.services.js
//
// ─── WHY THIS SERVICE EXISTS ───────────────────────────────────────────────────
// Centralizes delivery partner (rider) compensation & earnings calculation:
//   1. Base pickup/drop fee (₹30)
//   2. Distance pay (₹12/km for distance > 1km)
//   3. Dynamic surge bonus (during peak hours/rain)
//   4. 100% tip pass-through from customers
//   5. Daily/Weekly earnings aggregation & performance metrics
// ─────────────────────────────────────────────────────────────────────────────

const { prisma } = require("../db/prisma");
const logger = require("../config/logger");

const BASE_DELIVERY_FARE = 30; // ₹30 base pickup & drop
const PER_KM_RATE = 12; // ₹12 per km after the 1st km

/**
 * Calculates earnings for a completed delivery trip.
 * @param {Object} params
 * @param {number} params.distanceKm - Trip distance in kilometers
 * @param {number} [params.surgeMultiplier=1.0] - Surge bonus multiplier (e.g. 1.25x)
 * @param {number} [params.tipAmount=0] - Customer tip in INR
 * @returns {{ baseFare: number, distanceFare: number, surgeBonus: number, tipAmount: number, totalPayout: number }}
 */
function calculateDeliveryPayout({ distanceKm = 1.0, surgeMultiplier = 1.0, tipAmount = 0 }) {
  const dist = Math.max(0, parseFloat(distanceKm) || 1.0);
  const extraKm = Math.max(0, dist - 1.0);
  const distanceFare = Math.round(extraKm * PER_KM_RATE * 100) / 100;
  const standardFare = BASE_DELIVERY_FARE + distanceFare;

  const mult = Math.max(1.0, parseFloat(surgeMultiplier) || 1.0);
  const surgeBonus = Math.round(standardFare * (mult - 1.0) * 100) / 100;
  const tip = Math.max(0, parseFloat(tipAmount) || 0);

  const totalPayout = Math.round((standardFare + surgeBonus + tip) * 100) / 100;

  return {
    baseFare: BASE_DELIVERY_FARE,
    distanceFare,
    surgeBonus,
    tipAmount: tip,
    totalPayout,
  };
}

/**
 * Aggregates a rider's earnings and performance summary.
 * @param {string} riderId - Delivery partner UUID
 * @param {'today'|'week'|'all'} [period='all'] - Time period filter
 */
async function getRiderEarningsSummary(riderId, { period = "all" } = {}) {
  try {
    const rider = await prisma.deliveryPartner.findUnique({
      where: { id: riderId },
      select: {
        id: true,
        name: true,
        vehicleType: true,
        totalDeliveries: true,
        rating: true,
      },
    });

    if (!rider) return null;

    let dateFilter = {};
    const now = new Date();

    if (period === "today") {
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      dateFilter = { gte: startOfDay };
    } else if (period === "week") {
      const startOfWeek = new Date(now.setDate(now.getDate() - 7));
      dateFilter = { gte: startOfWeek };
    }

    const whereClause = {
      deliveryPartnerId: riderId,
      status: "DELIVERED",
      ...(period !== "all" ? { actualDeliveryTime: dateFilter } : {}),
    };

    const deliveredOrders = await prisma.order.findMany({
      where: whereClause,
      select: {
        id: true,
        orderNumber: true,
        pricing: true,
        createdAt: true,
        actualDeliveryTime: true,
      },
      orderBy: { actualDeliveryTime: "desc" },
    });

    let totalBasePay = 0;
    let totalTips = 0;
    let totalDistanceCovered = 0;

    const trips = deliveredOrders.map((ord) => {
      const pricing = typeof ord.pricing === "object" && ord.pricing !== null ? ord.pricing : {};
      const tipAmount = pricing.tipAmount || 0;
      // Estimated distance per trip (e.g. 3.5km average default)
      const dist = 3.5;
      const payout = calculateDeliveryPayout({
        distanceKm: dist,
        surgeMultiplier: 1.0,
        tipAmount,
      });

      totalBasePay += payout.baseFare + payout.distanceFare;
      totalTips += payout.tipAmount;
      totalDistanceCovered += dist;

      return {
        orderId: ord.id,
        orderNumber: ord.orderNumber,
        completedAt: ord.actualDeliveryTime,
        distanceKm: dist,
        baseFare: payout.baseFare,
        distanceFare: payout.distanceFare,
        tip: payout.tipAmount,
        totalEarnings: payout.totalPayout,
      };
    });

    const netEarnings = Math.round((totalBasePay + totalTips) * 100) / 100;

    return {
      riderId,
      period,
      totalCompletedTrips: deliveredOrders.length,
      totalDistanceKm: Math.round(totalDistanceCovered * 10) / 10,
      baseEarnings: Math.round(totalBasePay * 100) / 100,
      tipEarnings: Math.round(totalTips * 100) / 100,
      netPayout: netEarnings,
      trips,
    };
  } catch (error) {
    logger.error("Failed to calculate rider earnings summary:", { error: error.message, riderId });
    throw error;
  }
}

module.exports = {
  calculateDeliveryPayout,
  getRiderEarningsSummary,
  BASE_DELIVERY_FARE,
  PER_KM_RATE,
};
