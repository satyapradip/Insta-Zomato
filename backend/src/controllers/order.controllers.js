const { prisma } = require("../db/prisma");
const bcrypt = require("bcrypt");
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
const walletService = require("../services/wallet.services");
const {
  emitToUser,
  emitToPartner,
  emitToRider,
  emitToOrder,
  emitToOnlineRiders,
} = require("../services/socket.services");
const {
  notifyOrderPlaced,
  notifyOrderOutForDelivery,
  notifyOrderDelivered,
  notifyRefundCredited,
} = require("../services/notification.services");
const { autoDispatchOrder } = require("../services/dispatch.services");
const logger = require("../config/logger");

function computeCartPricing(items = [], appliedCoupon = null, tipAmount = 0) {
  let subtotal = 0;
  items.forEach((item) => {
    subtotal += item.unitPrice * item.quantity;
  });

  const deliveryFee = 30;
  const platformFee = 5;
  const taxes = Math.round(subtotal * 0.05 * 100) / 100;

  let discountAmount = 0;
  if (appliedCoupon && appliedCoupon.discountAmount) {
    discountAmount = Math.min(Number(appliedCoupon.discountAmount), subtotal);
  }

  const grandTotal = Math.max(
    0,
    subtotal + deliveryFee + platformFee + taxes + Number(tipAmount || 0) - discountAmount,
  );

  return {
    subtotal: Math.round(subtotal * 100) / 100,
    deliveryFee,
    platformFee,
    taxes,
    discountAmount: Math.round(discountAmount * 100) / 100,
    tipAmount: Number(tipAmount || 0),
    grandTotal: Math.round(grandTotal * 100) / 100,
  };
}

function formatOrderResponse(order, currentUserId, currentUserRole) {
  if (!order) return null;
  const isOwner = currentUserRole === "customer" && order.userId === currentUserId;
  const resp = {
    ...order,
    _id: order.id,
    user: order.user ? { ...order.user, _id: order.user.id } : order.userId,
    partner: order.partner
      ? {
          ...order.partner,
          _id: order.partner.id,
          location: {
            type: "Point",
            coordinates: [order.partner.longitude, order.partner.latitude],
          },
        }
      : order.partnerId,
    deliveryPartner: order.deliveryPartner
      ? {
          ...order.deliveryPartner,
          _id: order.deliveryPartner.id,
          currentLocation: {
            type: "Point",
            coordinates: [order.deliveryPartner.longitude, order.deliveryPartner.latitude],
          },
        }
      : order.deliveryPartnerId,
    items: (order.items || []).map((item) => ({
      ...item,
      _id: item.id,
      food: item.foodId,
    })),
  };

  if (isOwner && order.plainOtp) {
    resp.deliveryOtp = order.plainOtp;
  } else {
    delete resp.deliveryOtp;
    delete resp.plainOtp;
  }

  return resp;
}

// ── CUSTOMER CONTROLLERS ────────────────────────────────────────────────────

