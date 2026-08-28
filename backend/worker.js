// worker.js
//
// ─── WHY THIS FILE EXISTS ─────────────────────────────────────────────────────
// Standalone BullMQ Worker process entry point.
// Can run alongside or independently from the Express HTTP API server to process:
//   1. 'order-sla' (Delayed restaurant confirmation SLA timeouts)
//   2. 'notifications' (Asynchronous SMTP email and SMS dispatching)
// ─────────────────────────────────────────────────────────────────────────────

require("dotenv").config();
const { connectPostgres, prisma } = require("./src/db/prisma");
const { createOrderSlaWorker } = require("./src/workers/orderSla.worker");
const { createNotificationWorker } = require("./src/workers/notification.worker");
const { sharedConnection } = require("./src/queues/connection");
const logger = require("./src/config/logger");

async function startWorkers() {
  console.log("\n=======================================================");
  console.log("⚙️  STARTING INSTA-ZOMATO BULLMQ WORKER ENGINE");
  console.log("=======================================================\n");

  // 1. Establish PostgreSQL database connection
  await connectPostgres();

  // 2. Initialize queue workers
  const orderSlaWorker = createOrderSlaWorker();
  const notificationWorker = createNotificationWorker();

  logger.info("🚀 BullMQ Workers running:");
  logger.info("   • Queue: 'order-sla' (Order confirmation timeout SLA & auto-cancellation)");
  logger.info("   • Queue: 'notifications' (Asynchronous Email & SMS dispatch)");

  // 3. Graceful Shutdown Handlers
  async function gracefulShutdown(signal) {
    logger.info(`Received ${signal}. Shutting down BullMQ workers gracefully...`);
    try {
      await Promise.all([
        orderSlaWorker.close(),
        notificationWorker.close(),
      ]);
      await sharedConnection.quit();
      await prisma.$disconnect();
      logger.info("All BullMQ workers and database connections closed cleanly.");
      process.exit(0);
    } catch (err) {
      logger.error(`Error during worker shutdown: ${err.message}`);
      process.exit(1);
    }
  }

  process.on("SIGINT", () => gracefulShutdown("SIGINT"));
  process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
}

if (require.main === module) {
  startWorkers().catch((err) => {
    logger.error("Failed to start BullMQ worker process:", err);
    process.exit(1);
  });
}

module.exports = { startWorkers };
