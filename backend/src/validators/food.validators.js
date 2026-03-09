const { body } = require("express-validator");

// ── Create food item ─────────────────────────────────────────────────────────
const createFoodItem = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Food name is required")
    .isLength({ min: 2, max: 100 })
    .withMessage("Food name must be 2–100 characters"),

  body("price")
    .notEmpty()
    .withMessage("Price is required")
    .isFloat({ min: 0.01 })
    .withMessage("Price must be a positive number"),

  body("description")
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Description must not exceed 500 characters"),
];

module.exports = { createFoodItem };
