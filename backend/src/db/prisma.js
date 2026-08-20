const { PrismaClient } = require("@prisma/client");
const logger = require("../config/logger");

const prisma = new PrismaClient({
  log:
    process.env.NODE_ENV === "development"
      ? ["warn", "error"]
      : ["error"],
});

async function connectPostgres() {
  try {
    await prisma.$connect();
    logger.info(" Connected to PostgreSQL (Neon)");
    return prisma;
  } catch (error) {
    logger.error(" PostgreSQL connection failed", { error: error.message });
    throw error;
  }
}

process.on("beforeExit", async () => {
  await prisma.$disconnect();
});

module.exports = { prisma, connectPostgres };
