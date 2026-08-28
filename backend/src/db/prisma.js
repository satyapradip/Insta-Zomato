let PrismaClient;
try {
  PrismaClient = require("../generated/prisma").PrismaClient;
} catch (_) {
  PrismaClient = require("@prisma/client").PrismaClient;
}
const logger = require("../config/logger");

const prisma = new PrismaClient({
  log:
    process.env.NODE_ENV === "development"
      ? ["warn", "error"]
      : ["error"],
});

async function connectPostgres(maxRetries = 5, delayMs = 2000) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await prisma.$connect();
      logger.info("Connected to PostgreSQL (Neon)");
      return prisma;
    } catch (error) {
      logger.warn(
        `PostgreSQL connection attempt ${attempt}/${maxRetries} failed: ${error.message}`,
      );
      if (attempt === maxRetries) {
        logger.error("PostgreSQL connection failed after all retries", {
          error: error.message,
        });
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, delayMs * attempt));
    }
  }
}

process.on("beforeExit", async () => {
  await prisma.$disconnect();
});

module.exports = { prisma, connectPostgres };
