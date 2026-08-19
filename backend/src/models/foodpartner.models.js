const mongoose = require("mongoose");

const FoodPartnerSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Owner name is required"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: [true, "Password is required"],
    },
    phone: {
      type: String,
      required: [true, "Phone number is required"],
      trim: true,
    },
    role: {
      type: String,
      enum: ["foodpartner"],
      default: "foodpartner",
    },
    restaurantName: {
      type: String,
      trim: true,
      default: function () {
        return this.name;
      },
    },
    description: {
      type: String,
      default: "",
    },
    logo: {
      type: String,
      default: "",
    },
    coverImage: {
      type: String,
      default: "",
    },
    fssaiLicenseNumber: {
      type: String,
      trim: true,
      default: "",
    },
    cuisine: {
      type: [String],
      default: [],
    },
    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        default: [77.5946, 12.9716],
      },
      address: {
        type: String,
        default: "",
      },
      city: {
        type: String,
        default: "",
      },
      pincode: {
        type: String,
        default: "",
      },
    },
    openingHours: {
      openTime: {
        type: String,
        default: "10:00",
      },
      closeTime: {
        type: String,
        default: "23:00",
      },
      daysOpen: {
        type: [String],
        default: [
          "Monday",
          "Tuesday",
          "Wednesday",
          "Thursday",
          "Friday",
          "Saturday",
          "Sunday",
        ],
      },
    },
    isOpen: {
      type: Boolean,
      default: true,
    },
    isApproved: {
      type: Boolean,
      default: false,
    },
    avgRating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    totalRatings: {
      type: Number,
      default: 0,
    },
    refreshToken: {
      type: String,
      select: false,
    },
  },
  {
    timestamps: true,
  },
);

// 2dsphere index for nearby restaurant searches
FoodPartnerSchema.index({ location: "2dsphere" });

const foodPartnerModel = mongoose.model("FoodPartner", FoodPartnerSchema);

module.exports = foodPartnerModel;