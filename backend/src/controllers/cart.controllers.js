const { prisma } = require("../db/prisma");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Recalculates subtotal, taxes (5% GST), platform fee, tip, discount, and grand total.
 */
function computeCartPricing(items = [], appliedCoupon = null, tipAmount = 0) {
  if (!items || items.length === 0) {
    return {
      subtotal: 0,
      deliveryFee: 0,
      platformFee: 0,
      taxes: 0,
      discountAmount: 0,
      grandTotal: 0,
    };
  }

  let subtotal = 0;
  items.forEach((item) => {
    subtotal += item.unitPrice * item.quantity;
  });

  const deliveryFee = 30; // ₹30 base delivery
  const platformFee = 5;  // ₹5 platform service fee
  const taxes = Math.round(subtotal * 0.05 * 100) / 100; // 5% GST

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
    grandTotal: Math.round(grandTotal * 100) / 100,
  };
}

function formatCartResponse(cart) {
  if (!cart) return null;
  const pricing = computeCartPricing(cart.items, cart.appliedCoupon, cart.tipAmount);
  return {
    ...cart,
    _id: cart.id,
    pricing,
    items: (cart.items || []).map((item) => ({
      ...item,
      _id: item.id,
      food: item.foodId,
    })),
    partner: cart.partner
      ? {
          ...cart.partner,
          _id: cart.partner.id,
          location: {
            type: "Point",
            coordinates: [cart.partner.longitude, cart.partner.latitude],
          },
        }
      : null,
  };
}

// ── Get Active Cart ──────────────────────────────────────────────────────────
const getCart = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  let cart = await prisma.cart.findUnique({
    where: { userId },
    include: {
      items: true,
      partner: {
        select: {
          id: true,
          name: true,
          restaurantName: true,
          logo: true,
          latitude: true,
          longitude: true,
          avgRating: true,
          isOpen: true,
        },
      },
    },
  });

  if (!cart) {
    cart = await prisma.cart.create({
      data: {
        userId,
        pricing: { subtotal: 0, deliveryFee: 0, platformFee: 0, taxes: 0, discountAmount: 0, grandTotal: 0 },
      },
      include: {
        items: true,
        partner: true,
      },
    });
  }

  res
    .status(200)
    .json(new ApiResponse(200, formatCartResponse(cart), "Cart fetched successfully"));
});

