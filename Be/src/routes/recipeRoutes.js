const express = require('express');
const router = express.Router();
const {
  matchRecipes,
  getAllRecipes,
  getRecipeById,
  seedRecipes,
  toggleFavoriteRecipe,
  getFavoriteRecipes,
} = require('../controllers/recipeController');

// Matching endpoint
router.post('/match', matchRecipes);

// Seeding endpoint
router.post('/seed', seedRecipes);

// Favorites endpoints (Must be before /:id)
router.get('/favorites', getFavoriteRecipes);
router.post('/:id/favorite', toggleFavoriteRecipe);

// Standard CRUD
router.get('/', getAllRecipes);
router.get('/:id', getRecipeById);

module.exports = router;
