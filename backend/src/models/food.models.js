const mongoose = require("mongoose");

const FoodSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  // Storing the file path to the video; the actual file resides on the server's filesystem or a cloud storage service.
  video: {
    type: String,
    required: true,
  },
  description: {
    type: String,
  },
  price: {
    type: Number,
    required: true,
  },
  foodPartner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "FoodPartner",
    required: true,
  },
});

const foodModel = mongoose.model("Food", FoodSchema);
module.exports = foodModel;
