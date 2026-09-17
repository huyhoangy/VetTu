/**
 * Vietnamese Text Normalization Utility
 * Removes accents/diacritics and converts to lowercase
 * e.g., "Trứng gà" -> "trung ga", "Cà chua" -> "ca chua"
 */
const normalizeText = (text) => {
  if (!text || typeof text !== 'string') return '';
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .toLowerCase()
    .trim();
};

/**
 * Checks if a user's ingredient list contains or matches a recipe keyword/ingredient
 */
const isIngredientMatched = (recipeKeyword, userNormalizedIngredients) => {
  if (!recipeKeyword) return false;
  const normalizedRecipe = normalizeText(recipeKeyword);

  return userNormalizedIngredients.some((userItem) => {
    if (!userItem) return false;
    // Exact match
    if (userItem === normalizedRecipe) return true;
    // Substring match: e.g. "trung" matches "trung ga", "ca chua" matches "ca chua"
    if (normalizedRecipe.includes(userItem) || userItem.includes(normalizedRecipe)) return true;
    // Token overlap: e.g. "thit" in ["thit", "bo"]
    const recipeWords = normalizedRecipe.split(/\s+/).filter((w) => w.length > 1);
    const userWords = userItem.split(/\s+/).filter((w) => w.length > 1);
    return userWords.some((w) => recipeWords.includes(w));
  });
};

/**
 * Calculates recipe match metrics for a list of user pantry ingredients
 * @param {Array} recipes - Array of Recipe documents from MongoDB
 * @param {Array<string>} userIngredients - Array of ingredient strings user selected
 * @returns {Array} Array of matched recipe items with match metadata, sorted descending by matchPercentage
 */
const matchRecipesWithPantry = (recipes, userIngredients = []) => {
  if (!Array.isArray(userIngredients) || userIngredients.length === 0) {
    return recipes.map((recipe) => ({
      ...(recipe.toObject ? recipe.toObject() : recipe),
      matchPercentage: 0,
      matchedCount: 0,
      totalRequiredCount: recipe.ingredients.filter((i) => !i.isOptional).length,
      matchedIngredients: [],
      missingIngredients: recipe.ingredients,
      isFullyCookable: false,
    }));
  }

  const normalizedUserIngredients = userIngredients
    .map((item) => normalizeText(item))
    .filter(Boolean);

  const scoredRecipes = recipes.map((recipeDoc) => {
    const recipe = recipeDoc.toObject ? recipeDoc.toObject() : recipeDoc;
    const requiredIngredients = recipe.ingredients.filter((i) => !i.isOptional);
    const totalRequired = requiredIngredients.length || 1;

    const matched = [];
    const missing = [];

    recipe.ingredients.forEach((ing) => {
      const isMatched =
        isIngredientMatched(ing.name, normalizedUserIngredients) ||
        isIngredientMatched(ing.normalized_name, normalizedUserIngredients) ||
        (Array.isArray(recipe.ingredientKeywords) &&
          recipe.ingredientKeywords.some(
            (kw) =>
              isIngredientMatched(kw, normalizedUserIngredients) &&
              (normalizeText(kw).includes(normalizeText(ing.name)) ||
                normalizeText(ing.name).includes(normalizeText(kw)))
          ));

      if (isMatched) {
        matched.push(ing);
      } else {
        missing.push(ing);
      }
    });

    // Required matched count
    const requiredMatchedCount = matched.filter((i) => !i.isOptional).length;
    const matchPercentage = Math.min(
      100,
      Math.round((requiredMatchedCount / totalRequired) * 100)
    );

    const isFullyCookable = matchPercentage === 100;

    return {
      ...recipe,
      matchPercentage,
      matchedCount: matched.length,
      totalRequiredCount: totalRequired,
      matchedIngredients: matched,
      missingIngredients: missing,
      isFullyCookable,
    };
  });

  // Sort: highest match percentage first, then by least missing ingredients
  return scoredRecipes
    .filter((r) => r.matchPercentage > 0)
    .sort((a, b) => {
      if (b.matchPercentage !== a.matchPercentage) {
        return b.matchPercentage - a.matchPercentage;
      }
      return a.missingIngredients.length - b.missingIngredients.length;
    });
};

module.exports = {
  normalizeText,
  isIngredientMatched,
  matchRecipesWithPantry,
};
