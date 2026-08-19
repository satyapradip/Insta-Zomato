const userModel = require("../models/user.models");
const foodPartnerModel = require("../models/foodpartner.models");
const deliveryPartnerModel = require("../models/deliverypartner.models");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const config = require("../config/index");

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Generate Access and Refresh Token pair for any user/partner/rider.
 */
function generateTokens(entity, role) {
  const payload = {
    id: entity._id,
    email: entity.email,
    role,
  };

  const accessToken = jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.accessExpiry || "15m",
  });

  const refreshToken = jwt.sign(payload, config.jwt.refreshSecret, {
    expiresIn: config.jwt.refreshExpiry || "7d",
  });

  return { accessToken, refreshToken };
}

/**
 * Set secure HTTP-only cookies on response.
 */
function setAuthCookies(res, accessToken, refreshToken) {
  const cookieOptions = {
    httpOnly: true,
    secure: config.isProd,
    sameSite: config.isProd ? "strict" : "lax",
  };

  // 15-minute access token (also set 'token' for backward compatibility)
  res.cookie("accessToken", accessToken, {
    ...cookieOptions,
    maxAge: 15 * 60 * 1000,
  });
  res.cookie("token", accessToken, {
    ...cookieOptions,
    maxAge: 15 * 60 * 1000,
  });

  // 7-day refresh token
  res.cookie("refreshToken", refreshToken, {
    ...cookieOptions,
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

/**
 * Clear all auth cookies on logout.
 */
function clearAuthCookies(res) {
  const cookieOptions = {
    httpOnly: true,
    secure: config.isProd,
    sameSite: config.isProd ? "strict" : "lax",
  };
  res.clearCookie("accessToken", cookieOptions);
  res.clearCookie("token", cookieOptions);
  res.clearCookie("refreshToken", cookieOptions);
}

// ── User / Customer Auth ─────────────────────────────────────────────────────

const registerUser = asyncHandler(async (req, res) => {
  const { fullName, email, password, phone } = req.body;

  const existingUser = await userModel.findOne({ email });
  if (existingUser) throw new ApiError(409, "Email is already registered");

  const hashedPassword = await bcrypt.hash(password, 10);
  const user = await userModel.create({
    fullName,
    email,
    password: hashedPassword,
    phone,
    role: "customer",
  });

  const { accessToken, refreshToken } = generateTokens(user, "customer");
  const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
  await userModel.findByIdAndUpdate(user._id, {
    refreshToken: hashedRefreshToken,
  });

  setAuthCookies(res, accessToken, refreshToken);

  res.status(201).json(
    new ApiResponse(
      201,
      {
        user: {
          id: user._id,
          email: user.email,
          fullName: user.fullName,
          role: user.role,
        },
        accessToken,
      },
      "User registered successfully",
    ),
  );
});

const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await userModel.findOne({ email }).select("+password");
  if (!user) throw new ApiError(401, "Invalid email or password");

  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) throw new ApiError(401, "Invalid email or password");

  if (user.isBanned)
    throw new ApiError(403, "Your account has been suspended by administration");

  const { accessToken, refreshToken } = generateTokens(user, user.role);
  const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
  await userModel.findByIdAndUpdate(user._id, {
    refreshToken: hashedRefreshToken,
  });

  setAuthCookies(res, accessToken, refreshToken);

  res.status(200).json(
    new ApiResponse(
      200,
      {
        user: {
          id: user._id,
          email: user.email,
          fullName: user.fullName,
          role: user.role,
          avatarUrl: user.avatarUrl,
        },
        accessToken,
      },
      "User logged in successfully",
    ),
  );
});

const logoutUser = asyncHandler(async (req, res) => {
  if (req.user?.id) {
    await userModel.findByIdAndUpdate(req.user.id, {
      $unset: { refreshToken: 1 },
    });
  }
  clearAuthCookies(res);
  res
    .status(200)
    .json(new ApiResponse(200, null, "User logged out successfully"));
});

// ── Food Partner Auth ────────────────────────────────────────────────────────

