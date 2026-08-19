const foodModel = require("../models/food.models");
const storageService = require("../services/storage.services");
const { v4: uuidv4 } = require("uuid");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");

// ── Create Food Item & Video Reel ────────────────────────────────────────────
// Protected — Food partners only.
const createFoodItem = asyncHandler(async (req, res) => {
  if (!req.file) throw new ApiError(400, "Video reel file is required");

  const {
    name,
    description,
    price,
    discountedPrice,
    category,
    tags,
    isVeg,
    spiceLevel,
    preparationTime,
    calories,
    variants,
    addOns,
  } = req.body;

  const foodPartnerId = req.foodPartner?._id || req.user?.id;

  // Safe parsing for JSON strings passed via multipart/form-data
  let parsedVariants = [];
  if (variants) {
    parsedVariants = typeof variants === "string" ? JSON.parse(variants) : variants;
  }

  let parsedAddOns = [];
  if (addOns) {
    parsedAddOns = typeof addOns === "string" ? JSON.parse(addOns) : addOns;
  }

  let parsedTags = [];
  if (tags) {
    parsedTags =
      typeof tags === "string"
        ? tags.split(",").map((t) => t.trim().toLowerCase())
        : tags;
  }

  const uniqueFileName = `${uuidv4()}-${req.file.originalname.replace(/\s+/g, "_")}`;
  const uploadResult = await storageService.uploadFile(
    req.file.buffer,
    uniqueFileName,
  );

  const savedFoodItem = await foodModel.create({
    name,
    description: description || "",
    price: Number(price),
    discountedPrice: discountedPrice ? Number(discountedPrice) : undefined,
    category: category || "General",
    tags: parsedTags,
    video: uploadResult.secure_url,
    thumbnailUrl: uploadResult.thumbnailUrl,
    cloudinaryPublicId: uploadResult.public_id,
    isVeg: isVeg !== undefined ? Boolean(isVeg === "true" || isVeg === true) : true,
    spiceLevel: spiceLevel || "medium",
    preparationTime: preparationTime ? Number(preparationTime) : 20,
    calories: calories ? Number(calories) : 0,
    variants: parsedVariants,
    addOns: parsedAddOns,
    foodPartner: foodPartnerId,
  });

  res
    .status(201)
    .json(
      new ApiResponse(201, savedFoodItem, "Food reel created successfully"),
    );
});

// ── Get Single Food Item ─────────────────────────────────────────────────────
const getFoodItemById = asyncHandler(async (req, res) => {
  const foodItem = await foodModel
    .findById(req.params.id)
    .populate("foodPartner", "name restaurantName logo location avgRating isOpen");

  if (!foodItem) throw new ApiError(404, "Food item not found");

  res
    .status(200)
    .json(new ApiResponse(200, foodItem, "Food item fetched successfully"));
});

// ── Get All Food Items ───────────────────────────────────────────────────────
const getAllFoodItems = asyncHandler(async (req, res) => {
  const { category, isVeg, partnerId, search } = req.query;
  const filter = { isAvailable: true };

  if (category) filter.category = category;
  if (isVeg !== undefined) filter.isVeg = isVeg === "true";
  if (partnerId) filter.foodPartner = partnerId;
  if (search) {
    filter.$text = { $search: search };
  }

  const foodItems = await foodModel
    .find(filter)
    .populate("foodPartner", "name restaurantName logo avgRating isOpen")
    .sort({ createdAt: -1 })
    .limit(50);

  res
    .status(200)
    .json(new ApiResponse(200, foodItems, "Food items fetched successfully"));
});

// ── Update Food Item ─────────────────────────────────────────────────────────
// Protected — Only the owner restaurant can update
const updateFoodItem = asyncHandler(async (req, res) => {
  const foodItem = await foodModel.findById(req.params.id);
  if (!foodItem) throw new ApiError(404, "Food item not found");

  const partnerId = req.foodPartner?._id || req.user?.id;
  if (foodItem.foodPartner.toString() !== partnerId.toString()) {
    throw new ApiError(403, "You do not have permission to edit this food item");
  }

  const updatedItem = await foodModel.findByIdAndUpdate(
    req.params.id,
    { $set: req.body },
    { new: true, runValidators: true },
  );

  res
    .status(200)
    .json(new ApiResponse(200, updatedItem, "Food item updated successfully"));
});

// ── Toggle Availability ──────────────────────────────────────────────────────
const toggleAvailability = asyncHandler(async (req, res) => {
  const foodItem = await foodModel.findById(req.params.id);
  if (!foodItem) throw new ApiError(404, "Food item not found");

  const partnerId = req.foodPartner?._id || req.user?.id;
  if (foodItem.foodPartner.toString() !== partnerId.toString()) {
    throw new ApiError(403, "Permission denied");
  }

  foodItem.isAvailable = !foodItem.isAvailable;
  await foodItem.save();

  res.status(200).json(
    new ApiResponse(
      200,
      { isAvailable: foodItem.isAvailable },
      `Dish marked as ${foodItem.isAvailable ? "Available" : "Unavailable"}`,
    ),
  );
});

// ── Delete Food Item ─────────────────────────────────────────────────────────
const deleteFoodItem = asyncHandler(async (req, res) => {
  const foodItem = await foodModel.findById(req.params.id);
  if (!foodItem) throw new ApiError(404, "Food item not found");

  const partnerId = req.foodPartner?._id || req.user?.id;
  if (foodItem.foodPartner.toString() !== partnerId.toString()) {
    throw new ApiError(403, "You do not have permission to delete this food item");
  }

  // Delete media from Cloudinary if public ID exists
  if (foodItem.cloudinaryPublicId) {
    try {
      await storageService.deleteFile(foodItem.cloudinaryPublicId, "video");
    } catch (e) {
      // Continue even if remote delete fails
    }
  }

  await foodModel.findByIdAndDelete(req.params.id);

  res
    .status(200)
    .json(new ApiResponse(200, null, "Food item deleted successfully"));
});

module.exports = {
  createFoodItem,
  getFoodItemById,
  getAllFoodItems,
  updateFoodItem,
  toggleAvailability,
  deleteFoodItem,
};
