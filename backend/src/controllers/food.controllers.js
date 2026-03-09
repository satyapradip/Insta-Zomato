const foodModel = require("../models/food.models");
const storageService = require("../services/storage.services");
const { v4: uuidv4 } = require("uuid");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");

// ── Create food item ──────────────────────────────────────────────────────────
// Protected — food partners only. Uploads video to ImageKit and saves food item.
const createFoodItem = asyncHandler(async (req, res) => {
  if (!req.file) throw new ApiError(400, "Video file is required");

  const { name, description, price } = req.body;
  const foodPartnerId = req.foodPartner._id; // set by authFoodPartnerMiddleware

  const uniqueFileName = `${uuidv4()}-${req.file.originalname}`;
  const fileUploadResponse = await storageService.uploadFile(
    req.file.buffer,
    uniqueFileName,
  );

  const savedFoodItem = await foodModel.create({
    name,
    description,
    price,
    video: fileUploadResponse.secure_url,
    foodPartner: foodPartnerId,
  });

  res
    .status(201)
    .json(
      new ApiResponse(201, savedFoodItem, "Food item created successfully"),
    );
});

// ── Get all food items ────────────────────────────────────────────────────────
// Public route — lists all food items
const getAllFoodItems = asyncHandler(async (req, res) => {
  const foodItems = await foodModel.find().populate("foodPartner", "name");
  res
    .status(200)
    .json(new ApiResponse(200, foodItems, "Food items fetched successfully"));
});

module.exports = {
  createFoodItem,
  getAllFoodItems,
};