/**
 * Places a new order by converting the user's active cart items.
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
  const cart = await prisma.cart.findUnique({
    where: { userId },
    include: {
      items: true,
      partner: true,
    },
  });

  if (!cart || !cart.items || cart.items.length === 0) {
    throw new ApiError(400, "Cannot place order: Your cart is empty");
  }

  if (!cart.partner) {
    throw new ApiError(400, "Cannot place order: No restaurant associated with this cart");
  }

  // 2. Resolve Delivery Address
  let resolvedAddress;
  if (addressId) {
    const savedAddress = await prisma.address.findFirst({
      where: { id: addressId, userId },
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
      coordinates: [savedAddress.longitude, savedAddress.latitude],
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
    address: partner.address || "",
    city: partner.city || "",
    coordinates: [partner.longitude, partner.latitude],
    phone: partner.phone || "",
  };

  // 4. Pricing Snapshot
  const tipAmount =
    overrideTip !== undefined ? Number(overrideTip) : cart.tipAmount || 0;
  const deliveryInstructions =
    overrideInstructions || cart.deliveryInstructions || [];
  const pricing = computeCartPricing(cart.items, cart.appliedCoupon, tipAmount);

  // 5. Cryptographic Delivery OTP Generation
  const plainOtp = generateDeliveryOtp();
  const hashedOtp = await hashDeliveryOtp(plainOtp);
  const orderNumber = generateOrderNumber();

  // 6. Create Order Document with relations
  const newOrder = await prisma.order.create({
    data: {
      orderNumber,
      userId,
      partnerId: partner.id,
      deliveryAddress: resolvedAddress,
      restaurantSnapshot,
      pricing,
      appliedCoupon: cart.appliedCoupon || undefined,
      deliveryInstructions,
      status: "PENDING",
      paymentStatus: "PENDING",
      paymentMethod: paymentMethod === "RAZORPAY" ? "RAZORPAY" : paymentMethod === "WALLET" ? "WALLET" : "COD",
      deliveryOtp: hashedOtp,
      plainOtp: plainOtp,
      estimatedPrepTimeMinutes: 25,
      estimatedDeliveryTime: new Date(Date.now() + 45 * 60 * 1000),
      items: {
        create: cart.items.map((item) => ({
          foodId: item.foodId,
          name: item.name,
          thumbnailUrl: item.thumbnailUrl || "",
          isVeg: item.isVeg,
          selectedVariant: item.selectedVariant || undefined,
          selectedAddOns: item.selectedAddOns || [],
          unitPrice: item.unitPrice,
          quantity: item.quantity,
          itemTotal: item.itemTotal,
        })),
      },
      timeline: {
        create: [
          {
            status: "PENDING",
            note: "Order placed successfully by customer",
            actorRole: "customer",
            actorId: userId,
          },
        ],
      },
    },
    include: {
      items: true,
      timeline: true,
      partner: true,
    },
  });

  // 7. Reset user's active cart atomically
  await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
  await prisma.cart.update({
    where: { id: cart.id },
    data: {
      partnerId: null,
      appliedCoupon: null,
      tipAmount: 0,
      deliveryInstructions: [],
      pricing: { subtotal: 0, deliveryFee: 0, platformFee: 0, taxes: 0, discountAmount: 0, grandTotal: 0 },
    },
  });

  const responseData = formatOrderResponse(newOrder, userId, "customer");
  responseData.deliveryOtp = plainOtp;

  // Real-time broadcast: Kitchen incoming order alert & customer confirmation
  emitToPartner(partner.id, "order:new", {
    order: formatOrderResponse(newOrder, partner.id, "foodpartner"),
    message: "🔔 New incoming order received!",
  });
  emitToUser(userId, "order:created", {
    order: responseData,
  });

  // Multi-Channel Dispatch: In-App notification & HTML email invoice
  notifyOrderPlaced({
    order: responseData,
    user: req.customer || req.user,
    partner,
  }).catch((err) => logger.error("notifyOrderPlaced dispatch error:", err));

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

  const where = { userId };
  if (req.query.status) {
    where.status = req.query.status.toUpperCase();
  }

  const [orders, totalOrders] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: {
        items: true,
        timeline: true,
        partner: {
          select: { id: true, name: true, restaurantName: true, logo: true, avgRating: true, latitude: true, longitude: true },
        },
        deliveryPartner: {
          select: { id: true, name: true, phone: true, vehicleType: true, vehicleNumber: true, rating: true, latitude: true, longitude: true },
        },
      },
    }),
    prisma.order.count({ where }),
  ]);

  const formattedOrders = orders.map((ord) =>
    formatOrderResponse(ord, userId, "customer"),
  );

  res.status(200).json(
    new ApiResponse(
      200,
      {
        orders: formattedOrders,
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
 */
