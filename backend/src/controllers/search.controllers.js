// src/controllers/search.controllers.js
//
// ─── WHY THIS FILE EXISTS ─────────────────────────────────────────────────────
// Handles Search & Discovery HTTP API requests:
//   1. GET /api/search                 - Universal full-text multi-field search & facet filters
//   2. GET /api/search/suggestions     - Instant autocomplete suggestions
//   3. GET /api/search/trending        - Trending dishes & curated category discovery
//   4. GET /api/search/category/:name  - Category-filtered dishes
// ─────────────────────────────────────────────────────────────────────────────

const asyncHandler = require("../utils/asyncHandler");
const ApiResponse = require("../utils/ApiResponse");
const {
  searchDishesAndRestaurants,
  getSearchSuggestions,
  getTrendingAndCategories,
} = require("../services/search.services");

/**
 * Universal Search across Dishes, Cuisines, and Restaurants.
 * GET /api/search?q=...&isVeg=true&category=...&minPrice=...&maxPrice=...&lat=...&lng=...&sortBy=...
 */
const searchAll = asyncHandler(async (req, res) => {
  const {
    q = "",
    isVeg,
    category,
    minPrice,
    maxPrice,
    minRating,
    maxDistanceKm,
    lat,
    lng,
    sortBy = "relevance",
    page = 1,
    limit = 20,
  } = req.query;

  const result = await searchDishesAndRestaurants({
    query: q,
    isVeg,
    category,
    minPrice,
    maxPrice,
    minRating,
    maxDistanceKm,
    userLat: lat,
    userLng: lng,
    sortBy,
    page,
    limit,
  });

  return res.status(200).json(
    new ApiResponse(200, result, "Search results retrieved successfully")
  );
});

/**
 * Autocomplete search suggestions.
 * GET /api/search/suggestions?q=...
 */
const getSuggestions = asyncHandler(async (req, res) => {
  const { q = "", limit = 8 } = req.query;

  const result = await getSearchSuggestions(q, { limit: parseInt(limit, 10) || 8 });

  return res.status(200).json(
    new ApiResponse(200, result, "Search suggestions retrieved successfully")
  );
});

/**
 * Trending dishes, curated categories, and popular search tags.
 * GET /api/search/trending
 */
const getTrending = asyncHandler(async (req, res) => {
  const result = await getTrendingAndCategories();

  return res.status(200).json(
    new ApiResponse(200, result, "Trending discovery retrieved successfully")
  );
});

/**
 * Quick category lookup.
 * GET /api/search/category/:category
 */
const getCategoryDishes = asyncHandler(async (req, res) => {
  const { category } = req.params;
  const { lat, lng, sortBy = "relevance", page = 1, limit = 20, isVeg } = req.query;

  const result = await searchDishesAndRestaurants({
    query: "",
    category,
    isVeg,
    userLat: lat,
    userLng: lng,
    sortBy,
    page,
    limit,
  });

  return res.status(200).json(
    new ApiResponse(200, result, `Dishes in ${category} retrieved successfully`)
  );
});

module.exports = {
  searchAll,
  getSuggestions,
  getTrending,
  getCategoryDishes,
};
