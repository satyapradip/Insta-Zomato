const express = require("express");
const cartController = require("../controllers/cart.controllers");
const cartValidators = require("../validators/cart.validators");
const validate = require("../middlewares/validate.middleware");
const {
  requireAuth,
  requireCustomer,
} = require("../middlewares/auth.middlewares");

const router = express.Router();

// Apply auth + customer guard to all cart routes
router.use(requireAuth, requireCustomer);

// GET /api/cart — Get active cart with itemized pricing
router.get("/", cartController.getCart);

// POST /api/cart/add — Add item (with variants, add-ons, and single-restaurant lock)
router.post(
  "/add",
  cartValidators.addToCart,
  validate,
  cartController.addToCart,
);

// PUT /api/cart/items/:itemId — Update item quantity (0 to remove)
router.put(
  "/items/:itemId",
  cartValidators.updateItemQuantity,
  validate,
  cartController.updateCartItemQuantity,
);

// DELETE /api/cart/items/:itemId — Remove item from cart
router.delete("/items/:itemId", cartController.removeCartItem);

// DELETE /api/cart — Clear entire cart
router.delete("/", cartController.clearCart);

// POST /api/cart/coupon — Apply discount coupon
router.post(
  "/coupon",
  cartValidators.applyCoupon,
  validate,
  cartController.applyCoupon,
);

// DELETE /api/cart/coupon — Remove applied coupon
router.delete("/coupon", cartController.removeCoupon);

// PUT /api/cart/instructions — Update delivery instructions & rider tip
router.put(
  "/instructions",
  cartValidators.updateInstructionsAndTip,
  validate,
  cartController.updateInstructionsAndTip,
);

module.exports = router;
