const express = require("express");
const feedController = require("../controllers/feed.controllers");

const router = express.Router();

// GET /api/feed — Main Reels video discovery feed (cursor-based)
router.get("/", feedController.getReelsFeed);

// POST /api/feed/:id/view — Increment view counter
router.post("/:id/view", feedController.recordReelView);

module.exports = router;
