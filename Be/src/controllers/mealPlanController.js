const MealPlan = require('../models/MealPlan');
const Recipe = require('../models/Recipe');
const PantryItem = require('../models/PantryItem');
const aiService = require('../services/aiService');

/**
 * Helper to get Monday date string (YYYY-MM-DD)
 */
const getMondayDateString = (inputDate) => {
  const d = inputDate ? new Date(inputDate) : new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
  const monday = new Date(d.setDate(diff));
  return monday.toISOString().split('T')[0];
};

/**
 * Helper to generate 7-day dates array from Monday date string
 */
const generate7Days = (mondayStr) => {
  const days = [];
  const monday = new Date(mondayStr);
  for (let i = 0; i < 7; i++) {
    const current = new Date(monday);
    current.setDate(monday.getDate() + i);
    days.push({
      dayIndex: i,
      date: current.toISOString().split('T')[0],
      meals: [],
    });
  }
  return days;
};

const getUserId = async (req) => {
  if (req.user && req.user._id) return req.user._id;
  if (req.query && req.query.userId) return req.query.userId;
  if (req.body && req.body.userId) return req.body.userId;
  
  // Fallback to first user in database
  const User = require('../models/User');
  const user = await User.findOne({});
  return user ? user._id : null;
};

/**
 * GET /api/meal-plans?weekStart=YYYY-MM-DD
 * Get or initialize weekly meal plan
 */
