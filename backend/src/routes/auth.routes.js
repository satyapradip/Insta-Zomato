const express = require("express");
const authController = require("../controllers/auth.controllers");
const authValidators = require("../validators/auth.validators");
const validate = require("../middlewares/validate.middleware");
const { requireAuth } = require("../middlewares/auth.middlewares");

const router = express.Router();

// ── User Auth Routes ─────────────────────────────────────────────────────────
router.post(
  "/user/register",
  authValidators.registerUser,
  validate,
  authController.registerUser,
);
router.post(
  "/user/login",
  authValidators.loginUser,
  validate,
  authController.loginUser,
);
router.post("/user/logout", requireAuth, authController.logoutUser);

// ── Food Partner Auth Routes ─────────────────────────────────────────────────
router.post(
  "/foodpartner/register",
  authValidators.registerFoodPartner,
  validate,
  authController.registerFoodPartner,
);
router.post(
  "/foodpartner/login",
  authValidators.loginFoodPartner,
  validate,
  authController.loginFoodPartner,
);
router.post(
  "/foodpartner/logout",
  requireAuth,
  authController.logoutFoodPartner,
);

// ── Delivery Partner Auth Routes ─────────────────────────────────────────────
router.post(
  "/delivery/register",
  authValidators.registerDeliveryPartner,
  validate,
  authController.registerDeliveryPartner,
);
router.post(
  "/delivery/login",
  authValidators.loginDeliveryPartner,
  validate,
  authController.loginDeliveryPartner,
);
router.post(
  "/delivery/logout",
  requireAuth,
  authController.logoutDeliveryPartner,
);

// ── Token Refresh & Profile (Universal) ──────────────────────────────────────
router.post("/refresh", authController.refreshTokens);
router.get("/me", requireAuth, authController.getCurrentProfile);

module.exports = router;
