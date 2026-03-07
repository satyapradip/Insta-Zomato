/**
 * Custom API Error class that extends the native Error.
 * Use this throughout the codebase instead of raw Error objects
 * so that the global error handler can produce consistent JSON responses.
 *
 * Usage:
 *   throw new ApiError(404, "User not found");
 *   throw new ApiError(400, "Validation failed", ["field errors…"]);
 */
class ApiError extends Error {
  /**
   * @param {number} statusCode   - HTTP status code (e.g. 400, 401, 404, 500)
   * @param {string} message      - Human-readable error message
   * @param {Array}  errors       - Optional array of field-level / detail errors
   * @param {string} stack        - Optional custom stack trace (rarely needed)
   */
  constructor(
    statusCode,
    message = "Something went wrong",
    errors = [],
    stack = "",
  ) {
    super(message);

    this.statusCode = statusCode;
    this.message = message;
    this.success = false;
    this.errors = errors;
    this.data = null;

    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

module.exports = ApiError;
