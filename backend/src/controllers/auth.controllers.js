const { prisma } = require("../db/prisma");
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
    id: entity.id,
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

  const existingUser = await prisma.user.findUnique({
    where: { email },
  });
  if (existingUser) throw new ApiError(409, "Email is already registered");

  const hashedPassword = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: {
      fullName,
      email,
      password: hashedPassword,
      phone,
      role: "customer",
    },
  });

  const { accessToken, refreshToken } = generateTokens(user, "customer");
  const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
  await prisma.user.update({
    where: { id: user.id },
    data: { refreshToken: hashedRefreshToken },
  });

  setAuthCookies(res, accessToken, refreshToken);

  res.status(201).json(
    new ApiResponse(
      201,
      {
        user: {
          id: user.id,
          _id: user.id,
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

  const user = await prisma.user.findUnique({
    where: { email },
  });
  if (!user) throw new ApiError(401, "Invalid email or password");

  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) throw new ApiError(401, "Invalid email or password");

  if (user.isBanned)
    throw new ApiError(403, "Your account has been suspended by administration");

  const { accessToken, refreshToken } = generateTokens(user, user.role);
  const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
  await prisma.user.update({
    where: { id: user.id },
    data: { refreshToken: hashedRefreshToken },
  });

  setAuthCookies(res, accessToken, refreshToken);

  res.status(200).json(
    new ApiResponse(
      200,
      {
        user: {
          id: user.id,
          _id: user.id,
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
    await prisma.user.update({
      where: { id: req.user.id },
      data: { refreshToken: null },
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

  const existing = await prisma.foodPartner.findUnique({
    where: { email },
  });
  if (existing) throw new ApiError(409, "Email is already registered");

  const hashedPassword = await bcrypt.hash(password, 10);
  const foodPartner = await prisma.foodPartner.create({
    data: {
      name,
      email,
      password: hashedPassword,
      phone,
      restaurantName: restaurantName || name,
      fssaiLicenseNumber: fssaiLicenseNumber || "",
    },
  });

  const { accessToken, refreshToken } = generateTokens(
    foodPartner,
    "foodpartner",
  );
  const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
  await prisma.foodPartner.update({
    where: { id: foodPartner.id },
    data: { refreshToken: hashedRefreshToken },
  });

  setAuthCookies(res, accessToken, refreshToken);

  res.status(201).json(
    new ApiResponse(
      201,
      {
        partner: {
          id: foodPartner.id,
          _id: foodPartner.id,
          name: foodPartner.name,
          email: foodPartner.email,
          restaurantName: foodPartner.restaurantName,
          role: "foodpartner",
        },
        accessToken,
      },
      "Food Partner registered successfully",
    ),
  );
});

const loginFoodPartner = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const foodPartner = await prisma.foodPartner.findUnique({
    where: { email },
  });
  if (!foodPartner) throw new ApiError(401, "Invalid email or password");

  const isPasswordValid = await bcrypt.compare(password, foodPartner.password);
  if (!isPasswordValid) throw new ApiError(401, "Invalid email or password");

  const { accessToken, refreshToken } = generateTokens(
    foodPartner,
    "foodpartner",
  );
  const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
  await prisma.foodPartner.update({
    where: { id: foodPartner.id },
    data: { refreshToken: hashedRefreshToken },
  });

  setAuthCookies(res, accessToken, refreshToken);

  res.status(200).json(
    new ApiResponse(
      200,
      {
        partner: {
          id: foodPartner.id,
          _id: foodPartner.id,
          name: foodPartner.name,
          email: foodPartner.email,
          restaurantName: foodPartner.restaurantName,
          role: "foodpartner",
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
  const partnerId = req.partner?.id || req.foodPartner?.id || req.user?.id;
  if (partnerId) {
    await prisma.foodPartner.update({
      where: { id: partnerId },
      data: { refreshToken: null },
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

  const existing = await prisma.deliveryPartner.findUnique({
    where: { email },
  });
  if (existing) throw new ApiError(409, "Email is already registered");

  const hashedPassword = await bcrypt.hash(password, 10);
  const deliveryPartner = await prisma.deliveryPartner.create({
    data: {
      name,
      email,
      password: hashedPassword,
      phone,
      vehicleType: vehicleType || "bike",
      vehicleNumber: vehicleNumber || "",
      drivingLicenseNumber: drivingLicenseNumber || "",
    },
  });

  const { accessToken, refreshToken } = generateTokens(
    deliveryPartner,
    "deliverypartner",
  );
  const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
  await prisma.deliveryPartner.update({
    where: { id: deliveryPartner.id },
    data: { refreshToken: hashedRefreshToken },
  });

  setAuthCookies(res, accessToken, refreshToken);

  res.status(201).json(
    new ApiResponse(
      201,
      {
        deliveryPartner: {
          id: deliveryPartner.id,
          _id: deliveryPartner.id,
          name: deliveryPartner.name,
          email: deliveryPartner.email,
          vehicleType: deliveryPartner.vehicleType,
          role: "deliverypartner",
        },
        accessToken,
      },
      "Delivery partner registered successfully",
    ),
  );
});

const loginDeliveryPartner = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const deliveryPartner = await prisma.deliveryPartner.findUnique({
    where: { email },
  });
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
  await prisma.deliveryPartner.update({
    where: { id: deliveryPartner.id },
    data: { refreshToken: hashedRefreshToken },
  });

  setAuthCookies(res, accessToken, refreshToken);

  res.status(200).json(
    new ApiResponse(
      200,
      {
        deliveryPartner: {
          id: deliveryPartner.id,
          _id: deliveryPartner.id,
          name: deliveryPartner.name,
          email: deliveryPartner.email,
          vehicleType: deliveryPartner.vehicleType,
          isOnline: deliveryPartner.isOnline,
          isApproved: deliveryPartner.isApproved,
          role: "deliverypartner",
        },
        accessToken,
      },
      "Delivery partner logged in successfully",
    ),
  );
});

const logoutDeliveryPartner = asyncHandler(async (req, res) => {
  const riderId = req.rider?.id || req.deliveryPartner?.id || req.user?.id;
  if (riderId) {
    await prisma.deliveryPartner.update({
      where: { id: riderId },
      data: { refreshToken: null },
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
  let modelName;
  if (decoded.role === "foodpartner") {
    modelName = "foodPartner";
  } else if (decoded.role === "deliverypartner") {
    modelName = "deliveryPartner";
  } else {
    modelName = "user";
  }

  entity = await prisma[modelName].findUnique({
    where: { id: decoded.id },
  });

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
    await prisma[modelName].update({
      where: { id: entity.id },
      data: { refreshToken: null },
    });
    clearAuthCookies(res);
    throw new ApiError(401, "Invalid refresh token. Security revocation triggered.");
  }

  // Generate new pair
  const { accessToken, refreshToken: newRefreshToken } = generateTokens(
    entity,
    decoded.role,
  );
  const hashedRefreshToken = await bcrypt.hash(newRefreshToken, 10);
  await prisma[modelName].update({
    where: { id: entity.id },
    data: { refreshToken: hashedRefreshToken },
  });

  setAuthCookies(res, accessToken, newRefreshToken);

  res.status(200).json(
    new ApiResponse(
      200,
      {
        accessToken,
        role: decoded.role,
        id: entity.id,
        _id: entity.id,
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
