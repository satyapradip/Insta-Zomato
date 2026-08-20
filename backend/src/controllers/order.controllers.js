const orderModel = require("../models/order.models");
const cartModel = require("../models/cart.models");
const addressModel = require("../models/address.models");
const foodPartnerModel = require("../models/foodpartner.models");
const deliveryPartnerModel = require("../models/deliverypartner.models");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const {
  validateTransition,
  generateOrderNumber,
  generateDeliveryOtp,
  hashDeliveryOtp,
  createTimelineEntry,
} = require("../services/orderStateMachine.services");

// ── CUSTOMER CONTROLLERS ────────────────────────────────────────────────────

/**
 * Places a new order by converting the user's active cart items.
 * Validates items, snapshots delivery address and partner data, hashes crypto delivery OTP,
 * sets status to PENDING, appends initial timeline entry, and resets the active cart.
 */
const placeOrder = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const {
    addressId,
    deliveryAddress: directAddress,
    paymentMethod = "COD",
    tipAmount: overrideTip,
    deliveryInstructions: overrideInstructions,
  } = req.body;

  // 1. Fetch user's active cart
  const cart = await cartModel
    .findOne({ user: userId })
    .populate("partner");

  if (!cart || !cart.items || cart.items.length === 0) {
    throw new ApiError(400, "Cannot place order: Your cart is empty");
  }

  if (!cart.partner) {
    throw new ApiError(400, "Cannot place order: No restaurant associated with this cart");
  }

  // 2. Resolve Delivery Address
  let resolvedAddress;
  if (addressId) {
    const savedAddress = await addressModel.findOne({
      _id: addressId,
      user: userId,
    });
    if (!savedAddress) {
      throw new ApiError(404, "Specified delivery address not found");
    }
    resolvedAddress = {
      label: savedAddress.label,
      recipientName: savedAddress.recipientName || req.user.fullName || "",
      street: savedAddress.street,
      landmark: savedAddress.landmark || "",
      city: savedAddress.city,
      state: savedAddress.state,
      pincode: savedAddress.pincode,
      coordinates: savedAddress.coordinates?.coordinates || [77.5946, 12.9716],
      contactPhone: savedAddress.contactPhone || req.user.phone || "",
    };
  } else if (directAddress) {
    resolvedAddress = {
      label: directAddress.label || "Home",
      recipientName: directAddress.recipientName || req.user.fullName || "",
      street: directAddress.street,
      landmark: directAddress.landmark || "",
      city: directAddress.city,
      state: directAddress.state || "",
      pincode: directAddress.pincode,
      coordinates: directAddress.coordinates || [77.5946, 12.9716],
      contactPhone: directAddress.contactPhone || req.user.phone || "",
    };
  } else {
    throw new ApiError(400, "A valid delivery address is required");
  }

  // 3. Snapshot Restaurant Data
  const partner = cart.partner;
  const restaurantSnapshot = {
    name: partner.name,
    restaurantName: partner.restaurantName,
    logo: partner.logo || "",
    address: partner.location?.address || "",
    city: partner.location?.city || "",
    coordinates: partner.location?.coordinates || [77.5946, 12.9716],
    phone: partner.phone || "",
  };

  // 4. Snapshot Items
  const orderItems = cart.items.map((item) => ({
    food: item.food,
    name: item.name,
    thumbnailUrl: item.thumbnailUrl || "",
    isVeg: item.isVeg,
    selectedVariant: item.selectedVariant,
    selectedAddOns: item.selectedAddOns,
    unitPrice: item.unitPrice,
    quantity: item.quantity,
    itemTotal: item.itemTotal,
  }));

  // 5. Pricing Snapshot (Honor tip/instructions override if provided)
  const tipAmount =
    overrideTip !== undefined ? overrideTip : cart.tipAmount || 0;
  const deliveryInstructions =
    overrideInstructions || cart.deliveryInstructions || [];

  const subtotal = cart.pricing.subtotal;
  const deliveryFee = cart.pricing.deliveryFee;
  const platformFee = cart.pricing.platformFee;
  const taxes = cart.pricing.taxes;
  const discountAmount = cart.pricing.discountAmount || 0;
  const grandTotal = Math.max(
    0,
    Math.round(
      (subtotal + deliveryFee + platformFee + taxes + tipAmount - discountAmount) *
        100,
    ) / 100,
  );

  const pricing = {
    subtotal,
    deliveryFee,
    platformFee,
    taxes,
    discountAmount,
    tipAmount,
    grandTotal,
  };

  // 6. Cryptographic Delivery OTP Generation
  const plainOtp = generateDeliveryOtp();
  const hashedOtp = await hashDeliveryOtp(plainOtp);
  const orderNumber = generateOrderNumber();

  // 7. Initial Timeline
  const initialTimeline = [
    createTimelineEntry(
      "PENDING",
      "Order placed successfully by customer",
      "customer",
      userId,
    ),
  ];

  // 8. Create Order Document
  const newOrder = await orderModel.create({
    orderNumber,
    user: userId,
    partner: partner._id,
    items: orderItems,
    deliveryAddress: resolvedAddress,
    restaurantSnapshot,
    pricing,
    appliedCoupon: cart.appliedCoupon,
    deliveryInstructions,
    status: "PENDING",
    paymentStatus: paymentMethod === "COD" ? "PENDING" : "PENDING",
    paymentMethod,
    deliveryOtp: hashedOtp,
    plainOtp: plainOtp,
    timeline: initialTimeline,
    estimatedPrepTimeMinutes: 25,
    estimatedDeliveryTime: new Date(Date.now() + 45 * 60 * 1000), // ~45 minutes default ETA
  });

  // 9. Reset user's active cart atomically
  cart.items = [];
  cart.partner = null;
  cart.appliedCoupon = undefined;
  cart.tipAmount = 0;
  cart.deliveryInstructions = [];
  cart.pricing = {
    subtotal: 0,
    deliveryFee: 0,
    platformFee: 0,
    taxes: 0,
    discountAmount: 0,
    grandTotal: 0,
  };
  await cart.save();

  // Return order with plainOtp visible for the placing customer
  const responseData = newOrder.toObject();
  responseData.deliveryOtp = plainOtp;

  res.status(201).json(
    new ApiResponse(201, responseData, "Order placed successfully! 🚀"),
  );
});

