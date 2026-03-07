/**
 * Standardised API success response wrapper.
 * All successful controller responses should go through this so the
 * frontend always receives the same shape:
 *
 *  {
 *    "statusCode": 200,
 *    "success": true,
 *    "message": "Users fetched successfully",
 *    "data": { ... }
 *  }
 *
 * Usage:
 *   res.status(200).json(new ApiResponse(200, data, "Users fetched successfully"));
 */
class ApiResponse {
  /**
   * @param {number} statusCode - HTTP status code
   * @param {*}      data       - The response payload (object, array, null, etc.)
   * @param {string} message    - Human-readable success message
   */
  constructor(statusCode, data, message = "Success") {
    this.statusCode = statusCode;
    this.data = data;
    this.message = message;
    this.success = statusCode < 400;
  }
}

module.exports = ApiResponse;
