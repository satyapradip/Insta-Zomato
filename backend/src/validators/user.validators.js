const { body } = require("express-validator");

// ── Update profile ───────────────────────────────────────────────────────────
// Expand in Phase 3 (User Profile)
const updateProfile = [
  body("fullName")
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage("Full name must be 2–50 characters"),

  body("phone")
    .optional()
    .trim()
    .matches(/^[6-9]\d{9}$/)
    .withMessage("Must be a valid 10-digit Indian mobile number"),
];

module.exports = { updateProfile };
