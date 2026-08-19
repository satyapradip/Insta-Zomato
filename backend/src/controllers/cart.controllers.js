const cartModel = require("../models/cart.models");
const foodModel = require("../models/food.models");
const couponModel = require("../models/coupon.models");
const foodPartnerModel = require("../models/foodpartner.models");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Recalculates subtotal, taxes (5% GST), platform fee, tip, discount, and grand total.
 */
function recalculateCartTotals(cart) {
  if (!cart.items || cart.items.length === 0) {
    cart.partner = null;
    cart.appliedCoupon = undefined;
    cart.pricing = {
      subtotal: 0,
      deliveryFee: 0,
      platformFee: 0,
      taxes: 0,
      discountAmount: 0,
      grandTotal: 0,
    };
    return;
  }

  // 1. Subtotal
  let subtotal = 0;
  cart.items.forEach((item) => {
    item.itemTotal = item.unitPrice * item.quantity;
    subtotal += item.itemTotal;
  });

  // 2. Fixed Fees
  const deliveryFee = 30; // ₹30 base delivery
  const platformFee = 5;  // ₹5 platform service fee
  const taxes = Math.round(subtotal * 0.05 * 100) / 100; // 5% GST

  // 3. Discount calculation
  let discountAmount = 0;
  if (cart.appliedCoupon && cart.appliedCoupon.discountAmount) {
    discountAmount = Math.min(cart.appliedCoupon.discountAmount, subtotal);
  }

  // 4. Tip
  const tipAmount = cart.tipAmount || 0;

  // 5. Grand Total
  const grandTotal = Math.max(
    0,
    subtotal + deliveryFee + platformFee + taxes + tipAmount - discountAmount,
  );

  cart.pricing = {
    subtotal: Math.round(subtotal * 100) / 100,
    deliveryFee,
    platformFee,
    taxes,
    discountAmount: Math.round(discountAmount * 100) / 100,
    grandTotal: Math.round(grandTotal * 100) / 100,
  };
}

// ── Get Active Cart ──────────────────────────────────────────────────────────
const getCart = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  let cart = await cartModel
    .findOne({ user: userId })
    .populate("partner", "name restaurantName logo location avgRating isOpen");

  if (!cart) {
    cart = await cartModel.create({
      user: userId,
      items: [],
      pricing: { subtotal: 0, deliveryFee: 0, platformFee: 0, taxes: 0, discountAmount: 0, grandTotal: 0 },
    });
  } else {
    // Fresh recalculation to ensure consistency
    recalculateCartTotals(cart);
    await cart.save();
  }

  res
    .status(200)
    .json(new ApiResponse(200, cart, "Cart fetched successfully"));
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

  const food = await foodModel.findById(foodId).populate("foodPartner");
  if (!food) throw new ApiError(404, "Food dish not found");
  if (!food.isAvailable) throw new ApiError(400, "This dish is currently out of stock");

  let cart = await cartModel.findOne({ user: userId });
  if (!cart) {
    cart = new cartModel({ user: userId, items: [] });
  }

  const incomingPartnerId = food.foodPartner._id.toString();

  // ── Single-Restaurant Constraint Check ──
  if (
    cart.partner &&
    cart.items.length > 0 &&
    cart.partner.toString() !== incomingPartnerId
  ) {
    if (!forceClear) {
      const currentPartner = await foodPartnerModel.findById(cart.partner);
      return res.status(409).json(
        new ApiResponse(
          409,
          {
            requiresClearConfirmation: true,
            currentPartner: {
              id: currentPartner?._id,
              name: currentPartner?.restaurantName || currentPartner?.name,
            },
            newPartner: {
              id: food.foodPartner._id,
              name: food.foodPartner.restaurantName || food.foodPartner.name,
            },
          },
          `Your cart contains items from "${currentPartner?.restaurantName || 'another restaurant'}". Would you like to clear your cart and start fresh with "${food.foodPartner.restaurantName || food.foodPartner.name}"?`,
        ),
      );
    } else {
      // User confirmed replacing cart items
      cart.items = [];
      cart.appliedCoupon = undefined;
    }
  }

  // Set active partner
  cart.partner = food.foodPartner._id;

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

  // Check if identical item (same dish, same variant, same addons) already exists
  const existingItemIndex = cart.items.findIndex((item) => {
    const isSameFood = item.food.toString() === foodId.toString();
    const isSameVariant =
      (item.selectedVariant?.name || "") === (selectedVariant?.name || "");
    const isSameAddOns =
      JSON.stringify(item.selectedAddOns?.map((a) => a.name).sort()) ===
      JSON.stringify(selectedAddOns?.map((a) => a.name).sort());
    return isSameFood && isSameVariant && isSameAddOns;
  });

  if (existingItemIndex > -1) {
    cart.items[existingItemIndex].quantity += Number(quantity);
    cart.items[existingItemIndex].itemTotal =
      cart.items[existingItemIndex].unitPrice * cart.items[existingItemIndex].quantity;
  } else {
    cart.items.push({
      food: food._id,
      name: food.name,
      thumbnailUrl: food.thumbnailUrl || "",
      isVeg: food.isVeg,
      selectedVariant: selectedVariant || undefined,
      selectedAddOns: selectedAddOns || [],
      unitPrice,
      quantity: Number(quantity),
      itemTotal: unitPrice * Number(quantity),
    });
  }

  recalculateCartTotals(cart);
  await cart.save();

  // Populate partner details for UI
  await cart.populate("partner", "name restaurantName logo location avgRating isOpen");

  res
    .status(200)
    .json(new ApiResponse(200, cart, "Item added to cart successfully"));
});

