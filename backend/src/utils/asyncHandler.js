/**
 * asyncHandler — eliminates boilerplate try/catch in every controller.
 *
 * Wraps an async Express route handler and automatically forwards any
 * rejected promise (unhandled error) to Express's next() so the global
 * error middleware handles it consistently.
 *
 * Usage:
 *   router.post("/register", asyncHandler(async (req, res) => {
 *     // no try/catch needed — any throw lands in the error middleware
 *     const user = await UserService.create(req.body);
 *     res.status(201).json(new ApiResponse(201, user, "Registered"));
 *   }));
 *
 * @param {Function} fn - An async (req, res, next) Express handler
 * @returns {Function}  - A standard Express middleware function
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;