const registerFoodPartner = asyncHandler(async (req, res) => {
  const { name, email, password, phone, restaurantName, fssaiLicenseNumber } =
    req.body;

  const existing = await foodPartnerModel.findOne({ email });
  if (existing) throw new ApiError(409, "Email is already registered");

  const hashedPassword = await bcrypt.hash(password, 10);
  const foodPartner = await foodPartnerModel.create({
    name,
    email,
    password: hashedPassword,
    phone,
    restaurantName: restaurantName || name,
    fssaiLicenseNumber: fssaiLicenseNumber || "",
    role: "foodpartner",
  });

  const { accessToken, refreshToken } = generateTokens(
    foodPartner,
    "foodpartner",
  );
  const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
  await foodPartnerModel.findByIdAndUpdate(foodPartner._id, {
    refreshToken: hashedRefreshToken,
  });

  setAuthCookies(res, accessToken, refreshToken);

  res.status(201).json(
    new ApiResponse(
      201,
      {
        partner: {
          id: foodPartner._id,
          name: foodPartner.name,
          email: foodPartner.email,
          restaurantName: foodPartner.restaurantName,
          role: foodPartner.role,
        },
        accessToken,
      },
      "Food Partner registered successfully",
    ),
  );
});

const loginFoodPartner = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const foodPartner = await foodPartnerModel
    .findOne({ email })
    .select("+password");
  if (!foodPartner) throw new ApiError(401, "Invalid email or password");

  const isPasswordValid = await bcrypt.compare(password, foodPartner.password);
  if (!isPasswordValid) throw new ApiError(401, "Invalid email or password");

  const { accessToken, refreshToken } = generateTokens(
    foodPartner,
    "foodpartner",
  );
  const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
  await foodPartnerModel.findByIdAndUpdate(foodPartner._id, {
    refreshToken: hashedRefreshToken,
  });

  setAuthCookies(res, accessToken, refreshToken);

  res.status(200).json(
    new ApiResponse(
      200,
      {
        partner: {
          id: foodPartner._id,
          name: foodPartner.name,
          email: foodPartner.email,
          restaurantName: foodPartner.restaurantName,
          role: foodPartner.role,
          isOpen: foodPartner.isOpen,
          isApproved: foodPartner.isApproved,
        },
        accessToken,
      },
      "Food Partner logged in successfully",
    ),
  );
});

const logoutFoodPartner = asyncHandler(async (req, res) => {
  if (req.partner?.id || req.foodPartner?._id) {
    const partnerId = req.partner?.id || req.foodPartner?._id;
    await foodPartnerModel.findByIdAndUpdate(partnerId, {
      $unset: { refreshToken: 1 },
    });
  }
  clearAuthCookies(res);
  res
    .status(200)
    .json(new ApiResponse(200, null, "Food partner logged out successfully"));
});

// ── Delivery Partner Auth ────────────────────────────────────────────────────

const registerDeliveryPartner = asyncHandler(async (req, res) => {
  const {
    name,
    email,
    password,
    phone,
    vehicleType,
    vehicleNumber,
    drivingLicenseNumber,
  } = req.body;

  const existing = await deliveryPartnerModel.findOne({ email });
  if (existing) throw new ApiError(409, "Email is already registered");

  const hashedPassword = await bcrypt.hash(password, 10);
  const deliveryPartner = await deliveryPartnerModel.create({
    name,
    email,
    password: hashedPassword,
    phone,
    vehicleType: vehicleType || "bike",
    vehicleNumber: vehicleNumber || "",
    drivingLicenseNumber: drivingLicenseNumber || "",
    role: "deliverypartner",
  });

  const { accessToken, refreshToken } = generateTokens(
    deliveryPartner,
    "deliverypartner",
  );
  const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
  await deliveryPartnerModel.findByIdAndUpdate(deliveryPartner._id, {
    refreshToken: hashedRefreshToken,
  });

  setAuthCookies(res, accessToken, refreshToken);

  res.status(201).json(
    new ApiResponse(
      201,
      {
        deliveryPartner: {
          id: deliveryPartner._id,
          name: deliveryPartner.name,
          email: deliveryPartner.email,
          vehicleType: deliveryPartner.vehicleType,
          role: deliveryPartner.role,
        },
        accessToken,
      },
      "Delivery partner registered successfully",
    ),
  );
});

