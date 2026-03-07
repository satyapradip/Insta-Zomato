const rateLimit = require("express-rate-limit");

/**
 * Generic helper — all limiters share the same JSON error shape so the
 * frontend can handle them uniformly.
 */
const makeHandler = (message) => (req, res) => {
  res.status(429).json({
    success: false,
    statusCode: 429,
    message,
  });
};

// ── Global limiter ─────────────────────────────────────────────────────────
// Applied to every request: 100 req / 15 min per IP
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true, // Return RateLimit-* headers (RFC 6585)
  legacyHeaders: false,
  handler: makeHandler(
    "Too many requests from this IP. Please try again after 15 minutes.",
  ),
});

// ── Auth limiter ───────────────────────────────────────────────────────────
// Login, register, forgot-password: 10 req / 15 min per IP
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: makeHandler(
    "Too many authentication attempts. Please try again after 15 minutes.",
  ),
});

// ── Upload limiter ─────────────────────────────────────────────────────────
// Video / image uploads: 5 req / hour per IP
const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: makeHandler(
    "Upload limit reached. You can upload at most 5 files per hour.",
  ),
});

// ── Order limiter ─────────────────────────────────────────────────────────
// Order placement: 20 req / min per IP (tightened per-user in order controller)
const orderLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  handler: makeHandler(
    "Too many order requests. Please slow down and try again in a minute.",
  ),
});

module.exports = { globalLimiter, authLimiter, uploadLimiter, orderLimiter };
