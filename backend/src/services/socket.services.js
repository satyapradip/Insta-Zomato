// src/services/socket.services.js
//
// ─── WHY THIS FILE EXISTS ─────────────────────────────────────────────────────
// Centralizes the real-time WebSocket layer:
//   1. Authenticates socket connection handshakes using JWT
//   2. Dynamically organizes connected clients into targeted rooms
//   3. Exposes clean, decoupled helper functions for controllers to emit events
// ─────────────────────────────────────────────────────────────────────────────

const { Server } = require("socket.io");
const { createAdapter } = require("@socket.io/redis-adapter");
const { createClient } = require("redis");
const jwt = require("jsonwebtoken");
const config = require("../config/index");
const logger = require("../config/logger");

let io = null;
let pubClient = null;
let subClient = null;

/**
 * Initializes and wires the Socket.io Redis adapter using a dedicated Pub/Sub client pair.
 * In production, fails fast with process.exit(1) if connection cannot be established.
 * In development, gracefully falls back to the in-memory adapter if Redis is offline.
 * @param {Server} targetIO
 * @param {string} [redisUrl]
 * @returns {Promise<{ pubClient: any, subClient: any }|null>}
 */
async function setupRedisAdapter(targetIO, redisUrl) {
  const ioInstance = targetIO || io;
  if (!ioInstance) {
    throw new Error("Socket.io instance must be initialized before attaching Redis adapter");
  }

  const url = redisUrl || config.redis?.url || process.env.REDIS_URL;
  if (!url) {
    if (config.isProd) {
      logger.error("❌ REDIS_URL is missing — cannot initialize Socket.io Redis adapter in production.");
      process.exit(1);
    }
    logger.warn("⚠️ REDIS_URL not configured — running Socket.io with in-memory adapter.");
    return null;
  }

  try {
    const clientOptions = {
      url,
      socket: {
        connectTimeout: 2000,
        reconnectStrategy: (retries) => (retries > 1 ? false : 500),
      },
    };

    pubClient = createClient(clientOptions);
    subClient = pubClient.duplicate();

    pubClient.on("error", (err) => {
      if (config.isProd) logger.error("Redis PubClient error:", { error: err.message });
    });
    subClient.on("error", (err) => {
      if (config.isProd) logger.error("Redis SubClient error:", { error: err.message });
    });

    await Promise.all([pubClient.connect(), subClient.connect()]);
    ioInstance.adapter(createAdapter(pubClient, subClient));
    logger.info("⚡ Socket.io Redis adapter connected & initialized successfully");
    return { pubClient, subClient };
  } catch (err) {
    if (config.isProd) {
      logger.error("❌ Failed to connect Socket.io Redis adapter — shutting down", {
        error: err.message,
        url,
      });
      process.exit(1);
    }
    logger.warn(`⚠️ Redis server offline at ${url} — using Socket.io local memory adapter for development.`);
    return null;
  }
}

/**
 * Extracts and verifies JWT from handshake auth, query, headers, or cookies.
 */
function extractTokenFromHandshake(handshake) {
  // 1. Check auth object (e.g. io(url, { auth: { token: '...' } }))
  if (handshake.auth && handshake.auth.token) {
    const raw = handshake.auth.token;
    return raw.startsWith("Bearer ") ? raw.slice(7) : raw;
  }

  // 2. Check query string (e.g. io(url, { query: { token: '...' } }))
  if (handshake.query && handshake.query.token) {
    const raw = handshake.query.token;
    return raw.startsWith("Bearer ") ? raw.slice(7) : raw;
  }

  // 3. Check Authorization header
  if (handshake.headers && handshake.headers.authorization) {
    const authHeader = handshake.headers.authorization;
    if (authHeader.startsWith("Bearer ")) {
      return authHeader.slice(7);
    }
  }

  // 4. Check Cookie header for accessToken
  if (handshake.headers && handshake.headers.cookie) {
    const cookieString = handshake.headers.cookie;
    const match = cookieString.match(/(?:^|;\s*)accessToken=([^;]+)/);
    if (match) {
      return match[1];
    }
  }

  return null;
}

/**
 * Initializes Socket.io on the Node.js HTTP server.
 * @param {import("http").Server} httpServer
 * @returns {Server}
 */
