// src/routes/search.routes.js
//
// ─── WHY THIS FILE EXISTS ─────────────────────────────────────────────────────
// Public routes for Search & Discovery:
//   1. GET /api/search                 - Multi-field search & dynamic facet filters
//   2. GET /api/search/suggestions     - Instant autocomplete suggestions
//   3. GET /api/search/trending        - Trending categories & popular search terms
//   4. GET /api/search/category/:name  - Category filtered dishes
// ─────────────────────────────────────────────────────────────────────────────

const express = require("express");
const searchController = require("../controllers/search.controllers");
const { cacheMiddleware } = require("../middlewares/cache.middleware");

const router = express.Router();

// Autocomplete suggestions (120s TTL cache)
router.get("/suggestions", cacheMiddleware(120, "search:suggest"), searchController.getSuggestions);

// Trending categories & popular keywords (300s TTL cache)
router.get("/trending", cacheMiddleware(300, "search:trending"), searchController.getTrending);

// Category shortcut (60s TTL cache)
router.get("/category/:category", cacheMiddleware(60, "search:category"), searchController.getCategoryDishes);

// Universal Search (Dishes, Cuisines, Restaurants, Dynamic Facet Filters - 30s TTL cache)
router.get("/", cacheMiddleware(30, "search:query"), searchController.searchAll);

module.exports = router;
