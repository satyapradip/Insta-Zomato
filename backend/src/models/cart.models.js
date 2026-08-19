const mongoose = require("mongoose");

const CartItemSchema = new mongoose.Schema({
  food: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Food",
    required: [true, "Food item reference is required"],
  },
  name: {
    type: String,
    required: true,
  },
  thumbnailUrl: {
    type: String,
    default: "",
  },
  isVeg: {
    type: Boolean,
    default: true,
  },
  selectedVariant: {
    name: { type: String },
    price: { type: Number },
  },
  selectedAddOns: [
    {
      name: { type: String },
      price: { type: Number },
    },
  ],
  unitPrice: {
    type: Number,
    required: true,
    min: 0,
  },
  quantity: {
    type: Number,
    required: true,
    min: [1, "Quantity cannot be less than 1"],
    default: 1,
  },
  itemTotal: {
    type: Number,
    required: true,
    min: 0,
  },
});

const CartSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User reference is required"],
      unique: true, // One active cart per user
      index: true,
    },
    partner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "FoodPartner",
      default: null, // Null when cart is empty
    },
    items: [CartItemSchema],
    deliveryInstructions: {
      type: [String],
      default: [],
    },
    tipAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    appliedCoupon: {
      couponId: { type: mongoose.Schema.Types.ObjectId, ref: "Coupon" },
      code: { type: String },
      discountAmount: { type: Number, default: 0 },
    },
    pricing: {
      subtotal: { type: Number, default: 0 },
      deliveryFee: { type: Number, default: 30 },
      platformFee: { type: Number, default: 5 },
      taxes: { type: Number, default: 0 }, // 5% GST
      discountAmount: { type: Number, default: 0 },
      grandTotal: { type: Number, default: 0 },
    },
  },
  {
    timestamps: true,
  },
);

const cartModel = mongoose.model("Cart", CartSchema);
module.exports = cartModel;