// ── Update Item Quantity ─────────────────────────────────────────────────────
const updateCartItemQuantity = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { itemId } = req.params;
  const { quantity } = req.body;

  const cart = await cartModel.findOne({ user: userId });
  if (!cart) throw new ApiError(404, "Cart not found");

  const itemIndex = cart.items.findIndex(
    (item) => item._id.toString() === itemId.toString(),
  );
  if (itemIndex === -1) throw new ApiError(404, "Item not found in cart");

  if (Number(quantity) <= 0) {
    // Remove item
    cart.items.splice(itemIndex, 1);
  } else {
    cart.items[itemIndex].quantity = Number(quantity);
    cart.items[itemIndex].itemTotal =
      cart.items[itemIndex].unitPrice * Number(quantity);
  }

  recalculateCartTotals(cart);
  await cart.save();
  await cart.populate("partner", "name restaurantName logo location avgRating isOpen");

  res
    .status(200)
    .json(new ApiResponse(200, cart, "Cart updated successfully"));
});

// ── Remove Single Item ───────────────────────────────────────────────────────
const removeCartItem = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { itemId } = req.params;

  const cart = await cartModel.findOne({ user: userId });
  if (!cart) throw new ApiError(404, "Cart not found");

  cart.items = cart.items.filter(
    (item) => item._id.toString() !== itemId.toString(),
  );

  recalculateCartTotals(cart);
  await cart.save();
  await cart.populate("partner", "name restaurantName logo location avgRating isOpen");

  res
    .status(200)
    .json(new ApiResponse(200, cart, "Item removed from cart"));
});

// ── Clear Entire Cart ────────────────────────────────────────────────────────
const clearCart = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const cart = await cartModel.findOne({ user: userId });
  if (cart) {
    cart.items = [];
    cart.partner = null;
    cart.appliedCoupon = undefined;
    recalculateCartTotals(cart);
    await cart.save();
  }

  res
    .status(200)
    .json(new ApiResponse(200, cart, "Cart cleared successfully"));
});

// ── Apply Coupon Code ────────────────────────────────────────────────────────
const applyCoupon = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { code } = req.body;

  const cart = await cartModel.findOne({ user: userId });
  if (!cart || cart.items.length === 0) {
    throw new ApiError(400, "Cart is empty. Add items before applying coupon.");
  }

  const coupon = await couponModel.findOne({
    code: code.trim().toUpperCase(),
    isActive: true,
  });

  if (!coupon) throw new ApiError(404, "Invalid or inactive coupon code");
  if (new Date() > coupon.expiresAt) throw new ApiError(400, "Coupon has expired");

  if (cart.pricing.subtotal < coupon.minOrderValue) {
    throw new ApiError(
      400,
      `Minimum order value of ₹${coupon.minOrderValue} required for this coupon`,
    );
  }

  // Calculate discount
  let discountAmount = 0;
  if (coupon.discountType === "PERCENTAGE") {
    discountAmount = (cart.pricing.subtotal * coupon.discountValue) / 100;
    discountAmount = Math.min(discountAmount, coupon.maxDiscount);
  } else {
    discountAmount = coupon.discountValue;
  }

  cart.appliedCoupon = {
    couponId: coupon._id,
    code: coupon.code,
    discountAmount: Math.round(discountAmount * 100) / 100,
  };

  recalculateCartTotals(cart);
  await cart.save();
  await cart.populate("partner", "name restaurantName logo location avgRating isOpen");

  res.status(200).json(
    new ApiResponse(
      200,
      cart,
      `Coupon ${coupon.code} applied! Saved ₹${cart.pricing.discountAmount} 🎉`,
    ),
  );
});

// ── Remove Coupon ────────────────────────────────────────────────────────────
const removeCoupon = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const cart = await cartModel.findOne({ user: userId });
  if (!cart) throw new ApiError(404, "Cart not found");

  cart.appliedCoupon = undefined;
  recalculateCartTotals(cart);
  await cart.save();
  await cart.populate("partner", "name restaurantName logo location avgRating isOpen");

  res
    .status(200)
    .json(new ApiResponse(200, cart, "Coupon removed successfully"));
});

// ── Update Delivery Instructions & Tip ───────────────────────────────────────
const updateInstructionsAndTip = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { instructions, tipAmount } = req.body;

  const cart = await cartModel.findOne({ user: userId });
  if (!cart) throw new ApiError(404, "Cart not found");

  if (instructions && Array.isArray(instructions)) {
    cart.deliveryInstructions = instructions;
  }

  if (tipAmount !== undefined) {
    cart.tipAmount = Math.max(0, Number(tipAmount));
  }

  recalculateCartTotals(cart);
  await cart.save();
  await cart.populate("partner", "name restaurantName logo location avgRating isOpen");

  res
    .status(200)
    .json(new ApiResponse(200, cart, "Delivery instructions updated"));
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
