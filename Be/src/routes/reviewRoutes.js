const express = require('express');
const router = express.Router();
const {
  createReview,
  getUserReviews,
} = require('../controllers/reviewController');

router.post('/', createReview);
router.get('/user/:userId', getUserReviews);

module.exports = router;
