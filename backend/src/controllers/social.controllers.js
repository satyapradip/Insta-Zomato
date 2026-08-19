const likeModel = require("../models/like.models");
const saveModel = require("../models/save.models");
const commentModel = require("../models/comment.models");
const foodModel = require("../models/food.models");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");

// ── Toggle Like on Food Reel ─────────────────────────────────────────────────
const toggleLike = asyncHandler(async (req, res) => {
  const foodId = req.params.id;
  const userId = req.user.id;

  const foodItem = await foodModel.findById(foodId);
  if (!foodItem) throw new ApiError(404, "Food item not found");

  const existingLike = await likeModel.findOne({ user: userId, food: foodId });

  if (existingLike) {
    // Unlike
    await likeModel.findByIdAndDelete(existingLike._id);
    const updatedFood = await foodModel.findByIdAndUpdate(
      foodId,
      { $inc: { likeCount: -1 } },
      { new: true },
    );
    return res.status(200).json(
      new ApiResponse(
        200,
        { isLiked: false, likeCount: Math.max(0, updatedFood.likeCount) },
        "Food reel unliked",
      ),
    );
  } else {
    // Like
    await likeModel.create({ user: userId, food: foodId });
    const updatedFood = await foodModel.findByIdAndUpdate(
      foodId,
      { $inc: { likeCount: 1 } },
      { new: true },
    );
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

  const foodItem = await foodModel.findById(foodId);
  if (!foodItem) throw new ApiError(404, "Food item not found");

  const existingSave = await saveModel.findOne({ user: userId, food: foodId });

  if (existingSave) {
    // Remove from Wishlist
    await saveModel.findByIdAndDelete(existingSave._id);
    const updatedFood = await foodModel.findByIdAndUpdate(
      foodId,
      { $inc: { saveCount: -1 } },
      { new: true },
    );
    return res.status(200).json(
      new ApiResponse(
        200,
        { isSaved: false, saveCount: Math.max(0, updatedFood.saveCount) },
        "Removed from Saved Collections",
      ),
    );
  } else {
    // Save
    await saveModel.create({
      user: userId,
      food: foodId,
      collectionName: collectionName || "Wishlist",
    });
    const updatedFood = await foodModel.findByIdAndUpdate(
      foodId,
      { $inc: { saveCount: 1 } },
      { new: true },
    );
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

  const foodItem = await foodModel.findById(foodId);
  if (!foodItem) throw new ApiError(404, "Food item not found");

  const comment = await commentModel.create({
    user: userId,
    food: foodId,
    text,
    parentComment: parentComment || null,
  });

  await foodModel.findByIdAndUpdate(foodId, { $inc: { commentCount: 1 } });

  const populatedComment = await commentModel
    .findById(comment._id)
    .populate("user", "fullName avatarUrl");

  res
    .status(201)
    .json(new ApiResponse(201, populatedComment, "Comment posted successfully"));
});

// ── Get Comments for Food Reel ───────────────────────────────────────────────
const getComments = asyncHandler(async (req, res) => {
  const foodId = req.params.id;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;

  const comments = await commentModel
    .find({ food: foodId, parentComment: null, isDeleted: false })
    .populate("user", "fullName avatarUrl")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const total = await commentModel.countDocuments({
    food: foodId,
    parentComment: null,
    isDeleted: false,
  });

  res.status(200).json(
    new ApiResponse(
      200,
      {
        comments,
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
  const likes = await likeModel
    .find({ user: userId })
    .populate({
      path: "food",
      populate: { path: "foodPartner", select: "name restaurantName logo" },
    })
    .sort({ createdAt: -1 });

  res.status(200).json(
    new ApiResponse(
      200,
      likes.map((l) => l.food).filter(Boolean),
      "Liked reels fetched successfully",
    ),
  );
});

// ── Get User's Saved Reels ───────────────────────────────────────────────────
const getUserSaved = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const saves = await saveModel
    .find({ user: userId })
    .populate({
      path: "food",
      populate: { path: "foodPartner", select: "name restaurantName logo" },
    })
    .sort({ createdAt: -1 });

  res.status(200).json(
    new ApiResponse(
      200,
      saves.map((s) => s.food).filter(Boolean),
      "Saved reels fetched successfully",
    ),
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
