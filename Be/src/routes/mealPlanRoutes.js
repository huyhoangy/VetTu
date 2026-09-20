const express = require('express');
const router = express.Router();
const {
  getWeeklyMealPlan,
  updateMealSlot,
  removeMealSlot,
  toggleMealSlot,
  getWeeklyGroceryList,
  aiSuggestWeeklyPlan,
} = require('../controllers/mealPlanController');

router.get('/', getWeeklyMealPlan);
router.post('/slot', updateMealSlot);
router.delete('/slot', removeMealSlot);
router.patch('/toggle-slot', toggleMealSlot);
router.get('/grocery-list', getWeeklyGroceryList);
router.post('/ai-suggest', aiSuggestWeeklyPlan);

module.exports = router;
