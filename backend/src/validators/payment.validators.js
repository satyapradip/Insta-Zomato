// src/validators/payment.validators.js
const { body } = require("express-validator");

const createOrderPaymentValidator = [
  body("orderId")
    .trim()
    .notEmpty()
    .withMessage("Order ID is required to initiate payment"),
];

const verifyOrderPaymentValidator = [
  body("orderId")
    .trim()
    .notEmpty()
    .withMessage("Order ID is required"),
  body("razorpayOrderId")
    .trim()
    .notEmpty()
    .withMessage("Razorpay Order ID is required"),
  body("razorpayPaymentId")
    .trim()
    .notEmpty()
    .withMessage("Razorpay Payment ID is required"),
  body("razorpaySignature")
    .trim()
    .notEmpty()
    .withMessage("Razorpay cryptographic signature is required"),
];

const walletTopupValidator = [
  body("amount")
    .notEmpty()
    .withMessage("Top-up amount is required")
    .isFloat({ min: 1, max: 100000 })
    .withMessage("Amount must be between ₹1 and ₹1,00,000"),
];

const verifyWalletTopupValidator = [
  body("razorpayOrderId")
    .trim()
    .notEmpty()
    .withMessage("Razorpay Order ID is required"),
  body("razorpayPaymentId")
    .trim()
    .notEmpty()
    .withMessage("Razorpay Payment ID is required"),
  body("razorpaySignature")
    .trim()
    .notEmpty()
    .withMessage("Razorpay signature is required"),
  body("amount")
    .notEmpty()
    .withMessage("Top-up amount is required")
    .isFloat({ min: 1 })
    .withMessage("Amount must be greater than 0"),
];

const walletPayValidator = [
  body("orderId")
    .trim()
    .notEmpty()
    .withMessage("Order ID is required for wallet payment"),
];

module.exports = {
  createOrderPaymentValidator,
  verifyOrderPaymentValidator,
  walletTopupValidator,
  verifyWalletTopupValidator,
  walletPayValidator,
};
