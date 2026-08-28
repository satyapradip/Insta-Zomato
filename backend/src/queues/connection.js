// src/queues/connection.js
//
// ─── WHY THIS FILE EXISTS ─────────────────────────────────────────────────────
// Shared Redis connection configuration for BullMQ queues and workers.
// BullMQ requires maxRetriesPerRequest: null on IORedis instances.
// ─────────────────────────────────────────────────────────────────────────────

const IORedis = require("ioredis");
const config = require("../config/index");

function createRedisConnection() {
  const conn = new IORedis(config.redis.url, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    retryStrategy(times) {
      return Math.min(times * 200, 3000);
    },
  });

  conn.on("error", (err) => {
    // Gracefully handle Redis connection errors without crashing
  });

  return conn;
}

const sharedConnection = createRedisConnection();

module.exports = {
  createRedisConnection,
  sharedConnection,
};
