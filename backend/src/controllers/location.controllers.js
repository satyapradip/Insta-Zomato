// src/controllers/location.controllers.js
//
// ─── WHY THIS FILE EXISTS ─────────────────────────────────────────────────────
// Manages geospatial API endpoints:
//   1. Address Geocoding (Address text -> Lat/Lng)
//   2. Reverse Geocoding (Lat/Lng -> Formatted Street Address)
//   3. Places Autocomplete (Search suggestions as user types)
//   4. Delivery Distance, ETA & Dynamic Fee estimation
//   5. Nearby Restaurant Discovery with proximity sorting
// ─────────────────────────────────────────────────────────────────────────────

const { prisma } = require("../db/prisma");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const mapService = require("../services/map.services");

/**
 * Geocodes an address string to coordinates.
 * POST /api/location/geocode
 */
const geocode = asyncHandler(async (req, res) => {
  const { address } = req.body;

  const result = await mapService.geocodeAddress(address);

  res.status(200).json(
    new ApiResponse(200, result, "Address geocoded successfully"),
  );
});

/**
 * Reverse-geocodes coordinates to a human-readable street address.
 * POST /api/location/reverse-geocode
 */
const reverseGeocode = asyncHandler(async (req, res) => {
  const { latitude, longitude } = req.body;

  const result = await mapService.reverseGeocode(latitude, longitude);

  res.status(200).json(
    new ApiResponse(200, result, "Coordinates reverse-geocoded successfully"),
  );
});

/**
 * Provides autocomplete suggestions for place / address search.
 * POST /api/location/autocomplete
 */
const autocomplete = asyncHandler(async (req, res) => {
  const { query } = req.body;

  const predictions = await mapService.autocompletePlaces(query);

  res.status(200).json(
    new ApiResponse(200, predictions, "Place predictions fetched successfully"),
  );
});

/**
 * Estimates delivery distance, travel ETA, and dynamic delivery fee.
 * GET /api/location/delivery-estimate?partnerId=...&latitude=...&longitude=...
 */
const getDeliveryEstimate = asyncHandler(async (req, res) => {
  const { partnerId, latitude, longitude, surgeMultiplier = 1.0 } = req.query;

  const userLat = parseFloat(latitude);
  const userLng = parseFloat(longitude);

  const partner = await prisma.foodPartner.findUnique({
    where: { id: partnerId },
    select: {
      id: true,
      restaurantName: true,
      latitude: true,
      longitude: true,
      isOpen: true,
    },
  });

  if (!partner) {
    throw new ApiError(404, "Restaurant not found");
  }

  const routing = mapService.calculateRoadDistanceAndEta(
    partner.latitude,
    partner.longitude,
    userLat,
    userLng,
  );

  const feeBreakdown = mapService.calculateDynamicDeliveryFee(
    routing.roadDistanceKm,
    { surgeMultiplier: parseFloat(surgeMultiplier) || 1.0 },
  );

  res.status(200).json(
    new ApiResponse(
      200,
      {
        partner: {
          id: partner.id,
          restaurantName: partner.restaurantName,
          coordinates: [partner.longitude, partner.latitude],
        },
        userLocation: {
          coordinates: [userLng, userLat],
        },
        routing: {
          straightDistanceKm: routing.straightDistanceKm,
          roadDistanceKm: routing.roadDistanceKm,
          travelMinutes: routing.travelMinutes,
          totalEtaMinutes: routing.totalEtaMinutes,
        },
        deliveryFee: feeBreakdown,
      },
      "Delivery estimate calculated successfully",
    ),
  );
});

/**
 * Finds nearby restaurants within a specified radius, sorted by distance.
 * GET /api/location/nearby-restaurants?latitude=...&longitude=...&radius=...
 */
const getNearbyRestaurants = asyncHandler(async (req, res) => {
  const {
    latitude,
    longitude,
    radius = 10,
    cuisine,
    isOpen,
    limit = 20,
  } = req.query;

  const userLat = parseFloat(latitude);
  const userLng = parseFloat(longitude);
  const maxRadiusKm = parseFloat(radius);

  // 1. Calculate indexed bounding-box WHERE clause (minLat/maxLat, minLng/maxLng)
  const geoBounds = mapService.getBoundingBoxWhereClause(userLat, userLng, maxRadiusKm);
  const where = {
    ...geoBounds,
  };
  if (isOpen !== undefined) {
    where.isOpen = isOpen === "true" || isOpen === true;
  }

  const partners = await prisma.foodPartner.findMany({
    where,
    select: {
      id: true,
      name: true,
      restaurantName: true,
      description: true,
      logo: true,
      coverImage: true,
      cuisine: true,
      address: true,
      city: true,
      latitude: true,
      longitude: true,
      isOpen: true,
      avgRating: true,
      totalRatings: true,
    },
  });

  // Calculate distance, filter by radius, and sort
  const nearby = partners
    .map((partner) => {
      const distanceKm = mapService.calculateHaversineDistance(
        userLat,
        userLng,
        partner.latitude,
        partner.longitude,
      );

      const routing = mapService.calculateRoadDistanceAndEta(
        partner.latitude,
        partner.longitude,
        userLat,
        userLng,
      );

      const fee = mapService.calculateDynamicDeliveryFee(routing.roadDistanceKm);

      return {
        ...partner,
        _id: partner.id,
        distanceKm,
        roadDistanceKm: routing.roadDistanceKm,
        estimatedDeliveryMinutes: routing.totalEtaMinutes,
        deliveryFee: fee.totalDeliveryFee,
      };
    })
    .filter((partner) => {
      // Radius filter
      if (partner.distanceKm > maxRadiusKm) return false;
      // Optional cuisine filter
      if (cuisine && !partner.cuisine.some((c) => c.toLowerCase().includes(cuisine.toLowerCase()))) {
        return false;
      }
      return true;
    })
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, parseInt(limit, 10));

  res.status(200).json(
    new ApiResponse(
      200,
      {
        userLocation: { latitude: userLat, longitude: userLng },
        radiusKm: maxRadiusKm,
        totalFound: nearby.length,
        restaurants: nearby,
      },
      "Nearby restaurants fetched successfully",
    ),
  );
});

module.exports = {
  geocode,
  reverseGeocode,
  autocomplete,
  getDeliveryEstimate,
  getNearbyRestaurants,
};