const loginDeliveryPartner = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const deliveryPartner = await deliveryPartnerModel
    .findOne({ email })
    .select("+password");
  if (!deliveryPartner) throw new ApiError(401, "Invalid email or password");

  const isPasswordValid = await bcrypt.compare(
    password,
    deliveryPartner.password,
  );
  if (!isPasswordValid) throw new ApiError(401, "Invalid email or password");

  const { accessToken, refreshToken } = generateTokens(
    deliveryPartner,
    "deliverypartner",
  );
  const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
  await deliveryPartnerModel.findByIdAndUpdate(deliveryPartner._id, {
    refreshToken: hashedRefreshToken,
  });

  setAuthCookies(res, accessToken, refreshToken);

  res.status(200).json(
    new ApiResponse(
      200,
      {
        deliveryPartner: {
          id: deliveryPartner._id,
          name: deliveryPartner.name,
          email: deliveryPartner.email,
          vehicleType: deliveryPartner.vehicleType,
          isOnline: deliveryPartner.isOnline,
          isApproved: deliveryPartner.isApproved,
          role: deliveryPartner.role,
        },
        accessToken,
      },
      "Delivery partner logged in successfully",
    ),
  );
});

const logoutDeliveryPartner = asyncHandler(async (req, res) => {
  if (req.rider?.id || req.deliveryPartner?._id) {
    const riderId = req.rider?.id || req.deliveryPartner?._id;
    await deliveryPartnerModel.findByIdAndUpdate(riderId, {
      $unset: { refreshToken: 1 },
    });
  }
  clearAuthCookies(res);
  res
    .status(200)
    .json(new ApiResponse(200, null, "Delivery partner logged out successfully"));
});

// ── Shared Token Refresh & Profile ───────────────────────────────────────────

/**
 * Validates Refresh Token, checks DB hash, and issues new Access + Refresh tokens.
 */
const refreshTokens = asyncHandler(async (req, res) => {
  const incomingRefreshToken =
    req.cookies.refreshToken || req.body.refreshToken;
  if (!incomingRefreshToken) {
    throw new ApiError(401, "Refresh token is required");
  }

  let decoded;
  try {
    decoded = jwt.verify(incomingRefreshToken, config.jwt.refreshSecret);
  } catch (err) {
    clearAuthCookies(res);
    throw new ApiError(401, "Invalid or expired refresh token. Please login again.");
  }

  // Find entity based on decoded role
  let entity;
  let Model;
  if (decoded.role === "foodpartner") {
    Model = foodPartnerModel;
  } else if (decoded.role === "deliverypartner") {
    Model = deliveryPartnerModel;
  } else {
    Model = userModel;
  }

  entity = await Model.findById(decoded.id).select("+refreshToken");
  if (!entity || !entity.refreshToken) {
    clearAuthCookies(res);
    throw new ApiError(401, "Session expired or revoked. Please login again.");
  }

  // Compare hashed refresh token
  const isTokenMatch = await bcrypt.compare(
    incomingRefreshToken,
    entity.refreshToken,
  );
  if (!isTokenMatch) {
    // Security alert: Possible token reuse attack! Revoke all tokens
    await Model.findByIdAndUpdate(entity._id, { $unset: { refreshToken: 1 } });
    clearAuthCookies(res);
    throw new ApiError(401, "Invalid refresh token. Security revocation triggered.");
  }

  // Generate new pair
  const { accessToken, refreshToken: newRefreshToken } = generateTokens(
    entity,
    decoded.role,
  );
  const hashedRefreshToken = await bcrypt.hash(newRefreshToken, 10);
  await Model.findByIdAndUpdate(entity._id, {
    refreshToken: hashedRefreshToken,
  });

  setAuthCookies(res, accessToken, newRefreshToken);

  res.status(200).json(
    new ApiResponse(
      200,
      {
        accessToken,
        role: decoded.role,
        id: entity._id,
      },
      "Tokens refreshed successfully",
    ),
  );
});

/**
 * Get profile of currently logged in user/partner/rider.
 */
const getCurrentProfile = asyncHandler(async (req, res) => {
  const profile = req.customer || req.foodPartner || req.deliveryPartner || req.user;
  if (!profile) throw new ApiError(401, "User not authenticated");

  res
    .status(200)
    .json(new ApiResponse(200, profile, "Profile fetched successfully"));
});

module.exports = {
  registerUser,
  loginUser,
  logoutUser,
  registerFoodPartner,
  loginFoodPartner,
  logoutFoodPartner,
  registerDeliveryPartner,
  loginDeliveryPartner,
  logoutDeliveryPartner,
  refreshTokens,
  getCurrentProfile,
};
