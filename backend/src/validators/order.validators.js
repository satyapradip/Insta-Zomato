const { body } = require("express-validator");

// ── Place order ──────────────────────────────────────────────────────────────
// Expand in Phase 7 (Order System)
const placeOrder = [
  body("addressId")
    .notEmpty()
    .withMessage("Delivery address is required")
    .isMongoId()
    .withMessage("Invalid address ID"),

  body("paymentMethod")
    .notEmpty()
    .withMessage("Payment method is required")
    .isIn(["razorpay", "wallet", "cod"])
    .withMessage("Payment method must be one of: razorpay, wallet, cod"),
];

module.exports = { placeOrder };
