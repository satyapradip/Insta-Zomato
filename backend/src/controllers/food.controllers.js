const { prisma } = require("../db/prisma");
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

  const foodPartnerId = req.foodPartner?.id || req.user?.id;

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

  const savedFoodItem = await prisma.food.create({
    data: {
      name,
      description: description || "",
      price: Number(price),
      discountedPrice: discountedPrice ? Number(discountedPrice) : null,
      category: category || "General",
      tags: parsedTags,
      video: uploadResult.secure_url,
      thumbnailUrl: uploadResult.thumbnailUrl || "",
      cloudinaryPublicId: uploadResult.public_id || "",
      isVeg: isVeg !== undefined ? Boolean(isVeg === "true" || isVeg === true) : true,
      spiceLevel: spiceLevel ? spiceLevel.toLowerCase() : "medium",
      preparationTime: preparationTime ? Number(preparationTime) : 20,
      calories: calories ? Number(calories) : 0,
      foodPartnerId,
      variants: {
        create: parsedVariants.map((v) => ({
          name: v.name,
          price: Number(v.price),
        })),
      },
      addOns: {
        create: parsedAddOns.map((a) => ({
          name: a.name,
          price: Number(a.price),
        })),
      },
    },
    include: {
      variants: true,
      addOns: true,
      foodPartner: {
        select: {
          id: true,
          name: true,
          restaurantName: true,
          logo: true,
          avgRating: true,
          isOpen: true,
        },
      },
    },
  });

  const responseObj = {
    ...savedFoodItem,
    _id: savedFoodItem.id,
    foodPartner: savedFoodItem.foodPartner
      ? { ...savedFoodItem.foodPartner, _id: savedFoodItem.foodPartner.id }
      : null,
  };

  res
    .status(201)
    .json(new ApiResponse(201, responseObj, "Food reel created successfully"));
});

// ── Get Single Food Item ─────────────────────────────────────────────────────
const getFoodItemById = asyncHandler(async (req, res) => {
  const foodItem = await prisma.food.findUnique({
    where: { id: req.params.id },
    include: {
      variants: true,
      addOns: true,
      foodPartner: {
        select: {
          id: true,
          name: true,
          restaurantName: true,
          logo: true,
          latitude: true,
          longitude: true,
          avgRating: true,
          isOpen: true,
        },
      },
    },
  });

  if (!foodItem) throw new ApiError(404, "Food item not found");

  const responseObj = {
    ...foodItem,
    _id: foodItem.id,
    foodPartner: foodItem.foodPartner
      ? { ...foodItem.foodPartner, _id: foodItem.foodPartner.id }
      : null,
  };

  res
    .status(200)
    .json(new ApiResponse(200, responseObj, "Food item fetched successfully"));
});

// ── Get All Food Items ───────────────────────────────────────────────────────
const getAllFoodItems = asyncHandler(async (req, res) => {
  const { category, isVeg, partnerId, search } = req.query;
  const where = { isAvailable: true };

  if (category) where.category = category;
  if (isVeg !== undefined) where.isVeg = isVeg === "true";
  if (partnerId) where.foodPartnerId = partnerId;
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
    ];
  }

  const foodItems = await prisma.food.findMany({
    where,
    include: {
      variants: true,
      addOns: true,
      foodPartner: {
        select: {
          id: true,
          name: true,
          restaurantName: true,
          logo: true,
          avgRating: true,
          isOpen: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const formattedItems = foodItems.map((item) => ({
    ...item,
    _id: item.id,
    foodPartner: item.foodPartner
      ? { ...item.foodPartner, _id: item.foodPartner.id }
      : null,
  }));

  res
    .status(200)
    .json(new ApiResponse(200, formattedItems, "Food items fetched successfully"));
});

// ── Update Food Item ─────────────────────────────────────────────────────────
// Protected — Only the owner restaurant can update
const updateFoodItem = asyncHandler(async (req, res) => {
  const foodItem = await prisma.food.findUnique({
    where: { id: req.params.id },
  });
  if (!foodItem) throw new ApiError(404, "Food item not found");

  const partnerId = req.foodPartner?.id || req.user?.id;
  if (foodItem.foodPartnerId !== partnerId) {
    throw new ApiError(403, "You do not have permission to edit this food item");
  }

  const updatedItem = await prisma.food.update({
    where: { id: req.params.id },
    data: req.body,
    include: { variants: true, addOns: true },
  });

  res
    .status(200)
    .json(new ApiResponse(200, { ...updatedItem, _id: updatedItem.id }, "Food item updated successfully"));
});

// ── Toggle Availability ──────────────────────────────────────────────────────
const toggleAvailability = asyncHandler(async (req, res) => {
  const foodItem = await prisma.food.findUnique({
    where: { id: req.params.id },
  });
  if (!foodItem) throw new ApiError(404, "Food item not found");

  const partnerId = req.foodPartner?.id || req.user?.id;
  if (foodItem.foodPartnerId !== partnerId) {
    throw new ApiError(403, "Permission denied");
  }

  const updated = await prisma.food.update({
    where: { id: req.params.id },
    data: { isAvailable: !foodItem.isAvailable },
  });

  res.status(200).json(
    new ApiResponse(
      200,
      { isAvailable: updated.isAvailable },
      `Dish marked as ${updated.isAvailable ? "Available" : "Unavailable"}`,
    ),
  );
});

// ── Delete Food Item ─────────────────────────────────────────────────────────
const deleteFoodItem = asyncHandler(async (req, res) => {
  const foodItem = await prisma.food.findUnique({
    where: { id: req.params.id },
  });
  if (!foodItem) throw new ApiError(404, "Food item not found");

  const partnerId = req.foodPartner?.id || req.user?.id;
  if (foodItem.foodPartnerId !== partnerId) {
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

  await prisma.food.delete({
    where: { id: req.params.id },
  });

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
