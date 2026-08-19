const mongoose = require("mongoose");

const LikeSchema = new mongoose.Schema(
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
  },
  {
    timestamps: true,
  },
);

// Unique compound index: One user can like a food reel only once
LikeSchema.index({ user: 1, food: 1 }, { unique: true });
LikeSchema.index({ food: 1 });

const likeModel = mongoose.model("Like", LikeSchema);
module.exports = likeModel;
