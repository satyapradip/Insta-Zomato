const { body, param } = require("express-validator");

// ── Add Item to Cart Validator ───────────────────────────────────────────────
const addToCart = [
  body("foodId").isMongoId().withMessage("Invalid food item ID"),
  body("quantity")
    .optional()
    .isInt({ min: 1, max: 20 })
    .withMessage("Quantity must be between 1 and 20"),
  body("selectedVariant")
    .optional()
    .isObject()
    .withMessage("selectedVariant must be an object"),
  body("selectedAddOns")
    .optional()
    .isArray()
    .withMessage("selectedAddOns must be an array"),
  body("forceClear")
    .optional()
    .isBoolean()
    .withMessage("forceClear must be a boolean"),
];

// ── Update Item Quantity Validator ───────────────────────────────────────────
const updateItemQuantity = [
  param("itemId").isMongoId().withMessage("Invalid cart item ID"),
  body("quantity")
    .isInt({ min: 0, max: 20 })
    .withMessage("Quantity must be between 0 and 20 (0 to remove)"),
];

// ── Apply Coupon Validator ───────────────────────────────────────────────────
const applyCoupon = [
  body("code")
    .trim()
    .notEmpty()
    .withMessage("Coupon code is required")
    .isLength({ min: 3, max: 20 })
    .withMessage("Coupon code must be 3–20 characters"),
];

// ── Update Delivery Instructions & Tip Validator ─────────────────────────────
const updateInstructionsAndTip = [
  body("instructions")
    .optional()
    .isArray()
    .withMessage("Instructions must be an array of string pills"),
  body("tipAmount")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Tip amount cannot be negative"),
];

module.exports = {
  addToCart,
  updateItemQuantity,
  applyCoupon,
  updateInstructionsAndTip,
};
