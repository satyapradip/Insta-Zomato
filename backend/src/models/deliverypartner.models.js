const mongoose = require("mongoose");

const DeliveryPartnerSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Rider name is required"],
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
      enum: ["deliverypartner"],
      default: "deliverypartner",
    },
    vehicleType: {
      type: String,
      enum: ["bike", "scooter", "electric_vehicle", "cycle"],
      default: "bike",
    },
    vehicleNumber: {
      type: String,
      trim: true,
      uppercase: true,
      default: "",
    },
    drivingLicenseNumber: {
      type: String,
      trim: true,
      uppercase: true,
      default: "",
    },
    currentLocation: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        default: [77.5946, 12.9716],
      },
    },
    isOnline: {
      type: Boolean,
      default: false,
    },
    isApproved: {
      type: Boolean,
      default: false,
    },
    currentOrder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      default: null,
    },
    rating: {
      type: Number,
      default: 5.0,
      min: 1,
      max: 5,
    },
    totalDeliveries: {
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

// 2dsphere index for finding nearest delivery partner
DeliveryPartnerSchema.index({ currentLocation: "2dsphere" });

const deliveryPartnerModel = mongoose.model(
  "DeliveryPartner",
  DeliveryPartnerSchema,
);

module.exports = deliveryPartnerModel;