const getOrderDetail = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      items: true,
      timeline: true,
      partner: true,
      deliveryPartner: true,
      user: {
        select: { id: true, fullName: true, email: true, phone: true },
      },
    },
  });

  if (!order) {
    throw new ApiError(404, "Order not found");
  }

  // Authorization check
  const isCustomer = req.user.role === "customer" && order.userId === req.user.id;
  const isPartner = req.user.role === "foodpartner" && order.partnerId === req.user.id;
  const isRider =
    req.user.role === "deliverypartner" &&
    (order.deliveryPartnerId === req.user.id ||
      (order.status === "READY_FOR_PICKUP" && !order.deliveryPartnerId));
  const isAdmin = req.user.role === "admin";

  if (!isCustomer && !isPartner && !isRider && !isAdmin) {
    throw new ApiError(403, "Access forbidden: You are not authorized to view this order");
  }

  const responseData = formatOrderResponse(order, req.user.id, req.user.role);

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

  const order = await prisma.order.findFirst({
    where: { id, userId },
  });
  if (!order) {
    throw new ApiError(404, "Order not found or does not belong to you");
  }

  validateTransition(order.status, "CANCELLED", "customer");

  const cancellation = {
    reason,
    cancelledBy: "customer",
    cancelledAt: new Date(),
    refundStatus: order.paymentStatus === "PAID" ? "PROCESSED" : "NOT_APPLICABLE",
    refundAmount: order.pricing?.grandTotal || 0,
    refundedTo: order.paymentStatus === "PAID" ? "WALLET" : undefined,
  };

  const timelineEntries = [
    {
      status: "CANCELLED",
      note: `Order cancelled by customer: ${reason}`,
      actorRole: "customer",
      actorId: userId,
    },
  ];

  // If order was paid, credit instant refund to user's wallet
  if (order.paymentStatus === "PAID" && Number(order.pricing?.grandTotal || 0) > 0) {
    const refundAmount = Number(order.pricing.grandTotal);
    const refundTx = await walletService.creditWallet({
      userId: order.userId,
      amount: refundAmount,
      description: `Instant refund for cancelled Order #${order.orderNumber}`,
      orderId: order.id,
    });
    cancellation.refundTransactionId = refundTx.transaction.id;
    timelineEntries.push({
      status: "CANCELLED",
      note: `Instant refund of ₹${refundAmount} credited to customer In-App Wallet`,
      actorRole: "system",
    });
  }

  const updatedOrder = await prisma.order.update({
    where: { id },
    data: {
      status: "CANCELLED",
      paymentStatus: order.paymentStatus === "PAID" ? "REFUNDED" : order.paymentStatus,
      cancellation,
      timeline: {
        create: timelineEntries,
      },
    },
    include: { items: true, timeline: true },
  });

  const formattedResp = formatOrderResponse(updatedOrder, userId, "customer");

  // Real-time broadcast: Order cancelled by customer
  emitToPartner(order.partnerId, "order:cancelled", {
    orderId: order.id,
    orderNumber: order.orderNumber,
    reason,
    cancelledBy: "customer",
  });
  emitToOrder(order.id, "order:status_update", {
    orderId: order.id,
    status: "CANCELLED",
    order: formattedResp,
  });

  res
    .status(200)
    .json(new ApiResponse(200, formattedResp, "Order cancelled successfully"));
});

/**
 * Returns tracking metadata.
 */
