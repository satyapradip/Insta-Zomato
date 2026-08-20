const { prisma } = require("../db/prisma");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");

// ── Toggle Like on Food Reel ─────────────────────────────────────────────────
const toggleLike = asyncHandler(async (req, res) => {
  const foodId = req.params.id;
  const userId = req.user.id;

  const foodItem = await prisma.food.findUnique({
    where: { id: foodId },
  });
  if (!foodItem) throw new ApiError(404, "Food item not found");

  const existingLike = await prisma.like.findUnique({
    where: {
      userId_foodId: {
        userId,
        foodId,
      },
    },
  });

  if (existingLike) {
    // Unlike
    await prisma.like.delete({
      where: { id: existingLike.id },
    });
    const updatedFood = await prisma.food.update({
      where: { id: foodId },
      data: { likeCount: { decrement: 1 } },
    });
    return res.status(200).json(
      new ApiResponse(
        200,
        { isLiked: false, likeCount: Math.max(0, updatedFood.likeCount) },
        "Food reel unliked",
      ),
    );
  } else {
    // Like
    await prisma.like.create({
      data: { userId, foodId },
    });
    const updatedFood = await prisma.food.update({
      where: { id: foodId },
      data: { likeCount: { increment: 1 } },
    });
    return res.status(200).json(
      new ApiResponse(
        200,
        { isLiked: true, likeCount: updatedFood.likeCount },
        "Food reel liked ❤️",
      ),
    );
  }
});

// ── Toggle Save / Bookmark ───────────────────────────────────────────────────
const toggleSave = asyncHandler(async (req, res) => {
  const foodId = req.params.id;
  const userId = req.user.id;
  const { collectionName } = req.body;

  const foodItem = await prisma.food.findUnique({
    where: { id: foodId },
  });
  if (!foodItem) throw new ApiError(404, "Food item not found");

  const existingSave = await prisma.save.findUnique({
    where: {
      userId_foodId: {
        userId,
        foodId,
      },
    },
  });

  if (existingSave) {
    // Remove from Wishlist
    await prisma.save.delete({
      where: { id: existingSave.id },
    });
    const updatedFood = await prisma.food.update({
      where: { id: foodId },
      data: { saveCount: { decrement: 1 } },
    });
    return res.status(200).json(
      new ApiResponse(
        200,
        { isSaved: false, saveCount: Math.max(0, updatedFood.saveCount) },
        "Removed from Saved Collections",
      ),
    );
  } else {
    // Save
    await prisma.save.create({
      data: {
        userId,
        foodId,
        collection: collectionName || "Wishlist",
      },
    });
    const updatedFood = await prisma.food.update({
      where: { id: foodId },
      data: { saveCount: { increment: 1 } },
    });
    return res.status(200).json(
      new ApiResponse(
        200,
        { isSaved: true, saveCount: updatedFood.saveCount },
        "Saved to your Cravings Wishlist 🔖",
      ),
    );
  }
});

// ── Add Comment to Food Reel ─────────────────────────────────────────────────
const addComment = asyncHandler(async (req, res) => {
  const foodId = req.params.id;
  const userId = req.user.id;
  const { text, parentComment } = req.body;

  const foodItem = await prisma.food.findUnique({
    where: { id: foodId },
  });
  if (!foodItem) throw new ApiError(404, "Food item not found");

  const comment = await prisma.comment.create({
    data: {
      userId,
      foodId,
      text,
      parentId: parentComment || null,
    },
    include: {
      user: {
        select: {
          id: true,
          fullName: true,
          avatarUrl: true,
        },
      },
    },
  });

  await prisma.food.update({
    where: { id: foodId },
    data: { commentCount: { increment: 1 } },
  });

  const responseObj = {
    ...comment,
    _id: comment.id,
    user: { ...comment.user, _id: comment.user.id },
  };

  res
    .status(201)
    .json(new ApiResponse(201, responseObj, "Comment posted successfully"));
});

// ── Get Comments for Food Reel ───────────────────────────────────────────────
const getComments = asyncHandler(async (req, res) => {
  const foodId = req.params.id;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;

  const [comments, total] = await Promise.all([
    prisma.comment.findMany({
      where: { foodId, parentId: null, isDeleted: false },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.comment.count({
      where: { foodId, parentId: null, isDeleted: false },
    }),
  ]);

  const formattedComments = comments.map((c) => ({
    ...c,
    _id: c.id,
    user: { ...c.user, _id: c.user.id },
  }));

  res.status(200).json(
    new ApiResponse(
      200,
      {
        comments: formattedComments,
        pagination: {
          page,
          limit,
          total,
          hasMore: skip + comments.length < total,
        },
      },
      "Comments fetched successfully",
    ),
  );
});

// ── Get User's Liked Reels ───────────────────────────────────────────────────
const getUserLikes = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const likes = await prisma.like.findMany({
    where: { userId },
    include: {
      food: {
        include: {
          foodPartner: {
            select: { id: true, name: true, restaurantName: true, logo: true },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const foods = likes.map((l) => ({
    ...l.food,
    _id: l.food.id,
    foodPartner: l.food.foodPartner
      ? { ...l.food.foodPartner, _id: l.food.foodPartner.id }
      : null,
  }));

  res.status(200).json(
    new ApiResponse(200, foods, "Liked reels fetched successfully"),
  );
});

// ── Get User's Saved Reels ───────────────────────────────────────────────────
const getUserSaved = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const saves = await prisma.save.findMany({
    where: { userId },
    include: {
      food: {
        include: {
          foodPartner: {
            select: { id: true, name: true, restaurantName: true, logo: true },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const foods = saves.map((s) => ({
    ...s.food,
    _id: s.food.id,
    foodPartner: s.food.foodPartner
      ? { ...s.food.foodPartner, _id: s.food.foodPartner.id }
      : null,
  }));

  res.status(200).json(
    new ApiResponse(200, foods, "Saved reels fetched successfully"),
  );
});

module.exports = {
  toggleLike,
  toggleSave,
  addComment,
  getComments,
  getUserLikes,
  getUserSaved,
};
