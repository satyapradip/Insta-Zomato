const { body, param, query } = require("express-validator");

// ── Place Order Validator ───────────────────────────────────────────────────
const placeOrder = [
  body("addressId")
    .optional()
    .isMongoId()
    .withMessage("Invalid address ID format"),

  body("deliveryAddress")
    .optional()
    .isObject()
    .withMessage("Delivery address must be an object"),

  body("deliveryAddress.street")
    .if(body("addressId").not().exists())
    .trim()
    .notEmpty()
    .withMessage("Street address is required when addressId is not provided"),

  body("deliveryAddress.city")
    .if(body("addressId").not().exists())
    .trim()
    .notEmpty()
    .withMessage("City is required when addressId is not provided"),

  body("deliveryAddress.pincode")
    .if(body("addressId").not().exists())
    .trim()
    .matches(/^\d{6}$/)
    .withMessage("Pincode must be exactly 6 digits"),

  body("paymentMethod")
    .optional()
    .toUpperCase()
    .isIn(["RAZORPAY", "WALLET", "COD"])
    .withMessage("Payment method must be one of: RAZORPAY, WALLET, COD"),

  body("tipAmount")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Tip amount cannot be negative"),

  body("deliveryInstructions")
    .optional()
    .isArray()
    .withMessage("Delivery instructions must be an array of strings"),

  body().custom((value, { req }) => {
    if (!req.body.addressId && !req.body.deliveryAddress) {
      throw new Error(
        "Either 'addressId' or a complete 'deliveryAddress' object must be provided",
      );
    }
    return true;
  }),
];

// ── Cancel Order Validator ──────────────────────────────────────────────────
const cancelOrder = [
  body("reason")
    .optional()
    .trim()
    .isLength({ min: 3 })
    .withMessage("Cancellation reason must be at least 3 characters"),
];

// ── Partner Confirm Order Validator ─────────────────────────────────────────
const confirmOrder = [
  body("prepTimeMinutes")
    .optional()
    .isInt({ min: 5, max: 180 })
    .withMessage("Preparation time must be between 5 and 180 minutes"),
];

// ── Deliver Order (with OTP) Validator ──────────────────────────────────────
const deliverOrder = [
  body("otp")
    .notEmpty()
    .withMessage("Delivery OTP is required to mark order as delivered")
    .trim()
    .matches(/^\d{4}$/)
    .withMessage("Delivery OTP must be exactly 4 digits"),
];

// ── Delivery Failed Validator ───────────────────────────────────────────────
const failDelivery = [
  body("reason")
    .trim()
    .notEmpty()
    .withMessage("Failure reason is required when marking delivery failed")
    .isLength({ min: 3 })
    .withMessage("Reason must be at least 3 characters"),
];

// ── Partner Cancellation Validator ──────────────────────────────────────────
const partnerCancel = [
  body("reason")
    .trim()
    .notEmpty()
    .withMessage("Reason is required when cancelling order as a food partner")
    .isLength({ min: 3 })
    .withMessage("Reason must be at least 3 characters"),
];

// ── Status Filter / Pagination Query Validator ──────────────────────────────
const queryOrders = [
  query("status")
    .optional()
    .trim()
    .toUpperCase()
    .isIn([
      "PENDING",
      "CONFIRMED",
      "PREPARING",
      "READY_FOR_PICKUP",
      "PICKED_UP",
      "OUT_FOR_DELIVERY",
      "DELIVERED",
      "CANCELLED",
      "FAILED",
    ])
    .withMessage("Invalid status filter query"),

  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page must be an integer >= 1"),

  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Limit must be between 1 and 100"),
];

module.exports = {
  placeOrder,
  cancelOrder,
  confirmOrder,
  deliverOrder,
  failDelivery,
  partnerCancel,
  queryOrders,
};