const trackOrder = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      partner: true,
      deliveryPartner: true,
      timeline: true,
    },
  });

  if (!order) {
    throw new ApiError(404, "Order not found");
  }

  const trackingInfo = {
    orderId: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    restaurant: {
      name: order.restaurantSnapshot?.restaurantName || order.partner?.restaurantName,
      coordinates: order.restaurantSnapshot?.coordinates || [order.partner?.longitude, order.partner?.latitude],
      phone: order.restaurantSnapshot?.phone || order.partner?.phone,
    },
    deliveryAddress: order.deliveryAddress,
    deliveryPartner: order.deliveryPartner
      ? {
          name: order.deliveryPartner.name,
          phone: order.deliveryPartner.phone,
          vehicleType: order.deliveryPartner.vehicleType,
          vehicleNumber: order.deliveryPartner.vehicleNumber,
          currentLocation: [order.deliveryPartner.longitude, order.deliveryPartner.latitude],
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
 * Gets incoming/active orders for the authenticated food partner.
 */
const getPartnerOrders = asyncHandler(async (req, res) => {
  const partnerId = req.user.id;
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 20;
  const skip = (page - 1) * limit;

  const where = { partnerId };
  if (req.query.status) {
    where.status = req.query.status.toUpperCase();
  }

  const [orders, totalOrders] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: {
        items: true,
        timeline: true,
        user: { select: { id: true, fullName: true, phone: true, email: true } },
        deliveryPartner: { select: { id: true, name: true, phone: true, vehicleType: true, vehicleNumber: true } },
      },
    }),
    prisma.order.count({ where }),
  ]);

  const formattedOrders = orders.map((ord) => formatOrderResponse(ord, partnerId, "foodpartner"));

  res.status(200).json(
    new ApiResponse(
      200,
      {
        orders: formattedOrders,
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
 * Food Partner confirms the order.
 */
const confirmOrderByPartner = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const partnerId = req.user.id;
  const { prepTimeMinutes = 25 } = req.body;

  const order = await prisma.order.findFirst({
    where: { id, partnerId },
  });
  if (!order) {
    throw new ApiError(404, "Order not found for this restaurant");
  }

  validateTransition(order.status, "CONFIRMED", "foodpartner");

  const updatedOrder = await prisma.order.update({
    where: { id },
    data: {
      status: "CONFIRMED",
      estimatedPrepTimeMinutes: prepTimeMinutes,
      estimatedDeliveryTime: new Date(Date.now() + (prepTimeMinutes + 20) * 60 * 1000),
      timeline: {
        create: [
          {
            status: "CONFIRMED",
            note: `Order confirmed by kitchen. Prep time: ${prepTimeMinutes} mins.`,
            actorRole: "foodpartner",
            actorId: partnerId,
          },
        ],
      },
    },
    include: { items: true, timeline: true },
  });

  const formattedResp = formatOrderResponse(updatedOrder, partnerId, "foodpartner");

  // Real-time broadcast: Kitchen accepted order
  emitToUser(order.userId, "order:status_update", {
    orderId: order.id,
    status: "CONFIRMED",
    estimatedPrepTimeMinutes: prepTimeMinutes,
    order: formattedResp,
  });
  emitToOrder(order.id, "order:status_update", {
    orderId: order.id,
    status: "CONFIRMED",
    order: formattedResp,
  });

  res
    .status(200)
    .json(new ApiResponse(200, formattedResp, "Order confirmed by restaurant"));
});

/**
 * Food Partner marks the order as PREPARING.
 */
const preparingOrderByPartner = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const partnerId = req.user.id;

  const order = await prisma.order.findFirst({
    where: { id, partnerId },
  });
  if (!order) {
    throw new ApiError(404, "Order not found for this restaurant");
  }

  validateTransition(order.status, "PREPARING", "foodpartner");

  const updatedOrder = await prisma.order.update({
    where: { id },
    data: {
      status: "PREPARING",
      timeline: {
        create: [
          {
            status: "PREPARING",
            note: "Kitchen is now preparing the food",
            actorRole: "foodpartner",
            actorId: partnerId,
          },
        ],
      },
    },
    include: { items: true, timeline: true },
  });

  const formattedResp = formatOrderResponse(updatedOrder, partnerId, "foodpartner");

  // Real-time broadcast: Cooking in progress
  emitToUser(order.userId, "order:status_update", {
    orderId: order.id,
    status: "PREPARING",
    order: formattedResp,
  });
  emitToOrder(order.id, "order:status_update", {
    orderId: order.id,
    status: "PREPARING",
    order: formattedResp,
  });

  res
    .status(200)
    .json(new ApiResponse(200, formattedResp, "Order marked as preparing"));
});

/**
 * Food Partner marks the food as READY_FOR_PICKUP.
 */
