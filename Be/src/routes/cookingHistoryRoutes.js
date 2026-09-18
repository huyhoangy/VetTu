const express = require('express');
const router = express.Router();
const {
  recordCookingHistory,
  getCookingHistory,
  updateCookingHistory,
  deleteCookingHistory,
} = require('../controllers/cookingHistoryController');

router.route('/')
  .post(recordCookingHistory)
  .get(getCookingHistory);

router.route('/:id')
  .put(updateCookingHistory)
  .delete(deleteCookingHistory);

module.exports = router;