/**
 * Gets paginated order history for the authenticated customer.
 */
const getCustomerOrders = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const skip = (page - 1) * limit;

  const filter = { user: userId };
  if (req.query.status) {
    filter.status = req.query.status.toUpperCase();
  }

  const [orders, totalOrders] = await Promise.all([
    orderModel
      .find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("partner", "restaurantName logo location avgRating")
      .populate("deliveryPartner", "name phone vehicleType vehicleNumber rating")
      .select("+plainOtp"),
    orderModel.countDocuments(filter),
  ]);

  const ordersWithOtp = orders.map((ord) => {
    const obj = ord.toObject();
    if (obj.plainOtp) {
      obj.deliveryOtp = obj.plainOtp;
    }
    return obj;
  });

  res.status(200).json(
    new ApiResponse(
      200,
      {
        orders: ordersWithOtp,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalOrders / limit),
          totalOrders,
          hasNext: skip + orders.length < totalOrders,
        },
      },
      "Customer orders fetched successfully",
    ),
  );
});

/**
 * Gets detailed order view with timeline.
 * Accessible by Customer (owner), Partner (assigned), Rider (assigned), or Admin.
 */
const getOrderDetail = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const order = await orderModel
    .findById(id)
    .populate("partner", "name restaurantName logo location phone avgRating")
    .populate(
      "deliveryPartner",
      "name phone vehicleType vehicleNumber currentLocation rating totalDeliveries",
    )
    .populate("user", "fullName email phone")
    .select("+plainOtp");

  if (!order) {
    throw new ApiError(404, "Order not found");
  }

  // Authorization check
  const isCustomer = req.user.role === "customer" && order.user._id.toString() === req.user.id;
  const isPartner = req.user.role === "foodpartner" && order.partner._id.toString() === req.user.id;
  const isRider =
    req.user.role === "deliverypartner" &&
    (order.deliveryPartner?._id?.toString() === req.user.id ||
      (order.status === "READY_FOR_PICKUP" && !order.deliveryPartner));
  const isAdmin = req.user.role === "admin";

  if (!isCustomer && !isPartner && !isRider && !isAdmin) {
    throw new ApiError(403, "Access forbidden: You are not authorized to view this order");
  }

  const responseData = order.toObject();

  // Reveal plain OTP only to the owning customer
  if (isCustomer && order.plainOtp) {
    responseData.deliveryOtp = order.plainOtp;
  } else {
    delete responseData.deliveryOtp;
    delete responseData.plainOtp;
  }

  res
    .status(200)
    .json(new ApiResponse(200, responseData, "Order details fetched successfully"));
});

