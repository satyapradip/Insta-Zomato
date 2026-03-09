const express = require("express");
const authController = require("../controllers/auth.controllers");
const authValidators = require("../validators/auth.validators");
const validate = require("../middlewares/validate.middleware");

const router = express.Router();

// ── User auth ────────────────────────────────────────────────────────────────
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
router.post("/user/logout", authController.logoutUser);

// ── Food partner auth ────────────────────────────────────────────────────────
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
router.post("/foodpartner/logout", authController.logoutFoodPartner);

module.exports = router;
