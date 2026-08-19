const userModel = require("../models/user.models");
const foodPartnerModel = require("../models/foodpartner.models");
const deliveryPartnerModel = require("../models/deliverypartner.models");
const jwt = require("jsonwebtoken");
const config = require("../config/index");
const ApiError = require("../utils/ApiError");

/**
 * Universal Authentication Middleware
 * Extracts JWT from HTTP-only cookie or Authorization Bearer header.
 */
async function requireAuth(req, res, next) {
  let token = req.cookies.accessToken || req.cookies.token;
  if (!token && req.headers.authorization?.startsWith("Bearer ")) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    return next(new ApiError(401, "Authentication token required"));
  }

  try {
    const decoded = jwt.verify(token, config.jwt.secret);
    req.user = decoded; // { id, email, role }

    // Hydrate corresponding entity based on role
    if (decoded.role === "foodpartner") {
      const partner = await foodPartnerModel.findById(decoded.id);
      if (!partner) return next(new ApiError(401, "Food Partner not found or session invalid"));
      req.foodPartner = partner;
      req.partner = partner;
    } else if (decoded.role === "deliverypartner") {
      const rider = await deliveryPartnerModel.findById(decoded.id);
      if (!rider) return next(new ApiError(401, "Delivery Partner not found or session invalid"));
      req.deliveryPartner = rider;
      req.rider = rider;
    } else {
      const customer = await userModel.findById(decoded.id);
      if (!customer) return next(new ApiError(401, "User not found or session invalid"));
      if (customer.isBanned) return next(new ApiError(403, "User account is suspended"));
      req.customer = customer;
    }

    next();
  } catch (error) {
    if (error.name === "JsonWebTokenError" || error.name === "TokenExpiredError") {
      return next(new ApiError(401, "Token is invalid or expired. Please refresh."));
    }
    next(error);
  }
}

/**
 * Role Guards
 */
function requireCustomer(req, res, next) {
  if (!req.user || req.user.role !== "customer") {
    return next(new ApiError(403, "Access forbidden: Customer account required"));
  }
  next();
}

function requireFoodPartner(req, res, next) {
  if (!req.user || req.user.role !== "foodpartner") {
    return next(new ApiError(403, "Access forbidden: Food Partner account required"));
  }
  next();
}

function requireDeliveryPartner(req, res, next) {
  if (!req.user || req.user.role !== "deliverypartner") {
    return next(new ApiError(403, "Access forbidden: Delivery Partner account required"));
  }
  next();
}

function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== "admin") {
    return next(new ApiError(403, "Access forbidden: Administrator access required"));
  }
  next();
}

// ── Backward Compatible Middlewares ──────────────────────────────────────────
const authFoodPartnerMiddleware = [requireAuth, requireFoodPartner];
const authUserMiddleware = [requireAuth, requireCustomer];

module.exports = {
  requireAuth,
  requireCustomer,
  requireFoodPartner,
  requireDeliveryPartner,
  requireAdmin,
  authFoodPartnerMiddleware,
  authUserMiddleware,
};
