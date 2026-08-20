const { body, param, query } = require("express-validator");

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

  body("discountedPrice")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Discounted price must be a non-negative number"),

  body("description")
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage("Description must not exceed 1000 characters"),

  body("category")
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage("Category must be 2–50 characters"),

  body("isVeg")
    .optional()
    .toBoolean()
    .isBoolean()
    .withMessage("isVeg must be a boolean"),

  body("spiceLevel")
    .optional()
    .isIn(["mild", "medium", "hot"])
    .withMessage("Spice level must be mild, medium, or hot"),

  body("preparationTime")
    .optional()
    .isInt({ min: 1, max: 180 })
    .withMessage("Preparation time must be between 1 and 180 minutes"),
];

// ── Update food item ─────────────────────────────────────────────────────────
const updateFoodItem = [
  param("id").isString().notEmpty().withMessage("Invalid food item ID"),
  body("name")
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage("Food name must be 2–100 characters"),
  body("price")
    .optional()
    .isFloat({ min: 0.01 })
    .withMessage("Price must be a positive number"),
  body("isAvailable")
    .optional()
    .isBoolean()
    .withMessage("isAvailable must be boolean"),
];

// ── Add Comment ──────────────────────────────────────────────────────────────
const addComment = [
  param("id").isString().notEmpty().withMessage("Invalid food item ID"),
  body("text")
    .trim()
    .notEmpty()
    .withMessage("Comment text is required")
    .isLength({ min: 1, max: 500 })
    .withMessage("Comment must be 1–500 characters"),
  body("parentComment")
    .optional()
    .isString()
    .notEmpty()
    .withMessage("Invalid parent comment ID"),
];

module.exports = {
  createFoodItem,
  updateFoodItem,
  addComment,
};
