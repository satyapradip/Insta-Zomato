const express = require("express");
const feedController = require("../controllers/feed.controllers");
const { cacheMiddleware } = require("../middlewares/cache.middleware");

const router = express.Router();

// GET /api/feed — Main Reels video discovery feed (cursor-based, 60s TTL cache)
router.get("/", cacheMiddleware(60, "feed"), feedController.getReelsFeed);

// POST /api/feed/:id/view — Increment view counter
router.post("/:id/view", feedController.recordReelView);

module.exports = router;