// ── Add Item to Cart (with Single-Restaurant Lock) ───────────────────────────
const addToCart = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const {
    foodId,
    quantity = 1,
    selectedVariant,
    selectedAddOns = [],
    forceClear = false,
  } = req.body;

  const food = await prisma.food.findUnique({
    where: { id: foodId },
    include: { foodPartner: true },
  });
  if (!food) throw new ApiError(404, "Food dish not found");
  if (!food.isAvailable) throw new ApiError(400, "This dish is currently out of stock");

  let cart = await prisma.cart.findUnique({
    where: { userId },
    include: { items: true },
  });

  if (!cart) {
    cart = await prisma.cart.create({
      data: { userId },
      include: { items: true },
    });
  }

  const incomingPartnerId = food.foodPartnerId;

  // ── Single-Restaurant Constraint Check ──
  if (
    cart.partnerId &&
    cart.items.length > 0 &&
    cart.partnerId !== incomingPartnerId
  ) {
    if (!forceClear) {
      const currentPartner = await prisma.foodPartner.findUnique({
        where: { id: cart.partnerId },
      });
      return res.status(409).json(
        new ApiResponse(
          409,
          {
            requiresClearConfirmation: true,
            currentPartner: {
              id: currentPartner?.id,
              _id: currentPartner?.id,
              name: currentPartner?.restaurantName || currentPartner?.name,
            },
            newPartner: {
              id: food.foodPartner.id,
              _id: food.foodPartner.id,
              name: food.foodPartner.restaurantName || food.foodPartner.name,
            },
          },
          `Your cart contains items from "${currentPartner?.restaurantName || 'another restaurant'}". Would you like to clear your cart and start fresh with "${food.foodPartner.restaurantName || food.foodPartner.name}"?`,
        ),
      );
    } else {
      // User confirmed replacing cart items
      await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
      await prisma.cart.update({
        where: { id: cart.id },
        data: { partnerId: incomingPartnerId, appliedCoupon: null },
      });
    }
  }

  // Compute item unit price based on variant and add-ons
  let unitPrice = food.price;
  if (selectedVariant && selectedVariant.price) {
    unitPrice = Number(selectedVariant.price);
  }

  if (selectedAddOns && Array.isArray(selectedAddOns)) {
    const addOnsTotal = selectedAddOns.reduce(
      (sum, addon) => sum + (Number(addon.price) || 0),
      0,
    );
    unitPrice += addOnsTotal;
  }

  // Check if identical item already exists in cart
  const currentItems = await prisma.cartItem.findMany({ where: { cartId: cart.id } });
  const existingItem = currentItems.find((item) => {
    const isSameFood = item.foodId === foodId;
    const isSameVariant =
      (item.selectedVariant?.name || "") === (selectedVariant?.name || "");
    const isSameAddOns =
      JSON.stringify(item.selectedAddOns || []) === JSON.stringify(selectedAddOns || []);
    return isSameFood && isSameVariant && isSameAddOns;
  });

  if (existingItem) {
    const updatedQty = existingItem.quantity + Number(quantity);
    await prisma.cartItem.update({
      where: { id: existingItem.id },
      data: {
        quantity: updatedQty,
        itemTotal: unitPrice * updatedQty,
      },
    });
  } else {
    await prisma.cartItem.create({
      data: {
        cartId: cart.id,
        foodId: food.id,
        name: food.name,
        thumbnailUrl: food.thumbnailUrl || "",
        isVeg: food.isVeg,
        selectedVariant: selectedVariant || undefined,
        selectedAddOns: selectedAddOns || [],
        unitPrice,
        quantity: Number(quantity),
        itemTotal: unitPrice * Number(quantity),
      },
    });
  }

  // Ensure partnerId is set
  await prisma.cart.update({
    where: { id: cart.id },
    data: { partnerId: incomingPartnerId },
  });

  const updatedCart = await prisma.cart.findUnique({
    where: { id: cart.id },
    include: {
      items: true,
      partner: {
        select: {
          id: true,
          name: true,
          restaurantName: true,
          logo: true,
          latitude: true,
          longitude: true,
          avgRating: true,
          isOpen: true,
        },
      },
    },
  });

  res
    .status(200)
    .json(new ApiResponse(200, formatCartResponse(updatedCart), "Item added to cart successfully"));
});

// ── Update Item Quantity ─────────────────────────────────────────────────────
const updateCartItemQuantity = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { itemId } = req.params;
  const { quantity } = req.body;

  const cart = await prisma.cart.findUnique({ where: { userId } });
  if (!cart) throw new ApiError(404, "Cart not found");

  const item = await prisma.cartItem.findFirst({
    where: { id: itemId, cartId: cart.id },
  });
  if (!item) throw new ApiError(404, "Item not found in cart");

  if (Number(quantity) <= 0) {
    await prisma.cartItem.delete({ where: { id: item.id } });
  } else {
    await prisma.cartItem.update({
      where: { id: item.id },
      data: {
        quantity: Number(quantity),
        itemTotal: item.unitPrice * Number(quantity),
      },
    });
  }

  const updatedCart = await prisma.cart.findUnique({
    where: { id: cart.id },
    include: {
      items: true,
      partner: {
        select: {
          id: true,
          name: true,
          restaurantName: true,
          logo: true,
          latitude: true,
          longitude: true,
          avgRating: true,
          isOpen: true,
        },
      },
    },
  });

  res
    .status(200)
    .json(new ApiResponse(200, formatCartResponse(updatedCart), "Cart updated successfully"));
});

// ── Remove Single Item ───────────────────────────────────────────────────────
const removeCartItem = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { itemId } = req.params;

  const cart = await prisma.cart.findUnique({ where: { userId } });
  if (!cart) throw new ApiError(404, "Cart not found");

  await prisma.cartItem.deleteMany({
    where: { id: itemId, cartId: cart.id },
  });

  const updatedCart = await prisma.cart.findUnique({
    where: { id: cart.id },
    include: {
      items: true,
      partner: {
        select: {
          id: true,
          name: true,
          restaurantName: true,
          logo: true,
          latitude: true,
          longitude: true,
          avgRating: true,
          isOpen: true,
        },
      },
    },
  });

  res
    .status(200)
    .json(new ApiResponse(200, formatCartResponse(updatedCart), "Item removed from cart"));
});

