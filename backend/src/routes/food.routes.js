const express = require("express");
const foodController = require("../controllers/food.controllers");
const socialController = require("../controllers/social.controllers");
const {
  requireAuth,
  requireFoodPartner,
} = require("../middlewares/auth.middlewares");
const multer = require("multer");
const foodValidators = require("../validators/food.validators");
const validate = require("../middlewares/validate.middleware");

const router = express.Router();

// Use memoryStorage for Cloudinary direct stream piping
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 60 * 1024 * 1024 }, // 60MB max video
});

// ── CRUD Food Items & Video Reels ────────────────────────────────────────────

// POST /api/food/ — Upload video reel & create dish (Food Partner only)
router.post(
  "/",
  requireAuth,
  requireFoodPartner,
  upload.single("video"),
  foodValidators.createFoodItem,
  validate,
  foodController.createFoodItem,
);

// GET /api/food/ — Public list of all available food items
router.get("/", foodController.getAllFoodItems);

// GET /api/food/:id — Single food item detail
router.get("/:id", foodController.getFoodItemById);

// PUT /api/food/:id — Update food item details (Partner only)
router.put(
  "/:id",
  requireAuth,
  requireFoodPartner,
  foodValidators.updateFoodItem,
  validate,
  foodController.updateFoodItem,
);

// PATCH /api/food/:id/availability — Toggle in-stock / out-of-stock
router.patch(
  "/:id/availability",
  requireAuth,
  requireFoodPartner,
  foodController.toggleAvailability,
);

// DELETE /api/food/:id — Delete food item & media (Partner only)
router.delete(
  "/:id",
  requireAuth,
  requireFoodPartner,
  foodController.deleteFoodItem,
);

// ── Social Engagement Routes (Likes, Saves, Comments) ────────────────────────

// POST /api/food/:id/like — Toggle like on food reel
router.post("/:id/like", requireAuth, socialController.toggleLike);

// POST /api/food/:id/save — Bookmark reel to wishlist/collection
router.post("/:id/save", requireAuth, socialController.toggleSave);

// POST /api/food/:id/comments — Post a comment or reply
router.post(
  "/:id/comments",
  requireAuth,
  foodValidators.addComment,
  validate,
  socialController.addComment,
);

// GET /api/food/:id/comments — Paginated comments list
router.get("/:id/comments", socialController.getComments);

module.exports = router;
