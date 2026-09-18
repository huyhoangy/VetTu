const mongoose = require('mongoose');
const CookingHistory = require('../models/CookingHistory');
const Recipe = require('../models/Recipe');
const User = require('../models/User');

// @desc    Record a new cooked recipe in cooking history
// @route   POST /api/cooking-history
// @access  Public / Private
const recordCookingHistory = async (req, res, next) => {
  try {
    const currentUserId = req.user?._id || req.user?.id || req.body?.userId;
    const { recipeId, title, rating, notes, servingsCooked } = req.body;

    if (!currentUserId) {
      return res.status(400).json({ success: false, message: 'Thiếu thông tin người dùng' });
    }

    const user = await User.findById(currentUserId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng' });
    }

    let recipe = null;
    if (recipeId && mongoose.Types.ObjectId.isValid(recipeId)) {
      recipe = await Recipe.findById(recipeId);
    }

    // Fallback by title if ID is not found
    if (!recipe && title) {
      recipe = await Recipe.findOne({ title });
    }

    if (!recipe) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy thông tin món ăn' });
    }

    const snapshot = {
      title: recipe.title,
      imageUrl: recipe.imageUrl || '',
      prepTimeMinutes: recipe.prepTimeMinutes || 0,
      cookTimeMinutes: recipe.cookTimeMinutes || 0,
      difficulty: recipe.difficulty || 'EASY',
      servings: recipe.servings || 2,
    };

    const newHistory = await CookingHistory.create({
      user: currentUserId,
      recipe: recipe._id,
      recipeSnapshot: snapshot,
      rating: rating !== undefined ? Number(rating) : 5,
      notes: notes || '',
      servingsCooked: servingsCooked ? Number(servingsCooked) : (recipe.servings || 2),
      cookedAt: new Date(),
    });

    // Count total cooked
    const totalCount = await CookingHistory.countDocuments({ user: currentUserId });

    return res.status(201).json({
      success: true,
      data: newHistory,
      totalCooked: totalCount,
      message: `Đã lưu món "${recipe.title}" vào lịch sử nấu ăn! 🎉`,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get cooking history and statistics for user
// @route   GET /api/cooking-history
// @access  Public / Private
const getCookingHistory = async (req, res, next) => {
  try {
    const currentUserId = req.user?._id || req.user?.id || req.query.userId;
    const { q, minRating } = req.query;

    if (!currentUserId) {
      return res.status(400).json({ success: false, message: 'Thiếu thông tin người dùng' });
    }

    let query = { user: currentUserId };

    if (minRating) {
      query.rating = { $gte: Number(minRating) };
    }

    if (q) {
      query.$or = [
        { 'recipeSnapshot.title': { $regex: q, $options: 'i' } },
        { notes: { $regex: q, $options: 'i' } },
      ];
    }

    const historyItems = await CookingHistory.find(query)
      .populate('recipe', 'title imageUrl prepTimeMinutes cookTimeMinutes difficulty servings')
      .sort({ cookedAt: -1 });

    // Compute comprehensive statistics
    const allUserHistory = await CookingHistory.find({ user: currentUserId });
    const totalCooked = allUserHistory.length;

    let totalMinutes = 0;
    let ratingSum = 0;
    const titleCounts = {};

    allUserHistory.forEach((item) => {
      const prep = item.recipeSnapshot?.prepTimeMinutes || item.recipe?.prepTimeMinutes || 0;
      const cook = item.recipeSnapshot?.cookTimeMinutes || item.recipe?.cookTimeMinutes || 0;
      totalMinutes += (prep + cook);
      ratingSum += (item.rating || 5);

      const dishTitle = item.recipeSnapshot?.title || item.recipe?.title || 'Món ăn';
      titleCounts[dishTitle] = (titleCounts[dishTitle] || 0) + 1;
    });

    const averageRating = totalCooked > 0 ? (ratingSum / totalCooked).toFixed(1) : '5.0';

    // Find most cooked dish
    let mostCookedTitle = '';
    let maxCookCount = 0;
    for (const [titleStr, count] of Object.entries(titleCounts)) {
      if (count > maxCookCount) {
        maxCookCount = count;
        mostCookedTitle = titleStr;
      }
    }

    // Chef badge level
    let chefBadge = 'Tập sự bếp núc 🍳';
    if (totalCooked >= 20) {
      chefBadge = 'Bậc thầy ẩm thực 👑';
    } else if (totalCooked >= 10) {
      chefBadge = 'Bếp trưởng Vét Tủ 🌟';
    } else if (totalCooked >= 5) {
      chefBadge = 'Đầu bếp tài hoa 👨‍🍳';
    } else if (totalCooked >= 1) {
      chefBadge = 'Đầu bếp tích cực 🥦';
    }

    return res.status(200).json({
      success: true,
      count: historyItems.length,
      data: historyItems,
      stats: {
        totalCooked,
        totalMinutes,
        averageRating: Number(averageRating),
        mostCookedTitle: mostCookedTitle || 'Chưa có',
        maxCookCount,
        chefBadge,
      },
      message: 'Lấy lịch sử nấu ăn thành công',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update cooking history entry notes/rating
// @route   PUT /api/cooking-history/:id
// @access  Public / Private
const updateCookingHistory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { rating, notes, servingsCooked } = req.body;

    const entry = await CookingHistory.findById(id);
    if (!entry) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy nhật ký nấu ăn' });
    }

    if (rating !== undefined) entry.rating = Number(rating);
    if (notes !== undefined) entry.notes = notes;
    if (servingsCooked !== undefined) entry.servingsCooked = Number(servingsCooked);

    await entry.save();

    return res.status(200).json({
      success: true,
      data: entry,
      message: 'Đã cập nhật nhật ký nấu ăn',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a cooking history entry
// @route   DELETE /api/cooking-history/:id
// @access  Public / Private
const deleteCookingHistory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const currentUserId = req.user?._id || req.user?.id || req.query.userId || req.body?.userId;

    const entry = await CookingHistory.findById(id);
    if (!entry) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy nhật ký nấu ăn' });
    }

    if (currentUserId && entry.user.toString() !== currentUserId.toString()) {
      return res.status(403).json({ success: false, message: 'Không có quyền xóa nhật ký này' });
    }

    await CookingHistory.findByIdAndDelete(id);

    const remainingCount = await CookingHistory.countDocuments({ user: entry.user });

    return res.status(200).json({
      success: true,
      remainingCount,
      message: 'Đã xóa nhật ký nấu ăn thành công',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  recordCookingHistory,
  getCookingHistory,
  updateCookingHistory,
  deleteCookingHistory,
};
