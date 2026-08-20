const { prisma } = require("../db/prisma");
const jwt = require("jsonwebtoken");
const config = require("../config/index");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");

/**
 * Calculates distance in kilometers between two lat/lng coordinates using Haversine formula.
 */
function calculateDistanceKm(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return null;
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return parseFloat((R * c).toFixed(1));
}

// ── Main Reels Discovery Feed API ────────────────────────────────────────────
const getReelsFeed = asyncHandler(async (req, res) => {
  const {
    cursor,
    limit: queryLimit,
    sort = "for_you",
    category,
    isVeg,
    lat,
    lng,
  } = req.query;

  const limit = Math.min(parseInt(queryLimit) || 10, 25);
  const userLat = lat ? parseFloat(lat) : null;
  const userLng = lng ? parseFloat(lng) : null;

  // Optional authentication check to personalise like/save states
  let currentUserId = null;
  const token = req.cookies.accessToken || req.cookies.token;
  if (token) {
    try {
      const decoded = jwt.verify(token, config.jwt.secret);
      currentUserId = decoded.id;
    } catch (e) {
      // Unauthenticated visitor is allowed
    }
  }

  // Base query: Only available dishes
  const where = { isAvailable: true };

  // Cursor-based pagination (fetches items before last cursor)
  if (cursor) {
    where.createdAt = {
      lt: new Date(cursor),
    };
  }

  // Dietary filter
  if (isVeg !== undefined) {
    where.isVeg = isVeg === "true" || isVeg === true;
  }

  // Category filter
  if (category) {
    where.category = category;
  }

  // Determine sort order
  let orderBy = [{ createdAt: "desc" }];
  if (sort === "trending") {
    orderBy = [{ likeCount: "desc" }, { viewCount: "desc" }, { createdAt: "desc" }];
  }

  const rawReels = await prisma.food.findMany({
    where,
    include: {
      variants: true,
      addOns: true,
      foodPartner: {
        select: {
          id: true,
          name: true,
          restaurantName: true,
          logo: true,
          coverImage: true,
          avgRating: true,
          latitude: true,
          longitude: true,
          isOpen: true,
        },
      },
    },
    orderBy,
    take: limit + 1,
  });

  const hasMore = rawReels.length > limit;
  const reels = hasMore ? rawReels.slice(0, limit) : rawReels;
  const nextCursor = reels.length > 0 ? reels[reels.length - 1].createdAt.toISOString() : null;

  // Batch query user's like and save states if logged in
  let userLikedSet = new Set();
  let userSavedSet = new Set();

  if (currentUserId && reels.length > 0) {
    const foodIds = reels.map((r) => r.id);
    const [userLikes, userSaves] = await Promise.all([
      prisma.like.findMany({
        where: { userId: currentUserId, foodId: { in: foodIds } },
        select: { foodId: true },
      }),
      prisma.save.findMany({
        where: { userId: currentUserId, foodId: { in: foodIds } },
        select: { foodId: true },
      }),
    ]);

    userLikedSet = new Set(userLikes.map((l) => l.foodId));
    userSavedSet = new Set(userSaves.map((s) => s.foodId));
  }

  // Format response with distance and interaction states
  const formattedReels = reels.map((reel) => {
    let distanceKm = null;
    if (userLat && userLng && reel.foodPartner?.latitude && reel.foodPartner?.longitude) {
      distanceKm = calculateDistanceKm(
        userLat,
        userLng,
        reel.foodPartner.latitude,
        reel.foodPartner.longitude,
      );
    }

    return {
      ...reel,
      _id: reel.id,
      foodPartner: reel.foodPartner
        ? {
            ...reel.foodPartner,
            _id: reel.foodPartner.id,
            location: {
              type: "Point",
              coordinates: [reel.foodPartner.longitude, reel.foodPartner.latitude],
            },
          }
        : null,
      distanceKm: distanceKm !== null ? `${distanceKm} km` : undefined,
      isLiked: userLikedSet.has(reel.id),
      isSaved: userSavedSet.has(reel.id),
    };
  });

  res.status(200).json(
    new ApiResponse(
      200,
      {
        reels: formattedReels,
        nextCursor,
        hasMore,
      },
      "Reels feed fetched successfully",
    ),
  );
});

// ── Record Reel View ─────────────────────────────────────────────────────────
const recordReelView = asyncHandler(async (req, res) => {
  const foodId = req.params.id;
  await prisma.food.update({
    where: { id: foodId },
    data: { viewCount: { increment: 1 } },
  });
  res.status(200).json(new ApiResponse(200, null, "View recorded"));
});

module.exports = {
  getReelsFeed,
  recordReelView,
};
