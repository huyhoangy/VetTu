const mongoose = require('mongoose');
const Recipe = require('../models/Recipe');
const User = require('../models/User');
const { matchRecipesWithPantry } = require('../services/recipeMatcherService');
const recipeSeeds = require('../seeds/recipeSeeds');
const aiService = require('../services/aiService');

// @desc    Match recipes based on user pantry ingredients
// @route   POST /api/recipes/match
// @access  Public
const matchRecipes = async (req, res, next) => {
  try {
    const { ingredients, appliance } = req.body;

    if (!ingredients || !Array.isArray(ingredients)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide an array of ingredient names in body: { ingredients: [...] }',
      });
    }

    let filter = {};
    if (appliance && appliance !== 'ALL') {
      filter.$or = [
        { appliance: appliance.toUpperCase() },
        { appliance: 'ALL' },
        { appliance: { $exists: false } },
      ];
    }

    // Fetch active recipes from MongoDB
    const allRecipes = await Recipe.find(filter).populate('createdBy', 'name avatar');

    // Run smart matching algorithm
    const matchedResults = matchRecipesWithPantry(allRecipes, ingredients);

    return res.status(200).json({
      success: true,
      count: matchedResults.length,
      data: matchedResults,
      message: `Found ${matchedResults.length} matching recipes`,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all recipes with search, appliance & filter params
// @route   GET /api/recipes
// @access  Public
const getAllRecipes = async (req, res, next) => {
  try {
    const { appliance, search, difficulty, limit = 50 } = req.query;

    let filter = {};

    if (appliance && appliance !== 'ALL') {
      filter.$or = [
        { appliance: appliance.toUpperCase() },
        { appliance: 'ALL' },
        { appliance: { $exists: false } },
      ];
    }

    if (difficulty) {
      filter.difficulty = difficulty.toUpperCase();
    }

    if (search && search.trim() !== '') {
      const searchRegex = new RegExp(search.trim(), 'i');
      filter.$or = [
        { title: searchRegex },
        { description: searchRegex },
        { ingredientKeywords: searchRegex },
      ];
    }

    const recipes = await Recipe.find(filter)
      .populate('createdBy', 'name avatar')
      .limit(Number(limit))
      .sort({ likesCount: -1, createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: recipes.length,
      data: recipes,
      message: 'Recipes fetched successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Smart lookup helper for recipes
 */
const findMatchingRecipe = async (title) => {
  if (!title || typeof title !== 'string') return null;
  const cleanTitle = title.trim();

  // 1. Exact match (case-insensitive)
  let recipe = await Recipe.findOne({
    title: { $regex: `^${cleanTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' },
  }).populate('createdBy', 'name avatar');
  if (recipe) return recipe;

  // 2. Partial match
  recipe = await Recipe.findOne({
    title: { $regex: cleanTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' },
  }).populate('createdBy', 'name avatar');
  if (recipe) return recipe;

  // 3. If composite title (e.g. "Gà xào sả ớt + Canh bí đao", "Bún thịt nướng / Bún chả giò")
  const parts = cleanTitle.split(/[+/&,]| và | hoặc /i).map((p) => p.trim()).filter(Boolean);
  if (parts.length > 1) {
    for (const part of parts) {
      const partRecipe = await Recipe.findOne({
        title: { $regex: part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' },
      }).populate('createdBy', 'name avatar');
      if (partRecipe) return partRecipe;
    }
  }

  // 4. Reverse contains match (a DB title is contained inside query title)
  const allDbRecipes = await Recipe.find({}).select('title imageUrl');
  const matched = allDbRecipes.find((r) =>
    r.title && (cleanTitle.toLowerCase().includes(r.title.toLowerCase()) || r.title.toLowerCase().includes(cleanTitle.toLowerCase()))
  );
  if (matched) {
    return await Recipe.findById(matched._id).populate('createdBy', 'name avatar');
  }

  return null;
};

// @desc    Get single recipe by ID or smart title lookup
// @route   GET /api/recipes/:id
// @access  Public
const getRecipeById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title } = req.query;

    let recipe = null;
    if (mongoose.Types.ObjectId.isValid(id)) {
      recipe = await Recipe.findById(id).populate('createdBy', 'name avatar');
    }

    if (!recipe && (title || id === 'lookup')) {
      const targetQuery = title || id;
      recipe = await findMatchingRecipe(targetQuery);
    }

    // If still not found and a title or name was requested, dynamically generate a full recipe using AI / culinary engine!
    if (!recipe && (title || (id && id !== 'lookup' && isNaN(id)))) {
      const dishTitle = title || id;
      try {
        let systemUser = await User.findOne();
        if (!systemUser) {
          systemUser = await User.create({
            name: 'Vét Tủ Master Chef',
            email: 'chef@vettu.app',
            password: 'password123',
            avatar: 'https://images.unsplash.com/photo-1577219491135-ce391730fb2c?q=80&w=400',
          });
        }

        const generatedData = await aiService.generateRecipeDetailsForDish(dishTitle);
        recipe = await Recipe.create({
          ...generatedData,
          createdBy: systemUser._id,
        });
        recipe = await Recipe.findById(recipe._id).populate('createdBy', 'name avatar');
      } catch (genErr) {
        console.log('[getRecipeById] Recipe generation fallback:', genErr.message);
      }
    }

    if (!recipe) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy công thức món ăn',
      });
    }

    return res.status(200).json({
      success: true,
      data: recipe,
      message: 'Recipe fetched successfully',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Seed initial recipes database
// @route   POST /api/recipes/seed
// @access  Public
const seedRecipes = async (req, res, next) => {
  try {
    // Find or create admin/system user for createdBy
    let systemUser = await User.findOne();
    if (!systemUser) {
      systemUser = await User.create({
        name: 'Vét Tủ Master Chef',
        email: 'chef@vettu.app',
        password: 'password123',
        avatar: 'https://images.unsplash.com/photo-1577219491135-ce391730fb2c?q=80&w=400',
      });
    }

    // Delete existing seeded recipes and insert fresh seeds
    await Recipe.deleteMany({});

    const formattedSeeds = recipeSeeds.map((r) => ({
      ...r,
      createdBy: systemUser._id,
    }));

    const createdRecipes = await Recipe.insertMany(formattedSeeds);

    return res.status(201).json({
      success: true,
      count: createdRecipes.length,
      data: createdRecipes,
      message: `Successfully seeded ${createdRecipes.length} recipes into MongoDB!`,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Toggle favorite/bookmark recipe for user
// @route   POST /api/recipes/:id/favorite
// @access  Public / Private
const toggleFavoriteRecipe = async (req, res, next) => {
  try {
    const { id } = req.params;
    const currentUserId = req.user?._id || req.user?.id || req.body?.userId;
    const recipeTitle = req.body?.title;

    if (!currentUserId) {
      return res.status(400).json({ success: false, message: 'Thiếu thông tin người dùng' });
    }

    const user = await User.findById(currentUserId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng' });
    }

    let recipe = null;
    if (mongoose.Types.ObjectId.isValid(id)) {
      recipe = await Recipe.findById(id);
    }

    // Fallback search by title if ID is stale from past seeds
    if (!recipe && recipeTitle) {
      recipe = await Recipe.findOne({ title: recipeTitle });
    }

    if (!recipe) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy món ăn' });
    }

    const targetRecipeId = recipe._id.toString();
    if (!user.favorites) user.favorites = [];

    const isFav = user.favorites.some((favId) => favId.toString() === targetRecipeId);

    let updatedFavorites;
    let newLikesCount = recipe.likesCount || 0;

    if (isFav) {
      updatedFavorites = user.favorites.filter((favId) => favId.toString() !== targetRecipeId);
      newLikesCount = Math.max(0, newLikesCount - 1);
    } else {
      updatedFavorites = [...user.favorites, recipe._id];
      newLikesCount = newLikesCount + 1;
    }

    // Atomic updates
    await User.findByIdAndUpdate(currentUserId, { favorites: updatedFavorites });
    await Recipe.findByIdAndUpdate(recipe._id, { likesCount: newLikesCount });

    return res.status(200).json({
      success: true,
      isFavorite: !isFav,
      recipeId: recipe._id,
      likesCount: newLikesCount,
      favoritesCount: updatedFavorites.length,
      message: !isFav ? 'Đã lưu món ăn vào danh sách yêu thích' : 'Đã bỏ lưu món ăn khỏi yêu thích',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user favorite recipes
// @route   GET /api/recipes/favorites
// @access  Public / Private
const getFavoriteRecipes = async (req, res, next) => {
  try {
    const currentUserId = req.user?._id || req.user?.id || req.query.userId;

    if (!currentUserId) {
      return res.status(400).json({ success: false, message: 'Thiếu thông tin người dùng' });
    }

    const user = await User.findById(currentUserId).populate({
      path: 'favorites',
      populate: { path: 'createdBy', select: 'name avatar' },
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng' });
    }

    return res.status(200).json({
      success: true,
      count: user.favorites ? user.favorites.length : 0,
      data: user.favorites || [],
      message: 'Lấy danh sách món yêu thích thành công',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  matchRecipes,
  getAllRecipes,
  getRecipeById,
  seedRecipes,
  toggleFavoriteRecipe,
  getFavoriteRecipes,
};
