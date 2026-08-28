// Must be first — loads .env into process.env before anything else runs
require("dotenv").config();

// config/index.js runs Zod validation immediately on require.
// If any required env var is missing, it prints a clear error and exits.
const config = require("./src/config/index");

// logger must be required AFTER config (logger.js imports config)
const logger = require("./src/config/logger");
const http = require("http");
const app = require("./src/app");
const { connectPostgres } = require("./src/db/prisma");
const { initSocket, setupRedisAdapter } = require("./src/services/socket.services");

async function startServer() {
  try {
    // Connect to PostgreSQL (Neon) via Prisma
    await connectPostgres();

    // Create HTTP server instance & mount Socket.io
    const server = http.createServer(app);
    const io = initSocket(server);

    // Wire Socket.io Redis Adapter (Fail-Fast startup)
    await setupRedisAdapter(io);

    // Start the HTTP & WebSocket server on the port defined in .env
    server.listen(config.port, () => {
      logger.info(`Server started with WebSocket hub ⚡`, {
        mode: config.env,
        port: config.port,
      });
    });
  } catch (err) {
    logger.error("❌ Server startup failed — exiting process", { error: err.message });
    process.exit(1);
  }
}

startServer();
