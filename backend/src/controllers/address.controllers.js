const { prisma } = require("../db/prisma");
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
    await prisma.address.updateMany({
      where: { userId },
      data: { isDefault: false },
    });
  }

  const address = await prisma.address.create({
    data: {
      userId,
      label,
      recipientName: recipientName || req.user.fullName || "",
      street,
      landmark,
      city,
      state,
      pincode,
      longitude: coordinates && Array.isArray(coordinates) ? coordinates[0] : 77.5946,
      latitude: coordinates && Array.isArray(coordinates) ? coordinates[1] : 12.9716,
      contactPhone: contactPhone || req.user.phone || "",
      isDefault: Boolean(isDefault),
    },
  });

  const responseObj = {
    ...address,
    _id: address.id,
    coordinates: { type: "Point", coordinates: [address.longitude, address.latitude] },
  };

  res
    .status(201)
    .json(new ApiResponse(201, responseObj, "Address added successfully"));
});

/**
 * Get all addresses for the logged-in user
 */
const getUserAddresses = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const addresses = await prisma.address.findMany({
    where: { userId },
    orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
  });

  const formattedAddresses = addresses.map((addr) => ({
    ...addr,
    _id: addr.id,
    coordinates: { type: "Point", coordinates: [addr.longitude, addr.latitude] },
  }));

  res
    .status(200)
    .json(new ApiResponse(200, formattedAddresses, "Addresses fetched successfully"));
});

/**
 * Delete an address
 */
const deleteAddress = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;

  const address = await prisma.address.findFirst({
    where: { id, userId },
  });

  if (!address) {
    throw new ApiError(404, "Address not found");
  }

  await prisma.address.delete({
    where: { id: address.id },
  });

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

  const address = await prisma.address.findFirst({
    where: { id, userId },
  });

  if (!address) {
    throw new ApiError(404, "Address not found");
  }

  await prisma.address.updateMany({
    where: { userId },
    data: { isDefault: false },
  });

  const updatedAddress = await prisma.address.update({
    where: { id },
    data: { isDefault: true },
  });

  const responseObj = {
    ...updatedAddress,
    _id: updatedAddress.id,
    coordinates: { type: "Point", coordinates: [updatedAddress.longitude, updatedAddress.latitude] },
  };

  res
    .status(200)
    .json(new ApiResponse(200, responseObj, "Default address updated"));
});

module.exports = {
  addAddress,
  getUserAddresses,
  deleteAddress,
  setDefaultAddress,
};
