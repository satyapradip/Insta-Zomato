// src/middlewares/cache.middleware.js
//
// ─── WHY THIS FILE EXISTS ─────────────────────────────────────────────────────
// HTTP Response Caching & Invalidation Middleware:
//   1. Intercepts read-heavy GET requests and serves sub-5ms cached responses
//   2. Attaches 'X-Cache: HIT' or 'X-Cache: MISS' debug headers
//   3. Exposes invalidation helpers for food mutations, availability toggles, and new items
// ─────────────────────────────────────────────────────────────────────────────

const cacheService = require("../services/redis.services");
const logger = require("../config/logger");

/**
 * Route-level response caching middleware.
 * @param {number} [ttlSeconds=60] - Cache time-to-live in seconds
 * @param {string} [keyPrefix=""] - Optional namespace prefix (e.g. "feed", "search")
 */
function cacheMiddleware(ttlSeconds = 60, keyPrefix = "route") {
  return async function (req, res, next) {
    // Only cache safe GET requests
    if (req.method !== "GET") {
      return next();
    }

    const cacheKey = `cache:${keyPrefix}:${req.originalUrl}`;

    try {
      const cachedResponse = await cacheService.get(cacheKey);

      if (cachedResponse) {
        res.setHeader("X-Cache", "HIT");
        res.setHeader("X-Cache-TTL", `${ttlSeconds}s`);
        return res.status(200).json(cachedResponse);
      }

      // Intercept res.json to cache response payload before sending
      res.setHeader("X-Cache", "MISS");
      const originalJson = res.json.bind(res);

      res.json = function (body) {
        // Only cache successful 200/201 responses
        if (res.statusCode >= 200 && res.statusCode < 300) {
          cacheService.set(cacheKey, body, ttlSeconds).catch((err) => {
            logger.warn("Cache write failed:", { error: err.message, cacheKey });
          });
        }
        return originalJson(body);
      };

      next();
    } catch (error) {
      logger.warn("Cache middleware error:", { error: error.message, cacheKey });
      next();
    }
  };
}

/**
 * Invalidates feed, search, and restaurant caches when menu items mutate.
 * @param {Object} [options]
 * @param {string} [options.partnerId]
 */
async function invalidateFoodCache({ partnerId } = {}) {
  try {
    await Promise.all([
      cacheService.delPattern("cache:feed*"),
      cacheService.delPattern("cache:search*"),
      cacheService.delPattern("cache:food*"),
      partnerId ? cacheService.delPattern(`cache:partner:${partnerId}*`) : Promise.resolve(),
    ]);
    logger.info("Food catalog cache tags invalidated");
  } catch (error) {
    logger.warn("Failed to invalidate food cache:", { error: error.message });
  }
}

module.exports = {
  cacheMiddleware,
  invalidateFoodCache,
};