/**
 * Allows a customer to cancel an order if it is in PENDING or CONFIRMED state.
 */
const cancelOrderByCustomer = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  const { reason = "Cancelled by customer" } = req.body;

  const order = await orderModel.findOne({ _id: id, user: userId });
  if (!order) {
    throw new ApiError(404, "Order not found or does not belong to you");
  }

  // Validate state machine transition
  validateTransition(order.status, "CANCELLED", "customer");

  order.status = "CANCELLED";
  order.cancellation = {
    reason,
    cancelledBy: "customer",
    cancelledAt: new Date(),
    refundStatus: order.paymentStatus === "PAID" ? "PENDING" : "NOT_APPLICABLE",
    refundAmount: order.pricing.grandTotal,
  };

  order.timeline.push(
    createTimelineEntry(
      "CANCELLED",
      `Order cancelled by customer: ${reason}`,
      "customer",
      userId,
    ),
  );

  await order.save();

  res
    .status(200)
    .json(new ApiResponse(200, order, "Order cancelled successfully"));
});

/**
 * Returns tracking metadata (driver coordinates, restaurant coordinates, delivery address, timeline).
 */
const trackOrder = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const order = await orderModel
    .findById(id)
    .populate("deliveryPartner", "name phone vehicleType vehicleNumber currentLocation rating")
    .populate("partner", "restaurantName logo location phone");

  if (!order) {
    throw new ApiError(404, "Order not found");
  }

  const trackingInfo = {
    orderId: order._id,
    orderNumber: order.orderNumber,
    status: order.status,
    restaurant: {
      name: order.restaurantSnapshot?.restaurantName || order.partner?.restaurantName,
      coordinates: order.restaurantSnapshot?.coordinates || order.partner?.location?.coordinates,
      phone: order.restaurantSnapshot?.phone || order.partner?.phone,
    },
    deliveryAddress: order.deliveryAddress,
    deliveryPartner: order.deliveryPartner
      ? {
          name: order.deliveryPartner.name,
          phone: order.deliveryPartner.phone,
          vehicleType: order.deliveryPartner.vehicleType,
          vehicleNumber: order.deliveryPartner.vehicleNumber,
          currentLocation: order.deliveryPartner.currentLocation?.coordinates || null,
        }
      : null,
    estimatedDeliveryTime: order.estimatedDeliveryTime,
    timeline: order.timeline,
  };

  res
    .status(200)
    .json(new ApiResponse(200, trackingInfo, "Order tracking info fetched successfully"));
});

// ── FOOD PARTNER CONTROLLERS ────────────────────────────────────────────────

/**
 * Gets incoming/active orders for the authenticated food partner restaurant.
 */
const getPartnerOrders = asyncHandler(async (req, res) => {
  const partnerId = req.user.id;
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 20;
  const skip = (page - 1) * limit;

  const filter = { partner: partnerId };
  if (req.query.status) {
    filter.status = req.query.status.toUpperCase();
  }

  const [orders, totalOrders] = await Promise.all([
    orderModel
      .find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("user", "fullName phone email")
      .populate("deliveryPartner", "name phone vehicleType vehicleNumber"),
    orderModel.countDocuments(filter),
  ]);

  res.status(200).json(
    new ApiResponse(
      200,
      {
        orders,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalOrders / limit),
          totalOrders,
          hasNext: skip + orders.length < totalOrders,
        },
      },
      "Partner orders fetched successfully",
    ),
  );
});