const readyOrderByPartner = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const partnerId = req.user.id;

  const order = await prisma.order.findFirst({
    where: { id, partnerId },
  });
  if (!order) {
    throw new ApiError(404, "Order not found for this restaurant");
  }

  validateTransition(order.status, "READY_FOR_PICKUP", "foodpartner");

  const updatedOrder = await prisma.order.update({
    where: { id },
    data: {
      status: "READY_FOR_PICKUP",
      timeline: {
        create: [
          {
            status: "READY_FOR_PICKUP",
            note: "Food is prepared, packed, and waiting for rider pickup",
            actorRole: "foodpartner",
            actorId: partnerId,
          },
        ],
      },
    },
    include: { items: true, timeline: true },
  });

  const formattedResp = formatOrderResponse(updatedOrder, partnerId, "foodpartner");

  // Real-time broadcast: Food is packed and ready for rider pickup
  emitToUser(order.userId, "order:status_update", {
    orderId: order.id,
    status: "READY_FOR_PICKUP",
    order: formattedResp,
  });
  emitToOrder(order.id, "order:status_update", {
    orderId: order.id,
    status: "READY_FOR_PICKUP",
    order: formattedResp,
  });
  emitToOnlineRiders("order:available_for_pickup", {
    orderId: order.id,
    orderNumber: order.orderNumber,
    restaurantName: order.partner?.restaurantName,
    deliveryAddress: order.deliveryAddress,
  });

  // Automated Dispatch Engine: Match nearest idle riders within 5km & cascade offer
  autoDispatchOrder(order.id).catch((err) =>
    logger.error("Auto-dispatch invocation failed:", { error: err.message, orderId: order.id })
  );

  res
    .status(200)
    .json(new ApiResponse(200, formattedResp, "Order marked ready for pickup"));
});

/**
 * Food Partner cancels the order.
 */
const cancelOrderByPartner = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const partnerId = req.user.id;
  const { reason } = req.body;

  const order = await prisma.order.findFirst({
    where: { id, partnerId },
  });
  if (!order) {
    throw new ApiError(404, "Order not found for this restaurant");
  }

  validateTransition(order.status, "CANCELLED", "foodpartner");

  const cancellation = {
    reason,
    cancelledBy: "foodpartner",
    cancelledAt: new Date(),
    refundStatus: order.paymentStatus === "PAID" ? "PROCESSED" : "NOT_APPLICABLE",
    refundAmount: order.pricing?.grandTotal || 0,
    refundedTo: order.paymentStatus === "PAID" ? "WALLET" : undefined,
  };

  const timelineEntries = [
    {
      status: "CANCELLED",
      note: `Order cancelled by restaurant: ${reason}`,
      actorRole: "foodpartner",
      actorId: partnerId,
    },
  ];

  // If order was paid, credit instant refund to user's wallet
  if (order.paymentStatus === "PAID" && Number(order.pricing?.grandTotal || 0) > 0) {
    const refundAmount = Number(order.pricing.grandTotal);
    const refundTx = await walletService.creditWallet({
      userId: order.userId,
      amount: refundAmount,
      description: `Instant refund for cancelled Order #${order.orderNumber} (Restaurant Cancelled)`,
      orderId: order.id,
    });
    cancellation.refundTransactionId = refundTx.transaction.id;
    timelineEntries.push({
      status: "CANCELLED",
      note: `Instant refund of ₹${refundAmount} credited to customer In-App Wallet`,
      actorRole: "system",
    });
  }

  const updatedOrder = await prisma.order.update({
    where: { id },
    data: {
      status: "CANCELLED",
      paymentStatus: order.paymentStatus === "PAID" ? "REFUNDED" : order.paymentStatus,
      cancellation,
      timeline: {
        create: timelineEntries,
      },
    },
    include: { items: true, timeline: true },
  });

  const formattedResp = formatOrderResponse(updatedOrder, partnerId, "foodpartner");

  // Real-time broadcast: Restaurant cancelled order
  emitToUser(order.userId, "order:cancelled", {
    orderId: order.id,
    orderNumber: order.orderNumber,
    reason,
    cancelledBy: "foodpartner",
    refundStatus: cancellation.refundStatus,
  });
  emitToOrder(order.id, "order:status_update", {
    orderId: order.id,
    status: "CANCELLED",
    order: formattedResp,
  });

  res
    .status(200)
    .json(new ApiResponse(200, formattedResp, "Order cancelled by restaurant"));
});

