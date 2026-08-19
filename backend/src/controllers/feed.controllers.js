const foodModel = require("../models/food.models");
const likeModel = require("../models/like.models");
const saveModel = require("../models/save.models");
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
  const query = { isAvailable: true };

  // Cursor-based pagination (fetches documents created before last cursor ID)
  if (cursor) {
    query._id = { $lt: cursor };
  }

  // Dietary filter
  if (isVeg !== undefined) {
    query.isVeg = isVeg === "true" || isVeg === true;
  }

  // Category filter
  if (category) {
    query.category = category;
  }

  // Determine sort order
  let sortOptions = { _id: -1 }; // Default: Latest
  if (sort === "trending") {
    sortOptions = { likeCount: -1, viewCount: -1, _id: -1 };
  }

  const rawReels = await foodModel
    .find(query)
    .populate(
      "foodPartner",
      "name restaurantName logo coverImage avgRating location isOpen",
    )
    .sort(sortOptions)
    .limit(limit + 1) // Fetch 1 extra to determine hasMore
    .lean();

  const hasMore = rawReels.length > limit;
  const reels = hasMore ? rawReels.slice(0, limit) : rawReels;
  const nextCursor = reels.length > 0 ? reels[reels.length - 1]._id : null;

  // Batch query user's like and save states if logged in
  let userLikedSet = new Set();
  let userSavedSet = new Set();

  if (currentUserId && reels.length > 0) {
    const foodIds = reels.map((r) => r._id);
    const [userLikes, userSaves] = await Promise.all([
      likeModel.find({ user: currentUserId, food: { $in: foodIds } }).lean(),
      saveModel.find({ user: currentUserId, food: { $in: foodIds } }).lean(),
    ]);

    userLikedSet = new Set(userLikes.map((l) => l.food.toString()));
    userSavedSet = new Set(userSaves.map((s) => s.food.toString()));
  }

  // Format response with distance and interaction states
  const formattedReels = reels.map((reel) => {
    let distanceKm = null;
    if (
      userLat &&
      userLng &&
      reel.foodPartner?.location?.coordinates?.length === 2
    ) {
      const [partnerLng, partnerLat] = reel.foodPartner.location.coordinates;
      distanceKm = calculateDistanceKm(userLat, userLng, partnerLat, partnerLng);
    }

    return {
      ...reel,
      distanceKm: distanceKm !== null ? `${distanceKm} km` : undefined,
      isLiked: userLikedSet.has(reel._id.toString()),
      isSaved: userSavedSet.has(reel._id.toString()),
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
  await foodModel.findByIdAndUpdate(foodId, { $inc: { viewCount: 1 } });
  res.status(200).json(new ApiResponse(200, null, "View recorded"));
});

module.exports = {
  getReelsFeed,
  recordReelView,
};
