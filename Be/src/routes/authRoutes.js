const express = require('express');
const router = express.Router();
const {
  register,
  login,
  firebaseLogin,
  getMe,
  updateLocation,
} = require('../controllers/authController');
const { protect } = require('../middlewares/authMiddleware');

// Public routes
router.post('/register', register);
router.post('/login', login);
router.post('/firebase-login', firebaseLogin);

// Protected routes (Require Bearer Token)
router.get('/me', protect, getMe);
router.put('/location', protect, updateLocation);

module.exports = router;