function initSocket(httpServer, options = {}) {
  io = new Server(httpServer, {
    cors: {
      origin: config.cors.allowedOrigins,
      credentials: true,
      methods: ["GET", "POST"],
    },
    pingTimeout: 60000,
    pingInterval: 25000,
    ...options,
  });

  if (options.adapter) {
    io.adapter(options.adapter);
  }

  // ── Authentication Middleware ─────────────────────────────────────────────
  io.use((socket, next) => {
    try {
      const token = extractTokenFromHandshake(socket.handshake);
      if (!token) {
        return next(new Error("Authentication error: No access token provided"));
      }

      const decoded = jwt.verify(token, config.jwt.secret);
      socket.user = {
        id: decoded.id,
        email: decoded.email,
        role: decoded.role || "customer",
      };

      next();
    } catch (err) {
      logger.warn(`[SOCKET AUTH REJECTED] Handshake failed: ${err.message}`);
      next(new Error(`Authentication error: ${err.message}`));
    }
  });

  // ── Connection Handler ────────────────────────────────────────────────────
  io.on("connection", (socket) => {
    const { id: userId, role } = socket.user;
    logger.info(`[SOCKET CONNECTED] User: ${userId} (Role: ${role}, Socket: ${socket.id})`);

    // Automatically join role-specific private rooms
    if (role === "customer") {
      socket.join(`user:${userId}`);
    } else if (role === "foodpartner") {
      socket.join(`partner:${userId}`);
    } else if (role === "deliverypartner") {
      socket.join(`delivery:${userId}`);
      socket.join("riders:online");
    } else if (role === "admin") {
      socket.join("admin:stream");
    }

    // ── Client Subscription Handlers ────────────────────────────────────────

    // Join order live tracking room
    socket.on("join:order", (orderId) => {
      if (orderId) {
        socket.join(`order:${orderId}`);
        logger.debug(`Socket ${socket.id} joined room: order:${orderId}`);
      }
    });

    // Leave order live tracking room
    socket.on("leave:order", (orderId) => {
      if (orderId) {
        socket.leave(`order:${orderId}`);
        logger.debug(`Socket ${socket.id} left room: order:${orderId}`);
      }
    });

    // Join food video reel social room (live likes / comments)
    socket.on("join:reel", (foodId) => {
      if (foodId) {
        socket.join(`food:${foodId}`);
        logger.debug(`Socket ${socket.id} joined room: food:${foodId}`);
      }
    });

    // Leave food video reel social room
    socket.on("leave:reel", (foodId) => {
      if (foodId) {
        socket.leave(`food:${foodId}`);
        logger.debug(`Socket ${socket.id} left room: food:${foodId}`);
      }
    });

    // Rider live location update emitted over socket
    socket.on("rider:location_update", (data) => {
      if (socket.user.role === "deliverypartner" && data?.orderId && data?.coordinates) {
        emitToOrder(data.orderId, "order:location_update", {
          orderId: data.orderId,
          riderId: userId,
          coordinates: data.coordinates, // [lng, lat]
          timestamp: new Date(),
        });
      }
    });

    // Rider claims an order over WebSocket
    socket.on("order:claim", async (data) => {
      if (socket.user.role === "deliverypartner" && data?.orderId) {
        const orderId = data.orderId;
        try {
          const { claimAndAssignOrder } = require("./dispatch.services");
          const updatedOrder = await claimAndAssignOrder({
            orderId,
            riderId: userId,
            riderName: socket.user.name || "Delivery Partner",
          });
          socket.emit("order:claim:accepted", { orderId, order: updatedOrder });
        } catch (err) {
          logger.warn(
            `Socket claim failed for rider ${userId} on order ${orderId}: ${err.message}`
          );
          socket.emit("order:claim:rejected", {
            orderId,
            reason:
              err.statusCode === 409 || err.message.includes("already")
                ? "already_assigned"
                : err.message,
          });
        }
      }
    });

    socket.on("disconnect", (reason) => {
      logger.info(`[SOCKET DISCONNECTED] User: ${userId} (${reason})`);
    });
  });

  logger.info("⚡ Socket.io real-time event server initialized");
  return io;
}

/**
 * Returns the active Socket.io instance.
 */
function getIO() {
  if (!io) {
    logger.warn("Socket.io instance requested before initialization");
  }
  return io;
}

// ── Decoupled Event Emitter Helpers ─────────────────────────────────────────

/**
 * Emits a real-time event directly to a specific customer's private room.
 */
function emitToUser(userId, event, data) {
  if (io && userId) {
    io.to(`user:${userId}`).emit(event, data);
  }
}

/**
 * Emits a real-time event to a food partner's kitchen room (e.g. new order alert).
 */
function emitToPartner(partnerId, event, data) {
  if (io && partnerId) {
    io.to(`partner:${partnerId}`).emit(event, data);
  }
}

/**
 * Emits an event directly to an assigned delivery partner.
 */
function emitToRider(riderId, event, data) {
  if (io && riderId) {
    io.to(`delivery:${riderId}`).emit(event, data);
  }
}

/**
 * Broadcasts an event to all clients actively tracking an order.
 */
function emitToOrder(orderId, event, data) {
  if (io && orderId) {
    io.to(`order:${orderId}`).emit(event, data);
  }
}

/**
 * Broadcasts an event to all viewers watching a specific food reel.
 */
function emitToFoodReel(foodId, event, data) {
  if (io && foodId) {
    io.to(`food:${foodId}`).emit(event, data);
  }
}

/**
 * Broadcasts an event to all online delivery partners (e.g. open order for dispatch).
 */
function emitToOnlineRiders(event, data) {
  if (io) {
    io.to("riders:online").emit(event, data);
  }
}

/**
 * Broadcasts an event to the global administrative monitoring room.
 */
function emitToAdmin(event, data) {
  if (io) {
    io.to("admin:stream").emit(event, data);
  }
}

module.exports = {
  initSocket,
  setupRedisAdapter,
  getIO,
  getPubSubClients: () => ({ pubClient, subClient }),
  emitToUser,
  emitToPartner,
  emitToRider,
  emitToOrder,
  emitToFoodReel,
  emitToOnlineRiders,
  emitToAdmin,
};
