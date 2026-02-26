const foodModel = require("../models/food.models");
const storageService = require("../services/storage.services");
const { v4: uuidv4 } = require("uuid");

/**
 * Creates a new food item with a video uploaded to ImageKit.
 * Protected route — only accessible by authenticated food partners.
 */
async function createFoodItem(req, res) {
  // Guard: check for video file before doing anything else
  if (!req.file) {
    return res.status(400).json({ message: "Video file is required" });
  }

  const { name, description, price } = req.body;
  const foodPartnerId = req.foodPartner._id; // extracted from JWT by auth middleware

  try {
    // Build a unique file name and upload the video buffer directly to ImageKit
    const uniqueFileName = `${uuidv4()}-${req.file.originalname}`;
    const fileUploadResponse = await storageService.uploadFile(
      req.file.buffer,
      uniqueFileName,
    );

    // Persist the food item with the Cloudinary-hosted video URL
    const newFoodItem = new foodModel({
      name,
      description,
      price,
      video: fileUploadResponse.secure_url, // public URL returned by Cloudinary
      foodPartner: foodPartnerId,
    });

    const savedFoodItem = await newFoodItem.save();
    res.status(201).json(savedFoodItem);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

// For public listing of all food items (no auth required)
async function getAllFoodItems(req, res) {
  try {
    const foodItems = await foodModel.find().populate("foodPartner", "name");
    res.status(200).json(foodItems);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

module.exports = {
  createFoodItem,
  getAllFoodItems,
};
