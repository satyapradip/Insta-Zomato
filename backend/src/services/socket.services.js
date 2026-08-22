// src/services/socket.services.js
//
// ─── WHY THIS FILE EXISTS ─────────────────────────────────────────────────────
// Centralizes the real-time WebSocket layer:
//   1. Authenticates socket connection handshakes using JWT
//   2. Dynamically organizes connected clients into targeted rooms
//   3. Exposes clean, decoupled helper functions for controllers to emit events
// ─────────────────────────────────────────────────────────────────────────────

const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const config = require("../config/index");
const logger = require("../config/logger");

let io = null;

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
function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: config.cors.allowedOrigins,
      credentials: true,
      methods: ["GET", "POST"],
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

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
  getIO,
  emitToUser,
  emitToPartner,
  emitToRider,
  emitToOrder,
  emitToFoodReel,
  emitToOnlineRiders,
  emitToAdmin,
};
