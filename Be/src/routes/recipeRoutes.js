const express = require('express');
const router = express.Router();
const {
  matchRecipes,
  getAllRecipes,
  getRecipeById,
  seedRecipes,
} = require('../controllers/recipeController');

// Matching endpoint
router.post('/match', matchRecipes);

// Seeding endpoint
router.post('/seed', seedRecipes);

// Standard CRUD
router.get('/', getAllRecipes);
router.get('/:id', getRecipeById);

module.exports = router;
