const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const OrderItemSchema = new mongoose.Schema({
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
  },
  itemTotal: {
    type: Number,
    required: true,
    min: 0,
  },
});

const OrderTimelineSchema = new mongoose.Schema(
  {
    status: {
      type: String,
      required: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
    note: {
      type: String,
      default: "",
    },
    actorRole: {
      type: String,
      enum: ["customer", "foodpartner", "deliverypartner", "admin", "system"],
      default: "system",
    },
    actorId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
  },
  { _id: false },
);

const OrderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      required: [true, "Order number is required"],
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User reference is required"],
      index: true,
    },
    partner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "FoodPartner",
      required: [true, "Food Partner reference is required"],
      index: true,
    },
    deliveryPartner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DeliveryPartner",
      default: null,
      index: true,
    },
    items: {
      type: [OrderItemSchema],
      required: [true, "Order must contain at least one item"],
      validate: [
        (val) => Array.isArray(val) && val.length > 0,
        "Order must contain at least one item",
      ],
    },
    deliveryAddress: {
      label: { type: String, default: "Home" },
      recipientName: { type: String, default: "" },
      street: { type: String, required: true },
      landmark: { type: String, default: "" },
      city: { type: String, required: true },
      state: { type: String, default: "" },
      pincode: { type: String, required: true },
      coordinates: {
        type: [Number], // [longitude, latitude]
        default: [77.5946, 12.9716],
      },
      contactPhone: { type: String, default: "" },
    },
    restaurantSnapshot: {
      name: { type: String },
      restaurantName: { type: String },
      logo: { type: String, default: "" },
      address: { type: String, default: "" },
      city: { type: String, default: "" },
      coordinates: {
        type: [Number], // [longitude, latitude]
        default: [77.5946, 12.9716],
      },
      phone: { type: String, default: "" },
    },
    pricing: {
      subtotal: { type: Number, required: true, min: 0 },
      deliveryFee: { type: Number, required: true, default: 30, min: 0 },
      platformFee: { type: Number, required: true, default: 5, min: 0 },
      taxes: { type: Number, required: true, default: 0, min: 0 },
      discountAmount: { type: Number, default: 0, min: 0 },
      tipAmount: { type: Number, default: 0, min: 0 },
      grandTotal: { type: Number, required: true, min: 0 },
    },
    appliedCoupon: {
      couponId: { type: mongoose.Schema.Types.ObjectId, ref: "Coupon" },
      code: { type: String },
      discountAmount: { type: Number, default: 0 },
    },
    deliveryInstructions: {
      type: [String],
      default: [],
    },
    status: {
      type: String,
      enum: [
        "PENDING",
        "CONFIRMED",
        "PREPARING",
        "READY_FOR_PICKUP",
        "PICKED_UP",
        "OUT_FOR_DELIVERY",
        "DELIVERED",
        "CANCELLED",
        "FAILED",
      ],
      default: "PENDING",
      index: true,
    },
    paymentStatus: {
      type: String,
      enum: ["PENDING", "PAID", "FAILED", "REFUNDED"],
      default: "PENDING",
      index: true,
    },
    paymentMethod: {
      type: String,
      enum: ["RAZORPAY", "WALLET", "COD"],
      default: "COD",
      uppercase: true,
    },
    razorpayOrderId: {
      type: String,
      default: null,
    },
    razorpayPaymentId: {
      type: String,
      default: null,
    },
    deliveryOtp: {
      type: String,
      select: false, // Hashed Delivery OTP
    },
    plainOtp: {
      type: String,
      select: false, // Plain OTP for customer view / delivery confirmation
    },
    timeline: [OrderTimelineSchema],
    cancellation: {
      reason: { type: String, default: "" },
      cancelledBy: {
        type: String,
        enum: ["customer", "foodpartner", "deliverypartner", "admin", "system", ""],
        default: "",
      },
      cancelledAt: { type: Date, default: null },
      refundStatus: {
        type: String,
        enum: ["NOT_APPLICABLE", "PENDING", "PROCESSED", "FAILED"],
        default: "NOT_APPLICABLE",
      },
      refundAmount: { type: Number, default: 0 },
    },
    estimatedPrepTimeMinutes: {
      type: Number,
      default: 25,
    },
    estimatedDeliveryTime: {
      type: Date,
    },
    actualDeliveryTime: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

// Compound Indexes for fast queries
OrderSchema.index({ user: 1, createdAt: -1 });
OrderSchema.index({ partner: 1, status: 1, createdAt: -1 });
OrderSchema.index({ deliveryPartner: 1, status: 1, createdAt: -1 });
OrderSchema.index({ status: 1, createdAt: -1 });

/**
 * Verifies delivery OTP against stored hash
 */
OrderSchema.methods.verifyDeliveryOtp = async function (candidateOtp) {
  if (!this.deliveryOtp) return false;
  return bcrypt.compare(candidateOtp.toString(), this.deliveryOtp);
};

const orderModel = mongoose.model("Order", OrderSchema);
module.exports = orderModel;
