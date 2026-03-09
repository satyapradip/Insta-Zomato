const { validationResult } = require("express-validator");
const ApiError = require("../utils/ApiError");

/**
 * Drop this after any express-validator chain in a route.
 * Collects all field errors and forwards a 422 ApiError to the error handler.
 *
 * Usage:
 *   router.post("/register", registerUserValidator, validate, controller);
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const details = errors.array().map((e) => e.msg);
    return next(new ApiError(422, details[0], details));
  }
  next();
};

module.exports = validate;
