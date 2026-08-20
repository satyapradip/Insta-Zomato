const crypto = require("crypto");
const bcrypt = require("bcrypt");
const ApiError = require("../utils/ApiError");

/**
 * State Machine Transition Rules Matrix
 * Defines allowed destination states and permissible actor roles for each state.
 */
const STATE_TRANSITIONS = {
  PENDING: {
    allowedNext: ["CONFIRMED", "CANCELLED"],
    roleMap: {
      CONFIRMED: ["foodpartner", "admin"],
      CANCELLED: ["customer", "foodpartner", "admin"],
    },
  },
  CONFIRMED: {
    allowedNext: ["PREPARING", "CANCELLED"],
    roleMap: {
      PREPARING: ["foodpartner", "admin"],
      CANCELLED: ["customer", "foodpartner", "admin"],
    },
  },
  PREPARING: {
    allowedNext: ["READY_FOR_PICKUP", "CANCELLED"],
    roleMap: {
      READY_FOR_PICKUP: ["foodpartner", "admin"],
      CANCELLED: ["foodpartner", "admin"], // Customer cannot cancel once cooking starts
    },
  },
  READY_FOR_PICKUP: {
    allowedNext: ["PICKED_UP", "CANCELLED"],
    roleMap: {
      PICKED_UP: ["deliverypartner", "admin"],
      CANCELLED: ["foodpartner", "admin"],
    },
  },
  PICKED_UP: {
    allowedNext: ["OUT_FOR_DELIVERY"],
    roleMap: {
      OUT_FOR_DELIVERY: ["deliverypartner", "admin"],
    },
  },
  OUT_FOR_DELIVERY: {
    allowedNext: ["DELIVERED", "FAILED"],
    roleMap: {
      DELIVERED: ["deliverypartner", "admin"], // Requires OTP verification
      FAILED: ["deliverypartner", "admin"],
    },
  },
  DELIVERED: {
    allowedNext: [],
    roleMap: {},
  },
  CANCELLED: {
    allowedNext: [],
    roleMap: {},
  },
  FAILED: {
    allowedNext: [],
    roleMap: {},
  },
};

/**
 * Validates whether a state transition is legal for the given actor role.
 * Throws an ApiError(400) if the transition is prohibited.
 */
function validateTransition(currentStatus, targetStatus, actorRole) {
  const stateConfig = STATE_TRANSITIONS[currentStatus];

  if (!stateConfig) {
    throw new ApiError(400, `Unknown current order status: ${currentStatus}`);
  }

  // Terminal state checks
  if (["DELIVERED", "CANCELLED", "FAILED"].includes(currentStatus)) {
    throw new ApiError(
      400,
      `Cannot transition order from terminal status '${currentStatus}' to '${targetStatus}'`,
    );
  }

  // Allowed next state check
  if (!stateConfig.allowedNext.includes(targetStatus)) {
    throw new ApiError(
      400,
      `Invalid state transition: Cannot change order status from '${currentStatus}' to '${targetStatus}'. Allowed next states: [${stateConfig.allowedNext.join(", ")}]`,
    );
  }

  // Role authorization check
  const allowedRoles = stateConfig.roleMap[targetStatus] || [];
  if (!allowedRoles.includes(actorRole) && actorRole !== "admin") {
    throw new ApiError(
      403,
      `Actor role '${actorRole}' is not authorized to transition order from '${currentStatus}' to '${targetStatus}'. Required roles: [${allowedRoles.join(", ")}]`,
    );
  }

  return true;
}

/**
 * Generates a human-friendly unique order number (e.g. IZ-2026-A89B4C)
 */
function generateOrderNumber() {
  const year = new Date().getFullYear();
  const randomSuffix = crypto.randomBytes(3).toString("hex").toUpperCase();
  return `IZ-${year}-${randomSuffix}`;
}

/**
 * Cryptographically generates a 4-digit numeric Delivery OTP (1000 - 9999)
 */
function generateDeliveryOtp() {
  const otpNumber = crypto.randomInt(1000, 10000);
  return otpNumber.toString();
}

/**
 * Hashes plain delivery OTP with bcrypt for secure database storage
 */
async function hashDeliveryOtp(plainOtp) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(plainOtp.toString(), salt);
}

/**
 * Helper to build a timeline entry
 */
function createTimelineEntry(status, note = "", actorRole = "system", actorId = null) {
  return {
    status,
    timestamp: new Date(),
    note,
    actorRole,
    actorId,
  };
}

module.exports = {
  STATE_TRANSITIONS,
  validateTransition,
  generateOrderNumber,
  generateDeliveryOtp,
  hashDeliveryOtp,
  createTimelineEntry,
};