const getWeeklyMealPlan = async (req, res, next) => {
  try {
    const userId = await getUserId(req);
    if (!userId) {
      return res.status(400).json({ success: false, message: 'Vui lòng đăng nhập hoặc cung cấp userId' });
    }
    const weekStartDate = req.query.weekStart ? req.query.weekStart : getMondayDateString();

    let plan = await MealPlan.findOne({ user: userId, weekStartDate }).populate({
      path: 'days.meals.recipe',
      select: 'title imageUrl prepTimeMinutes cookTimeMinutes servings difficulty appliance ingredients',
    });

    if (!plan) {
      // Create empty 7-day plan skeleton
      const initialDays = generate7Days(weekStartDate);
      plan = await MealPlan.create({
        user: userId,
        weekStartDate,
        days: initialDays,
      });
    }

    res.status(200).json({
      success: true,
      data: plan,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/meal-plans/slot
 * Add or update a meal slot in a specific day
 */
const updateMealSlot = async (req, res, next) => {
  try {
    const userId = await getUserId(req);
    if (!userId) {
      return res.status(400).json({ success: false, message: 'Vui lòng đăng nhập' });
    }
    const { weekStartDate, dayIndex, slot, recipeId, customDishName, dishImage, note } = req.body;

    if (dayIndex === undefined || !slot) {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp đầy đủ dayIndex và slot' });
    }

    const targetWeek = weekStartDate || getMondayDateString();

    let plan = await MealPlan.findOne({ user: userId, weekStartDate: targetWeek });
    if (!plan) {
      plan = await MealPlan.create({
        user: userId,
        weekStartDate: targetWeek,
        days: generate7Days(targetWeek),
      });
    }

    let dayObj = plan.days.find((d) => d.dayIndex === Number(dayIndex));
    if (!dayObj) {
      const monday = new Date(targetWeek);
      const curDate = new Date(monday);
      curDate.setDate(monday.getDate() + Number(dayIndex));
      dayObj = {
        dayIndex: Number(dayIndex),
        date: curDate.toISOString().split('T')[0],
        meals: [],
      };
      plan.days.push(dayObj);
    }

    const existingMealIndex = dayObj.meals.findIndex((m) => m.slot === slot);

    let recipeData = null;
    let finalRecipeId = recipeId || null;
    let finalDishImage = dishImage || '';
    if (recipeId) {
      recipeData = await Recipe.findById(recipeId);
      if (recipeData && !finalDishImage) {
        finalDishImage = recipeData.imageUrl;
      }
    } else if (customDishName) {
      // Try to find matching recipe
      const allDb = await Recipe.find({}).select('_id title imageUrl');
      const matched = allDb.find((r) =>
        r.title && (customDishName.toLowerCase().includes(r.title.toLowerCase()) || r.title.toLowerCase().includes(customDishName.toLowerCase()))
      );
      if (matched) {
        finalRecipeId = matched._id;
        if (!finalDishImage) finalDishImage = matched.imageUrl;
      }
    }

    if (!finalDishImage && customDishName) {
      finalDishImage = aiService.getRelevantDishImage(customDishName);
    }

    const mealData = {
      slot,
      recipe: finalRecipeId,
      customDishName: customDishName || (recipeData ? recipeData.title : ''),
      dishImage: finalDishImage,
      note: note || '',
      completed: false,
    };

    if (existingMealIndex !== -1) {
      dayObj.meals[existingMealIndex] = mealData;
    } else {
      dayObj.meals.push(mealData);
    }

    await plan.save();

    const updatedPlan = await MealPlan.findById(plan._id).populate({
      path: 'days.meals.recipe',
      select: 'title imageUrl prepTimeMinutes cookTimeMinutes servings difficulty appliance ingredients',
    });

    res.status(200).json({
      success: true,
      message: 'Đã cập nhật bữa ăn thành công',
      data: updatedPlan,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/meal-plans/slot
 * Remove a meal from a slot
 */
const removeMealSlot = async (req, res, next) => {
  try {
    const userId = await getUserId(req);
    if (!userId) {
      return res.status(400).json({ success: false, message: 'Vui lòng đăng nhập' });
    }
    const { weekStartDate, dayIndex, mealId, slot } = req.body;

    const targetWeek = weekStartDate || getMondayDateString();
    const plan = await MealPlan.findOne({ user: userId, weekStartDate: targetWeek });

    if (!plan) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy thực đơn tuần này' });
    }

    const dayObj = plan.days.find((d) => d.dayIndex === Number(dayIndex));
    if (dayObj) {
      if (mealId) {
        dayObj.meals = dayObj.meals.filter((m) => m._id.toString() !== mealId.toString());
      } else if (slot) {
        dayObj.meals = dayObj.meals.filter((m) => m.slot !== slot);
      }
      await plan.save();
    }

    const updatedPlan = await MealPlan.findById(plan._id).populate({
      path: 'days.meals.recipe',
      select: 'title imageUrl prepTimeMinutes cookTimeMinutes servings difficulty appliance ingredients',
    });

    res.status(200).json({
      success: true,
      message: 'Đã xóa bữa ăn',
      data: updatedPlan,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/meal-plans/toggle-slot
 * Mark meal as completed / uncompleted
 */
const toggleMealSlot = async (req, res, next) => {
  try {
    const userId = await getUserId(req);
    if (!userId) {
      return res.status(400).json({ success: false, message: 'Vui lòng đăng nhập' });
    }
    const { weekStartDate, dayIndex, mealId } = req.body;

    const targetWeek = weekStartDate || getMondayDateString();
    const plan = await MealPlan.findOne({ user: userId, weekStartDate: targetWeek });

    if (!plan) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy thực đơn' });
    }

    const dayObj = plan.days.find((d) => d.dayIndex === Number(dayIndex));
    if (dayObj) {
      const meal = dayObj.meals.find((m) => m._id.toString() === mealId.toString());
      if (meal) {
        meal.completed = !meal.completed;
        await plan.save();
      }
    }

    res.status(200).json({
      success: true,
      message: 'Đã cập nhật trạng thái bữa ăn',
      data: plan,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/meal-plans/grocery-list?weekStart=YYYY-MM-DD
 * Aggregate all ingredients for the week and cross-check with user's pantry
 */
const getWeeklyGroceryList = async (req, res, next) => {
  try {
    const userId = await getUserId(req);
    if (!userId) {
      return res.status(400).json({ success: false, message: 'Vui lòng đăng nhập' });
    }
    const weekStartDate = req.query.weekStart || getMondayDateString();

    const plan = await MealPlan.findOne({ user: userId, weekStartDate }).populate({
      path: 'days.meals.recipe',
      select: 'title ingredients',
    });

    // Fetch user active pantry items
    const pantryItems = await PantryItem.find({
      userId,
      isUsed: false,
    });

    // Ingredient map to aggregate quantity & occurrences
    const ingredientMap = new Map();
    let totalMealsCount = 0;

    if (plan && plan.days) {
      plan.days.forEach((day) => {
        day.meals.forEach((meal) => {
          totalMealsCount++;
          if (meal.recipe && Array.isArray(meal.recipe.ingredients)) {
            meal.recipe.ingredients.forEach((ing) => {
              const rawName = ing.name.trim();
              const key = rawName.toLowerCase();
              if (!ingredientMap.has(key)) {
                ingredientMap.set(key, {
                  name: rawName,
                  quantity: ing.quantity || '',
                  unit: ing.unit || '',
                  dishSources: [meal.recipe.title],
                  isOptional: ing.isOptional || false,
                });
              } else {
                const item = ingredientMap.get(key);
                if (!item.dishSources.includes(meal.recipe.title)) {
                  item.dishSources.push(meal.recipe.title);
                }
              }
            });
          } else if (meal.customDishName) {
            const key = meal.customDishName.toLowerCase();
            if (!ingredientMap.has(key)) {
              ingredientMap.set(key, {
                name: meal.customDishName,
                quantity: '1 phần',
                unit: '',
                dishSources: [meal.customDishName],
                isOptional: false,
              });
            }
          }
        });
      });
    }

    const neededToBuy = [];
    const alreadyInPantry = [];

    ingredientMap.forEach((val, key) => {
      const matchedPantry = pantryItems.find((p) => {
        const pName = p.name.toLowerCase();
        return pName.includes(key) || key.includes(pName);
      });

      if (matchedPantry) {
        alreadyInPantry.push({
          ...val,
          inPantry: true,
          pantryItemName: matchedPantry.name,
          pantryQuantity: matchedPantry.quantity,
          expiryDate: matchedPantry.expiryDate,
        });
      } else {
        neededToBuy.push({
          ...val,
          inPantry: false,
        });
      }
    });

    res.status(200).json({
      success: true,
      data: {
        weekStartDate,
        totalMealsCount,
        totalIngredients: ingredientMap.size,
        neededToBuy,
        alreadyInPantry,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/meal-plans/ai-suggest
 * Use Gemini to generate full 7-day meal plan
 */
const aiSuggestWeeklyPlan = async (req, res, next) => {
  try {
    const userId = await getUserId(req);
    if (!userId) {
      return res.status(400).json({ success: false, message: 'Vui lòng đăng nhập' });
    }
    const { weekStartDate, preferences } = req.body;
    const targetWeek = weekStartDate || getMondayDateString();

    // Get pantry items to feed into AI
    const pantryItems = await PantryItem.find({
      userId,
      isUsed: false,
    }).select('name quantity storageLocation category expiryDate');

    // Call AI Service
    const aiDays = await aiService.suggestWeeklyMealPlan({
      pantryItems,
      preferences: preferences || '',
    });

    // Find all recipes to attempt matching
    const allRecipes = await Recipe.find({}).select('_id title imageUrl');

    // Build structured days for MealPlan
    const monday = new Date(targetWeek);
    const planDays = [];

    for (let i = 0; i < 7; i++) {
      const curDate = new Date(monday);
      curDate.setDate(monday.getDate() + i);
      const dateStr = curDate.toISOString().split('T')[0];

      const aiDayObj = Array.isArray(aiDays) ? aiDays.find((d) => d.dayIndex === i) : null;
      const dayMeals = [];

      if (aiDayObj && Array.isArray(aiDayObj.meals)) {
        for (const m of aiDayObj.meals) {
          const dishTitle = m.customDishName || 'Món ngon mỗi ngày';
          // Attempt fuzzy match with existing DB recipe
          let matchedRecipe = allRecipes.find((r) =>
            r.title && (
              r.title.toLowerCase() === dishTitle.toLowerCase() ||
              dishTitle.toLowerCase().includes(r.title.toLowerCase()) ||
              r.title.toLowerCase().includes(dishTitle.toLowerCase())
            )
          );

          // If no match, check composite parts (e.g. "Gà xào sả ớt + Canh bí đao")
          if (!matchedRecipe) {
            const parts = dishTitle.split(/[+/&,]| và | hoặc /i).map((p) => p.trim()).filter(Boolean);
            if (parts.length > 1) {
              for (const part of parts) {
                const subMatch = allRecipes.find((r) =>
                  r.title && (
                    r.title.toLowerCase().includes(part.toLowerCase()) ||
                    part.toLowerCase().includes(r.title.toLowerCase())
                  )
                );
                if (subMatch) {
                  matchedRecipe = subMatch;
                  break;
                }
              }
            }
          }

          const finalImage = matchedRecipe ? matchedRecipe.imageUrl : aiService.getRelevantDishImage(dishTitle);

          dayMeals.push({
            slot: m.slot || 'lunch',
            recipe: matchedRecipe ? matchedRecipe._id : null,
            customDishName: dishTitle,
            dishImage: finalImage,
            note: m.note || '',
            completed: false,
          });
        }
      }

      planDays.push({
        dayIndex: i,
        date: dateStr,
        meals: dayMeals,
      });
    }

    // Upsert meal plan
    let plan = await MealPlan.findOne({ user: userId, weekStartDate: targetWeek });
    if (!plan) {
      plan = new MealPlan({
        user: userId,
        weekStartDate: targetWeek,
        days: planDays,
      });
    } else {
      plan.days = planDays;
    }

    await plan.save();

    const populatedPlan = await MealPlan.findById(plan._id).populate({
      path: 'days.meals.recipe',
      select: 'title imageUrl prepTimeMinutes cookTimeMinutes servings difficulty appliance ingredients',
    });

    res.status(200).json({
      success: true,
      message: '✨ AI đã gợi ý thực đơn tuần thành công!',
      data: populatedPlan,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getWeeklyMealPlan,
  updateMealSlot,
  removeMealSlot,
  toggleMealSlot,
  getWeeklyGroceryList,
  aiSuggestWeeklyPlan,
};
