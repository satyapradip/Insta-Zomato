// Must be first — loads .env into process.env before anything else runs
require("dotenv").config();

// config/index.js runs Zod validation immediately on require.
// If any required env var is missing, it prints a clear error and exits.
const config = require("./src/config/index");

// logger must be required AFTER config (logger.js imports config)
const logger = require("./src/config/logger");
const http = require("http");
const app = require("./src/app");
const { initSocket } = require("./src/services/socket.services");
const connectDB = require("./src/db/db");

// ── Catch any errors that slipped past try/catch ────────────────────────────
// "unhandledRejection"  = a Promise was rejected but nobody called .catch()
// "uncaughtException"   = a synchronous throw that no try/catch handled
//
// Without these handlers the process just exits silently — the error is lost.
// With them we log the error properly before exiting cleanly.
process.on("unhandledRejection", (reason) => {
  logger.error("Unhandled Promise Rejection", { reason: String(reason) });
  // Exit with code 1 (error) after a short delay so the log can flush to disk
  process.exit(1);
});

process.on("uncaughtException", (err) => {
  logger.error("Uncaught Exception — shutting down", {
    error: err.message,
    stack: err.stack,
  });
  process.exit(1);
});

// Connect to PostgreSQL (Neon) via Prisma
const { connectPostgres } = require("./src/db/prisma");
connectPostgres().catch((err) => {
  logger.error("Failed to connect to PostgreSQL:", err);
});

// Create HTTP server instance & mount Socket.io
const server = http.createServer(app);
initSocket(server);

// Start the HTTP & WebSocket server on the port defined in .env (defaults to 3000)
server.listen(config.port, () => {
  logger.info(`Server started with WebSocket hub ⚡`, {
    mode: config.env,
    port: config.port,
  });
});