// ── DELIVERY PARTNER (RIDER) CONTROLLERS ────────────────────────────────────

/**
 * Lists available orders ready for delivery pickup.
 */
const getAvailableOrdersForRider = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const skip = (page - 1) * limit;

  const where = {
    status: "READY_FOR_PICKUP",
    deliveryPartnerId: null,
  };

  const [orders, totalOrders] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy: { createdAt: "asc" },
      skip,
      take: limit,
      include: {
        items: true,
        timeline: true,
        partner: true,
        user: { select: { id: true, fullName: true, phone: true } },
      },
    }),
    prisma.order.count({ where }),
  ]);

  const formatted = orders.map((ord) => formatOrderResponse(ord, req.user.id, "deliverypartner"));

  res.status(200).json(
    new ApiResponse(
      200,
      {
        orders: formatted,
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
 * Rider claims/accepts the delivery assignment.
 */
const acceptDeliveryByRider = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const riderId = req.user.id;

  // 1. Verify rider doesn't already have an active uncompleted order
  const activeOrder = await prisma.order.findFirst({
    where: {
      deliveryPartnerId: riderId,
      status: { in: ["PICKED_UP", "OUT_FOR_DELIVERY"] },
    },
  });

  if (activeOrder) {
    throw new ApiError(
      400,
      `You already have an active order in progress (#${activeOrder.orderNumber}). Complete it before accepting a new one.`,
    );
  }

  // 2. Fetch target order
  const order = await prisma.order.findUnique({ where: { id } });
  if (!order) {
    throw new ApiError(404, "Order not found");
  }

  if (order.status !== "READY_FOR_PICKUP") {
    throw new ApiError(
      400,
      `Cannot accept order in '${order.status}' status. Must be 'READY_FOR_PICKUP'.`,
    );
  }

  if (order.deliveryPartnerId && order.deliveryPartnerId !== riderId) {
    throw new ApiError(409, "Order has already been assigned to another delivery partner");
  }

  const updatedOrder = await prisma.order.update({
    where: { id },
    data: {
      deliveryPartnerId: riderId,
      timeline: {
        create: [
          {
            status: order.status,
            note: "Delivery partner accepted the order dispatch",
            actorRole: "deliverypartner",
            actorId: riderId,
          },
        ],
      },
    },
    include: { items: true, timeline: true, partner: true },
  });

  // Update rider's current order pointer
  await prisma.deliveryPartner.update({
    where: { id: riderId },
    data: { currentOrderId: order.id },
  });

  const formattedResp = formatOrderResponse(updatedOrder, riderId, "deliverypartner");

  // Real-time broadcast: Rider assigned to order
  emitToUser(order.userId, "delivery:assigned", {
    orderId: order.id,
    riderId,
    riderName: req.user.name,
    order: formattedResp,
  });
  emitToPartner(order.partnerId, "delivery:assigned", {
    orderId: order.id,
    riderId,
    riderName: req.user.name,
  });
  emitToOrder(order.id, "order:status_update", {
    orderId: order.id,
    status: "READY_FOR_PICKUP",
    deliveryPartnerId: riderId,
    order: formattedResp,
  });

  res
    .status(200)
    .json(new ApiResponse(200, formattedResp, "Delivery dispatch accepted successfully"));
});

/**
 * Rider picks up the food from the restaurant.
 */
const pickupOrderByRider = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const riderId = req.user.id;

  const order = await prisma.order.findFirst({
    where: { id, deliveryPartnerId: riderId },
  });
  if (!order) {
    throw new ApiError(404, "Order not found or not assigned to you");
  }

  validateTransition(order.status, "PICKED_UP", "deliverypartner");

  const updatedOrder = await prisma.order.update({
    where: { id },
    data: {
      status: "PICKED_UP",
      timeline: {
        create: [
          {
            status: "PICKED_UP",
            note: "Food picked up from restaurant by delivery partner",
            actorRole: "deliverypartner",
            actorId: riderId,
          },
        ],
      },
    },
    include: { items: true, timeline: true },
  });

  const formattedResp = formatOrderResponse(updatedOrder, riderId, "deliverypartner");

  // Real-time broadcast: Rider picked up food
  emitToUser(order.userId, "order:status_update", {
    orderId: order.id,
    status: "PICKED_UP",
    order: formattedResp,
  });
  emitToOrder(order.id, "order:status_update", {
    orderId: order.id,
    status: "PICKED_UP",
    order: formattedResp,
  });

  res
    .status(200)
    .json(new ApiResponse(200, formattedResp, "Order marked as picked up"));
});

