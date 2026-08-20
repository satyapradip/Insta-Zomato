const mongoose = require("mongoose");

const AddressSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User reference is required"],
      index: true,
    },
    label: {
      type: String,
      enum: ["Home", "Work", "Other"],
      default: "Home",
    },
    recipientName: {
      type: String,
      trim: true,
      default: "",
    },
    street: {
      type: String,
      required: [true, "Street address is required"],
      trim: true,
    },
    landmark: {
      type: String,
      trim: true,
      default: "",
    },
    city: {
      type: String,
      required: [true, "City is required"],
      trim: true,
    },
    state: {
      type: String,
      required: [true, "State is required"],
      trim: true,
    },
    pincode: {
      type: String,
      required: [true, "Pincode is required"],
      trim: true,
      match: [/^\d{6}$/, "Pincode must be exactly 6 digits"],
    },
    coordinates: {
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
    contactPhone: {
      type: String,
      trim: true,
      default: "",
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);

AddressSchema.index({ coordinates: "2dsphere" });
AddressSchema.index({ user: 1, isDefault: -1 });

const addressModel = mongoose.model("Address", AddressSchema);
module.exports = addressModel;