// ── Clear Entire Cart ────────────────────────────────────────────────────────
const clearCart = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const cart = await prisma.cart.findUnique({ where: { userId } });
  if (cart) {
    await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
    await prisma.cart.update({
      where: { id: cart.id },
      data: {
        partnerId: null,
        appliedCoupon: null,
        pricing: { subtotal: 0, deliveryFee: 0, platformFee: 0, taxes: 0, discountAmount: 0, grandTotal: 0 },
      },
    });
  }

  const updatedCart = await prisma.cart.findUnique({
    where: { userId },
    include: { items: true, partner: true },
  });

  res
    .status(200)
    .json(new ApiResponse(200, formatCartResponse(updatedCart), "Cart cleared successfully"));
});

// ── Apply Coupon Code ────────────────────────────────────────────────────────
const applyCoupon = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { code } = req.body;

  const cart = await prisma.cart.findUnique({
    where: { userId },
    include: { items: true },
  });

  if (!cart || cart.items.length === 0) {
    throw new ApiError(400, "Cart is empty. Add items before applying coupon.");
  }

  const coupon = await prisma.coupon.findUnique({
    where: { code: code.trim().toUpperCase() },
  });

  if (!coupon || !coupon.isActive) throw new ApiError(404, "Invalid or inactive coupon code");
  if (coupon.expiresAt && new Date() > coupon.expiresAt) throw new ApiError(400, "Coupon has expired");

  const pricing = computeCartPricing(cart.items, null, cart.tipAmount);
  if (pricing.subtotal < coupon.minOrderValue) {
    throw new ApiError(
      400,
      `Minimum order value of ₹${coupon.minOrderValue} required for this coupon`,
    );
  }

  // Calculate discount
  let discountAmount = 0;
  if (coupon.type === "percent") {
    discountAmount = (pricing.subtotal * coupon.value) / 100;
    if (coupon.maxDiscount) discountAmount = Math.min(discountAmount, coupon.maxDiscount);
  } else {
    discountAmount = coupon.value;
  }

  const appliedCoupon = {
    couponId: coupon.id,
    code: coupon.code,
    discountAmount: Math.round(discountAmount * 100) / 100,
  };

  const updatedCart = await prisma.cart.update({
    where: { id: cart.id },
    data: { appliedCoupon },
    include: {
      items: true,
      partner: {
        select: {
          id: true,
          name: true,
          restaurantName: true,
          logo: true,
          latitude: true,
          longitude: true,
          avgRating: true,
          isOpen: true,
        },
      },
    },
  });

  res.status(200).json(
    new ApiResponse(
      200,
      formatCartResponse(updatedCart),
      `Coupon ${coupon.code} applied! Saved ₹${appliedCoupon.discountAmount} 🎉`,
    ),
  );
});

// ── Remove Coupon ────────────────────────────────────────────────────────────
const removeCoupon = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const cart = await prisma.cart.findUnique({ where: { userId } });
  if (!cart) throw new ApiError(404, "Cart not found");

  const updatedCart = await prisma.cart.update({
    where: { id: cart.id },
    data: { appliedCoupon: null },
    include: {
      items: true,
      partner: {
        select: {
          id: true,
          name: true,
          restaurantName: true,
          logo: true,
          latitude: true,
          longitude: true,
          avgRating: true,
          isOpen: true,
        },
      },
    },
  });

  res
    .status(200)
    .json(new ApiResponse(200, formatCartResponse(updatedCart), "Coupon removed successfully"));
});

// ── Update Delivery Instructions & Tip ───────────────────────────────────────
const updateInstructionsAndTip = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { instructions, tipAmount } = req.body;

  const cart = await prisma.cart.findUnique({ where: { userId } });
  if (!cart) throw new ApiError(404, "Cart not found");

  const data = {};
  if (instructions && Array.isArray(instructions)) {
    data.deliveryInstructions = instructions;
  }
  if (tipAmount !== undefined) {
    data.tipAmount = Math.max(0, Number(tipAmount));
  }

  const updatedCart = await prisma.cart.update({
    where: { id: cart.id },
    data,
    include: {
      items: true,
      partner: {
        select: {
          id: true,
          name: true,
          restaurantName: true,
          logo: true,
          latitude: true,
          longitude: true,
          avgRating: true,
          isOpen: true,
        },
      },
    },
  });

  res
    .status(200)
    .json(new ApiResponse(200, formatCartResponse(updatedCart), "Delivery instructions updated"));
});

module.exports = {
  getCart,
  addToCart,
  updateCartItemQuantity,
  removeCartItem,
  clearCart,
  applyCoupon,
  removeCoupon,
  updateInstructionsAndTip,
};