/**
 * Rider marks that they are OUT_FOR_DELIVERY towards customer.
 */
const outForDeliveryByRider = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const riderId = req.user.id;

  const order = await prisma.order.findFirst({
    where: { id, deliveryPartnerId: riderId },
  });
  if (!order) {
    throw new ApiError(404, "Order not found or not assigned to you");
  }

  validateTransition(order.status, "OUT_FOR_DELIVERY", "deliverypartner");

  const updatedOrder = await prisma.order.update({
    where: { id },
    data: {
      status: "OUT_FOR_DELIVERY",
      timeline: {
        create: [
          {
            status: "OUT_FOR_DELIVERY",
            note: "Delivery partner is en route to customer location",
            actorRole: "deliverypartner",
            actorId: riderId,
          },
        ],
      },
    },
    include: { items: true, timeline: true },
  });

  const formattedResp = formatOrderResponse(updatedOrder, riderId, "deliverypartner");

  // Real-time broadcast: Rider en route
  emitToUser(order.userId, "order:status_update", {
    orderId: order.id,
    status: "OUT_FOR_DELIVERY",
    order: formattedResp,
  });
  emitToOrder(order.id, "order:status_update", {
    orderId: order.id,
    status: "OUT_FOR_DELIVERY",
    order: formattedResp,
  });

  // Multi-Channel Dispatch: In-App notification & SMS with OTP
  Promise.all([
    prisma.user.findUnique({ where: { id: order.userId } }),
    prisma.deliveryPartner.findUnique({ where: { id: riderId } }),
  ]).then(([customerUser, riderPartner]) => {
    if (customerUser) {
      notifyOrderOutForDelivery({
        order: { ...updatedOrder, deliveryOtp: "Secure OTP" },
        user: customerUser,
        rider: riderPartner,
      }).catch((err) => logger.error("notifyOrderOutForDelivery error:", err));
    }
  }).catch((err) => logger.error("Fetch user/rider for outForDelivery notification failed:", err));

  res
    .status(200)
    .json(new ApiResponse(200, formattedResp, "Order marked out for delivery"));
});

/**
 * Rider confirms delivery by entering the 4-digit OTP provided by customer.
 */
