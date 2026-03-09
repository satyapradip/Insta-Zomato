const { body } = require("express-validator");

// ── Add / update address ─────────────────────────────────────────────────────
// Expand in Phase 3 (Address Book)
const addAddress = [
  body("label")
    .optional()
    .trim()
    .isIn(["Home", "Work", "Other"])
    .withMessage("Label must be Home, Work, or Other"),

  body("street").trim().notEmpty().withMessage("Street is required"),

  body("city").trim().notEmpty().withMessage("City is required"),

  body("state").trim().notEmpty().withMessage("State is required"),

  body("pincode")
    .trim()
    .notEmpty()
    .withMessage("Pincode is required")
    .matches(/^\d{6}$/)
    .withMessage("Pincode must be exactly 6 digits"),
];

const updateAddress = [
  body("label")
    .optional()
    .trim()
    .isIn(["Home", "Work", "Other"])
    .withMessage("Label must be Home, Work, or Other"),

  body("street")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Street cannot be empty"),
  body("city").optional().trim().notEmpty().withMessage("City cannot be empty"),
  body("state")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("State cannot be empty"),

  body("pincode")
    .optional()
    .trim()
    .matches(/^\d{6}$/)
    .withMessage("Pincode must be exactly 6 digits"),
];

module.exports = { addAddress, updateAddress };
