const express = require('express');
const router = express.Router();
const {
  register,
  login,
  firebaseLogin,
  getMe,
  updateLocation,
  updatePushToken,
} = require('../controllers/authController');
const { protect } = require('../middlewares/authMiddleware');

// Public routes
router.post('/register', register);
router.post('/login', login);
router.post('/firebase-login', firebaseLogin);
router.post('/push-token', updatePushToken);

// Protected routes (Require Bearer Token)
router.get('/me', protect, getMe);
router.put('/location', protect, updateLocation);

module.exports = router;