const deliverOrderByRider = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const riderId = req.user.id;
  const { otp } = req.body;

  if (!otp) {
    throw new ApiError(400, "4-digit delivery OTP is required");
  }

  const order = await prisma.order.findFirst({
    where: { id, deliveryPartnerId: riderId },
  });

  if (!order) {
    throw new ApiError(404, "Order not found or not assigned to you");
  }

  validateTransition(order.status, "DELIVERED", "deliverypartner");

  // Verify OTP match
  const isMatch = await bcrypt.compare(String(otp), order.deliveryOtp || "");
  if (!isMatch) {
    throw new ApiError(
      400,
      "Invalid delivery OTP. Please verify the 4-digit OTP with the customer.",
    );
  }

  const updatedOrder = await prisma.order.update({
    where: { id },
    data: {
      status: "DELIVERED",
      actualDeliveryTime: new Date(),
      paymentStatus: order.paymentMethod === "COD" ? "PAID" : order.paymentStatus,
      timeline: {
        create: [
          {
            status: "DELIVERED",
            note: "Order successfully handed over and verified with delivery OTP",
            actorRole: "deliverypartner",
            actorId: riderId,
          },
        ],
      },
    },
    include: { items: true, timeline: true },
  });

  // Clear rider currentOrderId and increment delivery count
  await prisma.deliveryPartner.update({
    where: { id: riderId },
    data: {
      currentOrderId: null,
      totalDeliveries: { increment: 1 },
    },
  });

  const formattedResp = formatOrderResponse(updatedOrder, riderId, "deliverypartner");

  // Real-time broadcast: Order delivered & verified with OTP
  emitToUser(order.userId, "order:status_update", {
    orderId: order.id,
    status: "DELIVERED",
    order: formattedResp,
  });
  emitToPartner(order.partnerId, "order:delivered", {
    orderId: order.id,
    orderNumber: order.orderNumber,
  });
  emitToOrder(order.id, "order:status_update", {
    orderId: order.id,
    status: "DELIVERED",
    order: formattedResp,
  });

  // Multi-Channel Dispatch: In-App notification & delivery summary email
  prisma.user.findUnique({ where: { id: order.userId } }).then((customerUser) => {
    if (customerUser) {
      notifyOrderDelivered({
        order: updatedOrder,
        user: customerUser,
      }).catch((err) => logger.error("notifyOrderDelivered error:", err));
    }
  }).catch((err) => logger.error("Fetch user for delivered notification failed:", err));

  res
    .status(200)
    .json(new ApiResponse(200, formattedResp, "Order delivered and confirmed successfully! 🎉"));
});

/**
 * Rider marks delivery failed.
 */
const failDeliveryByRider = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const riderId = req.user.id;
  const { reason } = req.body;

  const order = await prisma.order.findFirst({
    where: { id, deliveryPartnerId: riderId },
  });
  if (!order) {
    throw new ApiError(404, "Order not found or not assigned to you");
  }

  validateTransition(order.status, "FAILED", "deliverypartner");

  const cancellation = {
    reason,
    cancelledBy: "deliverypartner",
    cancelledAt: new Date(),
  };

  const updatedOrder = await prisma.order.update({
    where: { id },
    data: {
      status: "FAILED",
      cancellation,
      timeline: {
        create: [
          {
            status: "FAILED",
            note: `Delivery failed: ${reason}`,
            actorRole: "deliverypartner",
            actorId: riderId,
          },
        ],
      },
    },
    include: { items: true, timeline: true },
  });

  await prisma.deliveryPartner.update({
    where: { id: riderId },
    data: { currentOrderId: null },
  });

  res
    .status(200)
    .json(new ApiResponse(200, formatOrderResponse(updatedOrder, riderId, "deliverypartner"), "Delivery marked as failed"));
});

// ── ADMIN CONTROLLERS ───────────────────────────────────────────────────────

/**
 * Global order stream with filters for administrator panel.
 */
const getAllOrdersAdmin = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 20;
  const skip = (page - 1) * limit;

  const where = {};
  if (req.query.status) {
    where.status = req.query.status.toUpperCase();
  }
  if (req.query.partnerId) {
    where.partnerId = req.query.partnerId;
  }
  if (req.query.userId) {
    where.userId = req.query.userId;
  }

  const [orders, totalOrders] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: {
        items: true,
        timeline: true,
        user: { select: { id: true, fullName: true, email: true, phone: true } },
        partner: { select: { id: true, name: true, restaurantName: true } },
        deliveryPartner: { select: { id: true, name: true, phone: true } },
      },
    }),
    prisma.order.count({ where }),
  ]);

  const formatted = orders.map((ord) => formatOrderResponse(ord, req.user.id, "admin"));

  res.status(200).json(
    new ApiResponse(
      200,
      {
        orders: formatted,
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
