const userModel = require("../models/user.models");
const foodPartnerModel = require("../models/foodpartner.models");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");

// ── User: register ────────────────────────────────────────────────────────────
const registerUser = asyncHandler(async (req, res) => {
  const { fullName, email, password } = req.body;

  const existingUser = await userModel.findOne({ email });
  if (existingUser) throw new ApiError(409, "Email is already registered");

  const hashedPassword = await bcrypt.hash(password, 10);
  const user = await userModel.create({
    fullName,
    email,
    password: hashedPassword,
  });

  const token = jwt.sign(
    { id: user._id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: "1h" },
  );

  res.cookie("token", token, { httpOnly: true, secure: false });

  res
    .status(201)
    .json(
      new ApiResponse(
        201,
        { id: user._id, email: user.email, fullName: user.fullName },
        "User registered successfully",
      ),
    );
});

// ── User: login ───────────────────────────────────────────────────────────────
const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await userModel.findOne({ email });
  if (!user) throw new ApiError(401, "Invalid email or password");

  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) throw new ApiError(401, "Invalid email or password");

  const token = jwt.sign(
    { id: user._id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: "1h" },
  );

  res.cookie("token", token, { httpOnly: true, secure: false });

  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { id: user._id, email: user.email, fullName: user.fullName },
        "User logged in successfully",
      ),
    );
});

// ── User: logout ──────────────────────────────────────────────────────────────
const logoutUser = asyncHandler(async (req, res) => {
  res.clearCookie("token");
  res
    .status(200)
    .json(new ApiResponse(200, null, "User logged out successfully"));
});

// ── Food Partner: register ────────────────────────────────────────────────────
const registerFoodPartner = asyncHandler(async (req, res) => {
  const { name, email, password, phone } = req.body;

  const existing = await foodPartnerModel.findOne({ email });
  if (existing) throw new ApiError(409, "Email is already registered");

  const hashedPassword = await bcrypt.hash(password, 10);
  const foodPartner = await foodPartnerModel.create({
    name,
    email,
    password: hashedPassword,
    phone,
  });

  const token = jwt.sign(
    { id: foodPartner._id, email: foodPartner.email },
    process.env.JWT_SECRET,
    { expiresIn: "1h" },
  );

  res.cookie("token", token, { httpOnly: true, secure: false });

  res
    .status(201)
    .json(
      new ApiResponse(
        201,
        {
          id: foodPartner._id,
          email: foodPartner.email,
          name: foodPartner.name,
          phone: foodPartner.phone,
        },
        "Food partner registered successfully",
      ),
    );
});

// ── Food Partner: login ───────────────────────────────────────────────────────
const loginFoodPartner = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const foodPartner = await foodPartnerModel.findOne({ email });
  if (!foodPartner) throw new ApiError(401, "Invalid email or password");

  const isPasswordValid = await bcrypt.compare(password, foodPartner.password);
  if (!isPasswordValid) throw new ApiError(401, "Invalid email or password");

  const token = jwt.sign(
    { id: foodPartner._id, email: foodPartner.email },
    process.env.JWT_SECRET,
    { expiresIn: "1h" },
  );

  res.cookie("token", token, { httpOnly: true, secure: false });

  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        {
          id: foodPartner._id,
          email: foodPartner.email,
          name: foodPartner.name,
          phone: foodPartner.phone,
        },
        "Food partner logged in successfully",
      ),
    );
});

// ── Food Partner: logout ──────────────────────────────────────────────────────
const logoutFoodPartner = asyncHandler(async (req, res) => {
  res.clearCookie("token");
  res
    .status(200)
    .json(new ApiResponse(200, null, "Food partner logged out successfully"));
});

module.exports = {
  registerUser,
  loginUser,
  logoutUser,
  registerFoodPartner,
  loginFoodPartner,
  logoutFoodPartner,
};
