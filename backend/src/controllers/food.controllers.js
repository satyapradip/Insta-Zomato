const foodModel = require("../models/food.models");

async function createFoodItem(req, res) {
  const { name, description, price } = req.body;
  const foodPartnerId = req.foodPartner._id; // get food partner ID from req

  if (!req.file) {
    return res.status(400).json({ message: "Video file is required" });
  }

  try {
    const newFoodItem = new foodModel({
      name,
      description,
      price,
      video: req.file.path, // store the file path returned by multer diskStorage
      foodPartner: foodPartnerId,
    });

    const savedFoodItem = await newFoodItem.save();
    res.status(201).json(savedFoodItem);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

module.exports = {
  createFoodItem,
};
