const ApiError = require("../utils/ApiError");

/**
 * Global Error Handler Middleware
 *
 * Must be registered LAST in app.js (after all routes) — Express
 * identifies a 4-argument middleware as an error handler.
 *
 * Handles:
 *  - ApiError instances thrown anywhere in the app
 *  - Mongoose CastError  → 400 (invalid ObjectId, etc.)
 *  - Mongoose ValidationError → 422 with individual field messages
 *  - Mongoose duplicate key (code 11000) → 409 Conflict
 *  - JWT errors → 401
 *  - Generic / unexpected errors → 500
 */
const errorMiddleware = (err, req, res, next) => {
  // eslint-disable-line no-unused-vars
  // ── Clone mutable defaults from the thrown error ──────────────────────
  let statusCode = err.statusCode || 500;
  let message = err.message || "Internal Server Error";
  let errors = err.errors || [];

  // ── Mongoose: invalid ObjectId ─────────────────────────────────────────
  if (err.name === "CastError") {
    statusCode = 400;
    message = `Invalid ${err.path}: ${err.value}`;
  }

  // ── Mongoose: schema-level validation failure ──────────────────────────
  if (err.name === "ValidationError") {
    statusCode = 422;
    message = "Validation failed";
    errors = Object.values(err.errors).map((e) => ({
      field: e.path,
      message: e.message,
    }));
  }

  // ── Mongoose: duplicate key (unique constraint) ────────────────────────
  if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyValue || {})[0] || "field";
    message = `${field} already exists`;
  }

  // ── JWT: invalid or expired token ─────────────────────────────────────
  if (err.name === "JsonWebTokenError") {
    statusCode = 401;
    message = "Invalid token. Please log in again.";
  }
  if (err.name === "TokenExpiredError") {
    statusCode = 401;
    message = "Token expired. Please log in again.";
  }

  // ── Build the final response ──────────────────────────────────────────
  const response = {
    success: false,
    statusCode,
    message,
    ...(errors.length > 0 && { errors }),
    // Include stack trace only in development — never expose in production
    ...(require("../config/index").isDev && { stack: err.stack }),
  };

  return res.status(statusCode).json(response);
};

module.exports = errorMiddleware;
