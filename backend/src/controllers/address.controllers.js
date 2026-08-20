const addressModel = require("../models/address.models");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");

/**
 * Add a new delivery address
 */
const addAddress = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const {
    label = "Home",
    recipientName,
    street,
    landmark = "",
    city,
    state,
    pincode,
    coordinates,
    contactPhone,
    isDefault = false,
  } = req.body;

  if (isDefault) {
    await addressModel.updateMany({ user: userId }, { isDefault: false });
  }

  const address = await addressModel.create({
    user: userId,
    label,
    recipientName: recipientName || req.user.fullName || "",
    street,
    landmark,
    city,
    state,
    pincode,
    coordinates: coordinates ? { type: "Point", coordinates } : undefined,
    contactPhone: contactPhone || req.user.phone || "",
    isDefault,
  });

  res
    .status(201)
    .json(new ApiResponse(201, address, "Address added successfully"));
});

/**
 * Get all addresses for the logged-in user
 */
const getUserAddresses = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const addresses = await addressModel
    .find({ user: userId })
    .sort({ isDefault: -1, createdAt: -1 });

  res
    .status(200)
    .json(new ApiResponse(200, addresses, "Addresses fetched successfully"));
});

/**
 * Delete an address
 */
const deleteAddress = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;

  const address = await addressModel.findOneAndDelete({
    _id: id,
    user: userId,
  });

  if (!address) {
    throw new ApiError(404, "Address not found");
  }

  res
    .status(200)
    .json(new ApiResponse(200, null, "Address deleted successfully"));
});

/**
 * Set an address as default
 */
const setDefaultAddress = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;

  await addressModel.updateMany({ user: userId }, { isDefault: false });

  const address = await addressModel.findOneAndUpdate(
    { _id: id, user: userId },
    { isDefault: true },
    { new: true },
  );

  if (!address) {
    throw new ApiError(404, "Address not found");
  }

  res
    .status(200)
    .json(new ApiResponse(200, address, "Default address updated"));
});

module.exports = {
  addAddress,
  getUserAddresses,
  deleteAddress,
  setDefaultAddress,
};
