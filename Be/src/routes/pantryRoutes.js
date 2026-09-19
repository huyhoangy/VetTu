const express = require('express');
const router = express.Router();
const {
  getUserPantry,
  addPantryItem,
  updatePantryItem,
  deletePantryItem,
  checkAndCreateExpiryReminders,
} = require('../controllers/pantryController');

router.route('/')
  .get(getUserPantry)
  .post(addPantryItem);

router.post('/check-reminders', checkAndCreateExpiryReminders);

router.route('/:id')
  .put(updatePantryItem)
  .delete(deletePantryItem);

module.exports = router;
