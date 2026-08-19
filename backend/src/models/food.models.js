const mongoose = require("mongoose");

const FoodSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Food name is required"],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    price: {
      type: Number,
      required: [true, "Base price is required"],
      min: [0, "Price cannot be negative"],
    },
    discountedPrice: {
      type: Number,
      min: [0, "Discounted price cannot be negative"],
    },
    foodPartner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "FoodPartner",
      required: [true, "Food Partner reference is required"],
      index: true,
    },
    category: {
      type: String,
      trim: true,
      default: "General",
      index: true,
    },
    tags: {
      type: [String],
      default: [],
    },
    video: {
      type: String,
      required: [true, "Video URL is required"],
    },
    thumbnailUrl: {
      type: String,
      default: "",
    },
    cloudinaryPublicId: {
      type: String,
      default: "",
    },
    isVeg: {
      type: Boolean,
      default: true,
      index: true,
    },
    spiceLevel: {
      type: String,
      enum: ["mild", "medium", "hot"],
      default: "medium",
    },
    preparationTime: {
      type: Number,
      default: 20, // in minutes
    },
    calories: {
      type: Number,
      default: 0,
    },
    // Flipkart-style portion sizing variants (e.g. Half, Full, Jumbo)
    variants: [
      {
        name: { type: String, required: true, trim: true },
        price: { type: Number, required: true, min: 0 },
      },
    ],
    // Optional add-ons (e.g. Extra Cheese, Mint Chutney, Dips)
    addOns: [
      {
        name: { type: String, required: true, trim: true },
        price: { type: Number, required: true, min: 0 },
      },
    ],
    likeCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    saveCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    commentCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    viewCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    orderCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    ratings: {
      average: {
        type: Number,
        default: 0,
        min: 0,
        max: 5,
      },
      count: {
        type: Number,
        default: 0,
      },
    },
    isAvailable: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  },
);

// Compound indexes for feed sorting and menu queries
FoodSchema.index({ isAvailable: 1, likeCount: -1, createdAt: -1 });
FoodSchema.index({ foodPartner: 1, isAvailable: 1 });
FoodSchema.index({ name: "text", description: "text", tags: "text" });

const foodModel = mongoose.model("Food", FoodSchema);
module.exports = foodModel;
