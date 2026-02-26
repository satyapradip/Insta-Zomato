const express = require("express");
const foodController = require("../controllers/food.controllers");
const authMiddleware = require("../middlewares/auth.middlewares");
const multer = require("multer");

const router = express.Router();

// Use memoryStorage so req.file.buffer is available for direct upload to ImageKit
// (diskStorage would save to disk and NOT populate req.file.buffer)
const upload = multer({ storage: multer.memoryStorage() });

// POST /api/food/
// Protected — food partners only. Uploads video to ImageKit and saves food item.
router.post(
  "/",
  authMiddleware.authFoodPartnerMiddleware,
  upload.single("video"),
  foodController.createFoodItem,
);

module.exports = router;
