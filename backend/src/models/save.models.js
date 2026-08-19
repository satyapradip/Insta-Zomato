const mongoose = require("mongoose");

const SaveSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User reference is required"],
    },
    food: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Food",
      required: [true, "Food item reference is required"],
    },
    collectionName: {
      type: String,
      trim: true,
      default: "Wishlist",
    },
  },
  {
    timestamps: true,
  },
);

// Unique compound index: One user can save a food item to a collection only once
SaveSchema.index({ user: 1, food: 1 }, { unique: true });
SaveSchema.index({ user: 1, collectionName: 1 });

const saveModel = mongoose.model("Save", SaveSchema);
module.exports = saveModel;
