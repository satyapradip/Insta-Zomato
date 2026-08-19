const { body } = require("express-validator");

// ── User: register ──────────────────────────────────────────────────────────
const registerUser = [
  body("fullName")
    .trim()
    .notEmpty()
    .withMessage("Full name is required")
    .isLength({ min: 2, max: 50 })
    .withMessage("Full name must be 2–50 characters"),

  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Must be a valid email address")
    .normalizeEmail(),

  body("password")
    .notEmpty()
    .withMessage("Password is required")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters")
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage(
      "Password must contain at least one uppercase letter, one lowercase letter, and one digit",
    ),

  body("phone")
    .optional()
    .trim()
    .matches(/^[6-9]\d{9}$/)
    .withMessage("Must be a valid 10-digit Indian mobile number"),
];

// ── User: login ─────────────────────────────────────────────────────────────
const loginUser = [
  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Must be a valid email address")
    .normalizeEmail(),

  body("password").notEmpty().withMessage("Password is required"),
];

// ── Food Partner: register ───────────────────────────────────────────────────
const registerFoodPartner = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Owner name is required")
    .isLength({ min: 2, max: 100 })
    .withMessage("Name must be 2–100 characters"),

  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Must be a valid email address")
    .normalizeEmail(),

  body("password")
    .notEmpty()
    .withMessage("Password is required")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters")
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage(
      "Password must contain at least one uppercase letter, one lowercase letter, and one digit",
    ),

  body("phone")
    .trim()
    .notEmpty()
    .withMessage("Phone number is required")
    .matches(/^[6-9]\d{9}$/)
    .withMessage("Must be a valid 10-digit Indian mobile number"),

  body("restaurantName")
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage("Restaurant name must be 2–100 characters"),

  body("fssaiLicenseNumber")
    .optional()
    .trim()
    .isLength({ min: 14, max: 14 })
    .withMessage("FSSAI License must be exactly 14 digits"),
];

// ── Food Partner: login ──────────────────────────────────────────────────────
const loginFoodPartner = [
  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Must be a valid email address")
    .normalizeEmail(),

  body("password").notEmpty().withMessage("Password is required"),
];

// ── Delivery Partner: register ───────────────────────────────────────────────
const registerDeliveryPartner = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Rider name is required")
    .isLength({ min: 2, max: 100 })
    .withMessage("Name must be 2–100 characters"),

  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Must be a valid email address")
    .normalizeEmail(),

  body("password")
    .notEmpty()
    .withMessage("Password is required")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters")
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage(
      "Password must contain at least one uppercase letter, one lowercase letter, and one digit",
    ),

  body("phone")
    .trim()
    .notEmpty()
    .withMessage("Phone number is required")
    .matches(/^[6-9]\d{9}$/)
    .withMessage("Must be a valid 10-digit Indian mobile number"),

  body("vehicleType")
    .optional()
    .isIn(["bike", "scooter", "electric_vehicle", "cycle"])
    .withMessage(
      "Vehicle type must be one of: bike, scooter, electric_vehicle, cycle",
    ),

  body("vehicleNumber")
    .optional()
    .trim()
    .isLength({ min: 5, max: 20 })
    .withMessage("Vehicle number must be 5–20 characters"),

  body("drivingLicenseNumber")
    .optional()
    .trim()
    .isLength({ min: 5, max: 30 })
    .withMessage("Driving license number must be 5–30 characters"),
];

// ── Delivery Partner: login ──────────────────────────────────────────────────
const loginDeliveryPartner = [
  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Must be a valid email address")
    .normalizeEmail(),

  body("password").notEmpty().withMessage("Password is required"),
];

module.exports = {
  registerUser,
  loginUser,
  registerFoodPartner,
  loginFoodPartner,
  registerDeliveryPartner,
  loginDeliveryPartner,
};
