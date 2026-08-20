const express = require("express");
const socialController = require("../controllers/social.controllers");
const authController = require("../controllers/auth.controllers");
const addressController = require("../controllers/address.controllers");
const addressValidators = require("../validators/address.validators");
const validate = require("../middlewares/validate.middleware");
const { requireAuth, requireCustomer } = require("../middlewares/auth.middlewares");

const router = express.Router();

// GET /api/users/me — Profile of authenticated user
router.get("/me", requireAuth, authController.getCurrentProfile);

// GET /api/users/me/likes — All liked food reels
router.get("/me/likes", requireAuth, socialController.getUserLikes);

// GET /api/users/me/saved — All saved/bookmarked food reels
router.get("/me/saved", requireAuth, socialController.getUserSaved);

// ── Address Book Endpoints ──────────────────────────────────────────────────
router.post(
  "/addresses",
  requireAuth,
  requireCustomer,
  addressValidators.addAddress,
  validate,
  addressController.addAddress,
);

router.get(
  "/addresses",
  requireAuth,
  requireCustomer,
  addressController.getUserAddresses,
);

router.delete(
  "/addresses/:id",
  requireAuth,
  requireCustomer,
  addressController.deleteAddress,
);

router.put(
  "/addresses/:id/default",
  requireAuth,
  requireCustomer,
  addressController.setDefaultAddress,
);

module.exports = router;
