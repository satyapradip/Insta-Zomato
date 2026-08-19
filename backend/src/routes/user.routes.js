const express = require("express");
const socialController = require("../controllers/social.controllers");
const authController = require("../controllers/auth.controllers");
const { requireAuth } = require("../middlewares/auth.middlewares");

const router = express.Router();

// GET /api/users/me — Profile of authenticated user
router.get("/me", requireAuth, authController.getCurrentProfile);

// GET /api/users/me/likes — All liked food reels
router.get("/me/likes", requireAuth, socialController.getUserLikes);

// GET /api/users/me/saved — All saved/bookmarked food reels
router.get("/me/saved", requireAuth, socialController.getUserSaved);

module.exports = router;