/**
 * Food Partner confirms the order and optionally sets preparation time.
 */
const confirmOrderByPartner = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const partnerId = req.user.id;
  const { prepTimeMinutes = 25 } = req.body;

  const order = await orderModel.findOne({ _id: id, partner: partnerId });
  if (!order) {
    throw new ApiError(404, "Order not found for this restaurant");
  }

  validateTransition(order.status, "CONFIRMED", "foodpartner");

  order.status = "CONFIRMED";
  order.estimatedPrepTimeMinutes = prepTimeMinutes;
  order.estimatedDeliveryTime = new Date(
    Date.now() + (prepTimeMinutes + 20) * 60 * 1000,
  );

  order.timeline.push(
    createTimelineEntry(
      "CONFIRMED",
      `Order confirmed by kitchen. Prep time: ${prepTimeMinutes} mins.`,
      "foodpartner",
      partnerId,
    ),
  );

  await order.save();

  res
    .status(200)
    .json(new ApiResponse(200, order, "Order confirmed by restaurant"));
});

/**
 * Food Partner marks the order as PREPARING.
 */
const preparingOrderByPartner = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const partnerId = req.user.id;

  const order = await orderModel.findOne({ _id: id, partner: partnerId });
  if (!order) {
    throw new ApiError(404, "Order not found for this restaurant");
  }

  validateTransition(order.status, "PREPARING", "foodpartner");

  order.status = "PREPARING";
  order.timeline.push(
    createTimelineEntry(
      "PREPARING",
      "Kitchen is now preparing the food",
      "foodpartner",
      partnerId,
    ),
  );

  await order.save();

  res
    .status(200)
    .json(new ApiResponse(200, order, "Order marked as preparing"));
});

/**
 * Food Partner marks the food as READY_FOR_PICKUP.
 */
const readyOrderByPartner = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const partnerId = req.user.id;

  const order = await orderModel.findOne({ _id: id, partner: partnerId });
  if (!order) {
    throw new ApiError(404, "Order not found for this restaurant");
  }

  validateTransition(order.status, "READY_FOR_PICKUP", "foodpartner");

  order.status = "READY_FOR_PICKUP";
  order.timeline.push(
    createTimelineEntry(
      "READY_FOR_PICKUP",
      "Food is prepared, packed, and waiting for rider pickup",
      "foodpartner",
      partnerId,
    ),
  );

  await order.save();

  res
    .status(200)
    .json(new ApiResponse(200, order, "Order marked ready for pickup"));
});

/**
 * Food Partner cancels the order with a mandatory reason.
 */
const cancelOrderByPartner = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const partnerId = req.user.id;
  const { reason } = req.body;

  const order = await orderModel.findOne({ _id: id, partner: partnerId });
  if (!order) {
    throw new ApiError(404, "Order not found for this restaurant");
  }

  validateTransition(order.status, "CANCELLED", "foodpartner");

  order.status = "CANCELLED";
  order.cancellation = {
    reason,
    cancelledBy: "foodpartner",
    cancelledAt: new Date(),
    refundStatus: order.paymentStatus === "PAID" ? "PENDING" : "NOT_APPLICABLE",
    refundAmount: order.pricing.grandTotal,
  };

  order.timeline.push(
    createTimelineEntry(
      "CANCELLED",
      `Order cancelled by restaurant: ${reason}`,
      "foodpartner",
      partnerId,
    ),
  );

  await order.save();

  res
    .status(200)
    .json(new ApiResponse(200, order, "Order cancelled by restaurant"));
});

// ── DELIVERY PARTNER (RIDER) CONTROLLERS ────────────────────────────────────

/**
 * Lists all available orders ready for delivery pickup without an assigned rider.
 */
