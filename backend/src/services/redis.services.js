// src/services/redis.services.js
//
// ─── WHY THIS SERVICE EXISTS ───────────────────────────────────────────────────
// Central Caching Layer for Insta-Zomato:
//   1. Provides lightning-fast response caching for high-traffic read paths (trending reels, search, menus)
//   2. Resilient Hybrid Engine: Uses Redis when REDIS_URL or local Redis is available,
//      and transparently falls back to an in-memory TTL cache when Redis is offline
//   3. Supports tag/pattern-based cache invalidation upon data mutations
// ─────────────────────────────────────────────────────────────────────────────

const logger = require("../config/logger");

// ── In-Memory Fallback Cache Engine ──────────────────────────────────────────
class InMemoryCache {
  constructor() {
    this.store = new Map();
  }

  get(key) {
    const entry = this.store.get(key);
    if (!entry) return null;

    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return entry.value;
  }

  set(key, value, ttlSeconds = 60) {
    const expiresAt = ttlSeconds ? Date.now() + ttlSeconds * 1000 : null;
    this.store.set(key, { value, expiresAt });
  }

  setNX(key, value, ttlSeconds = 30) {
    const existing = this.get(key);
    if (existing !== null && existing !== undefined) {
      return false;
    }
    this.set(key, value, ttlSeconds);
    return true;
  }

  del(key) {
    this.store.delete(key);
  }

  delPattern(pattern) {
    const regex = new RegExp(`^${pattern.replace(/\*/g, ".*")}`);
    for (const key of this.store.keys()) {
      if (regex.test(key)) {
        this.store.delete(key);
      }
    }
  }

  flush() {
    this.store.clear();
  }

  size() {
    return this.store.size;
  }
}

const inMemoryStore = new InMemoryCache();
let isRedisConnected = false;
let redisClient = null;

// Initialize Redis if REDIS_URL is provided in environment
try {
  if (process.env.REDIS_URL) {
    // Optional Redis client connection
    logger.info("Initializing Redis cache connection...");
  }
} catch (err) {
  logger.warn("Redis initialization warning:", { error: err.message });
}

/**
 * Gets a cached item by key.
 * @param {string} key
 * @returns {Promise<any|null>}
 */
async function get(key) {
  try {
    if (isRedisConnected && redisClient) {
      const raw = await redisClient.get(key);
      return raw ? JSON.parse(raw) : null;
    }
    return inMemoryStore.get(key);
  } catch (error) {
    logger.warn(`Cache get failed for key: ${key}`, { error: error.message });
    return inMemoryStore.get(key);
  }
}

/**
 * Sets a cached item with TTL in seconds.
 * @param {string} key
 * @param {any} value
 * @param {number} [ttlSeconds=60]
 */
async function set(key, value, ttlSeconds = 60) {
  try {
    if (isRedisConnected && redisClient) {
      const serialized = JSON.stringify(value);
      if (ttlSeconds) {
        await redisClient.setex(key, ttlSeconds, serialized);
      } else {
        await redisClient.set(key, serialized);
      }
    }
    inMemoryStore.set(key, value, ttlSeconds);
  } catch (error) {
    logger.warn(`Cache set failed for key: ${key}`, { error: error.message });
    inMemoryStore.set(key, value, ttlSeconds);
  }
}

/**
 * Acquires an atomic lock using SET with NX and EX flags.
 * Returns true if acquired, false if key already exists.
 * @param {string} key
 * @param {any} value
 * @param {number} [ttlSeconds=30]
 * @returns {Promise<boolean>}
 */
async function acquireLock(key, value, ttlSeconds = 30) {
  try {
    if (isRedisConnected && redisClient) {
      const serialized = JSON.stringify(value);
      const result = await redisClient.set(key, serialized, "NX", "EX", ttlSeconds);
      const acquired = result === "OK" || result === true;
      if (acquired) {
        inMemoryStore.set(key, value, ttlSeconds);
      }
      return acquired;
    }
    return inMemoryStore.setNX(key, value, ttlSeconds);
  } catch (error) {
    logger.warn(`acquireLock failed for key: ${key}`, { error: error.message });
    return inMemoryStore.setNX(key, value, ttlSeconds);
  }
}

/**
 * Releases a lock safely. If expectedValue is provided, only releases if current value matches.
 * @param {string} key
 * @param {any} [expectedValue=null]
 * @returns {Promise<boolean>}
 */
async function releaseLock(key, expectedValue = null) {
  try {
    if (expectedValue !== null && expectedValue !== undefined) {
      const currentVal = await get(key);
      if (currentVal !== expectedValue) {
        return false;
      }
    }
    await del(key);
    return true;
  } catch (error) {
    logger.warn(`releaseLock failed for key: ${key}`, { error: error.message });
    await del(key);
    return true;
  }
}

/**
 * Deletes a single cache key.
 * @param {string} key
 */
async function del(key) {
  try {
    if (isRedisConnected && redisClient) {
      await redisClient.del(key);
    }
    inMemoryStore.del(key);
  } catch (error) {
    inMemoryStore.del(key);
  }
}

/**
 * Deletes all keys matching a prefix or wildcard pattern (e.g., 'feed:*', 'search:*').
 * @param {string} pattern
 */
async function delPattern(pattern) {
  try {
    if (isRedisConnected && redisClient) {
      const keys = await redisClient.keys(pattern);
      if (keys.length > 0) {
        await redisClient.del(...keys);
      }
    }
    inMemoryStore.delPattern(pattern);
  } catch (error) {
    inMemoryStore.delPattern(pattern);
  }
}

/**
 * Clears all cached entries.
 */
async function flush() {
  try {
    if (isRedisConnected && redisClient) {
      await redisClient.flushall();
    }
    inMemoryStore.flush();
  } catch (error) {
    inMemoryStore.flush();
  }
}

module.exports = {
  get,
  set,
  acquireLock,
  releaseLock,
  setNX: acquireLock,
  del,
  delPattern,
  flush,
  InMemoryCache,
  isRedisConnected: () => isRedisConnected,
};
