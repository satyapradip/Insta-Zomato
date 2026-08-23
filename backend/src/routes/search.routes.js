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

const router = express.Router();

// Autocomplete suggestions
router.get("/suggestions", searchController.getSuggestions);

// Trending categories & popular keywords
router.get("/trending", searchController.getTrending);

// Category shortcut
router.get("/category/:category", searchController.getCategoryDishes);

// Universal Search (Dishes, Cuisines, Restaurants, Dynamic Facet Filters)
router.get("/", searchController.searchAll);

module.exports = router;