const getAvailableOrdersForRider = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const skip = (page - 1) * limit;

  const filter = {
    status: "READY_FOR_PICKUP",
    deliveryPartner: null,
  };

  const [orders, totalOrders] = await Promise.all([
    orderModel
      .find(filter)
      .sort({ createdAt: 1 }) // First in, first out
      .skip(skip)
      .limit(limit)
      .populate("partner", "restaurantName logo location phone")
      .populate("user", "fullName phone"),
    orderModel.countDocuments(filter),
  ]);

  res.status(200).json(
    new ApiResponse(
      200,
      {
        orders,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalOrders / limit),
          totalOrders,
          hasNext: skip + orders.length < totalOrders,
        },
      },
      "Available delivery orders fetched successfully",
    ),
  );
});

/**
 * Rider claims/accepts the delivery assignment for a ready order.
 */
const acceptDeliveryByRider = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const riderId = req.user.id;

  // 1. Verify rider doesn't already have an active uncompleted order
  const activeOrder = await orderModel.findOne({
    deliveryPartner: riderId,
    status: { $in: ["PICKED_UP", "OUT_FOR_DELIVERY"] },
  });

  if (activeOrder) {
    throw new ApiError(
      400,
      `You already have an active order in progress (#${activeOrder.orderNumber}). Complete it before accepting a new one.`,
    );
  }

  // 2. Fetch target order
  const order = await orderModel.findById(id);
  if (!order) {
    throw new ApiError(404, "Order not found");
  }

  if (order.status !== "READY_FOR_PICKUP") {
    throw new ApiError(
      400,
      `Cannot accept order in '${order.status}' status. Must be 'READY_FOR_PICKUP'.`,
    );
  }

  if (order.deliveryPartner && order.deliveryPartner.toString() !== riderId) {
    throw new ApiError(409, "Order has already been assigned to another delivery partner");
  }

  order.deliveryPartner = riderId;
  order.timeline.push(
    createTimelineEntry(
      order.status,
      "Delivery partner accepted the order dispatch",
      "deliverypartner",
      riderId,
    ),
  );

  await order.save();

  // Update rider's current order pointer
  await deliveryPartnerModel.findByIdAndUpdate(riderId, {
    currentOrder: order._id,
  });

  res
    .status(200)
    .json(new ApiResponse(200, order, "Delivery dispatch accepted successfully"));
});

/**
 * Rider picks up the food from the restaurant.
 */
const pickupOrderByRider = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const riderId = req.user.id;

  const order = await orderModel.findOne({ _id: id, deliveryPartner: riderId });
  if (!order) {
    throw new ApiError(404, "Order not found or not assigned to you");
  }

  validateTransition(order.status, "PICKED_UP", "deliverypartner");

  order.status = "PICKED_UP";
  order.timeline.push(
    createTimelineEntry(
      "PICKED_UP",
      "Food picked up from restaurant by delivery partner",
      "deliverypartner",
      riderId,
    ),
  );

  await order.save();

  res
    .status(200)
    .json(new ApiResponse(200, order, "Order marked as picked up"));
});

/**
 * Rider marks that they are OUT_FOR_DELIVERY towards customer.
 */
const outForDeliveryByRider = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const riderId = req.user.id;

  const order = await orderModel.findOne({ _id: id, deliveryPartner: riderId });
  if (!order) {
    throw new ApiError(404, "Order not found or not assigned to you");
  }

  validateTransition(order.status, "OUT_FOR_DELIVERY", "deliverypartner");

  order.status = "OUT_FOR_DELIVERY";
  order.timeline.push(
    createTimelineEntry(
      "OUT_FOR_DELIVERY",
      "Delivery partner is en route to customer location",
      "deliverypartner",
      riderId,
    ),
  );

  await order.save();

  res
    .status(200)
    .json(new ApiResponse(200, order, "Order marked out for delivery"));
});

/**
 * Rider confirms delivery by entering the 4-digit OTP provided by customer.
 * Cryptographically verifies OTP hash. Upon match, marks DELIVERED, closes rider assignment,
 * and increments total deliveries.
 */
const deliverOrderByRider = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const riderId = req.user.id;
  const { otp } = req.body;

  if (!otp) {
    throw new ApiError(400, "4-digit delivery OTP is required");
  }

  const order = await orderModel
    .findOne({ _id: id, deliveryPartner: riderId })
    .select("+deliveryOtp");

  if (!order) {
    throw new ApiError(404, "Order not found or not assigned to you");
  }

  validateTransition(order.status, "DELIVERED", "deliverypartner");

  // Verify OTP match
  const isMatch = await order.verifyDeliveryOtp(otp);
  if (!isMatch) {
    throw new ApiError(
      400,
      "Invalid delivery OTP. Please verify the 4-digit OTP with the customer.",
    );
  }

  order.status = "DELIVERED";
  order.actualDeliveryTime = new Date();
  if (order.paymentMethod === "COD") {
    order.paymentStatus = "PAID";
  }

  order.timeline.push(
    createTimelineEntry(
      "DELIVERED",
      "Order successfully handed over and verified with delivery OTP",
      "deliverypartner",
      riderId,
    ),
  );

  await order.save();

  // Clear rider currentOrder and increment delivery count
  await deliveryPartnerModel.findByIdAndUpdate(riderId, {
    currentOrder: null,
    $inc: { totalDeliveries: 1 },
  });

  res
    .status(200)
    .json(new ApiResponse(200, order, "Order delivered successfully! 🎉"));
});

/**
 * Rider marks delivery failed with a mandatory reason.
 */
const failDeliveryByRider = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const riderId = req.user.id;
  const { reason } = req.body;

  const order = await orderModel.findOne({ _id: id, deliveryPartner: riderId });
  if (!order) {
    throw new ApiError(404, "Order not found or not assigned to you");
  }

  validateTransition(order.status, "FAILED", "deliverypartner");

  order.status = "FAILED";
  order.cancellation = {
    reason,
    cancelledBy: "deliverypartner",
    cancelledAt: new Date(),
  };

  order.timeline.push(
    createTimelineEntry(
      "FAILED",
      `Delivery failed: ${reason}`,
      "deliverypartner",
      riderId,
    ),
  );

  await order.save();

  // Clear rider's active assignment
  await deliveryPartnerModel.findByIdAndUpdate(riderId, {
    currentOrder: null,
  });

  res
    .status(200)
    .json(new ApiResponse(200, order, "Delivery marked as failed"));
});

// ── ADMIN CONTROLLERS ───────────────────────────────────────────────────────

/**
 * Global order stream with filters for administrator panel.
 */
const getAllOrdersAdmin = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 20;
  const skip = (page - 1) * limit;

  const filter = {};
  if (req.query.status) {
    filter.status = req.query.status.toUpperCase();
  }
  if (req.query.partnerId) {
    filter.partner = req.query.partnerId;
  }
  if (req.query.userId) {
    filter.user = req.query.userId;
  }

  const [orders, totalOrders] = await Promise.all([
    orderModel
      .find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("user", "fullName email phone")
      .populate("partner", "restaurantName")
      .populate("deliveryPartner", "name phone"),
    orderModel.countDocuments(filter),
  ]);

  res.status(200).json(
    new ApiResponse(
      200,
      {
        orders,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalOrders / limit),
          totalOrders,
          hasNext: skip + orders.length < totalOrders,
        },
      },
      "All orders fetched for admin",
    ),
  );
});

module.exports = {
  // Customer
  placeOrder,
  getCustomerOrders,
  getOrderDetail,
  cancelOrderByCustomer,
  trackOrder,

  // Food Partner
  getPartnerOrders,
  confirmOrderByPartner,
  preparingOrderByPartner,
  readyOrderByPartner,
  cancelOrderByPartner,

  // Delivery Partner
  getAvailableOrdersForRider,
  acceptDeliveryByRider,
  pickupOrderByRider,
  outForDeliveryByRider,
  deliverOrderByRider,
  failDeliveryByRider,

  // Admin
  getAllOrdersAdmin,
};
