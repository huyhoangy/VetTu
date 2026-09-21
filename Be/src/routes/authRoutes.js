const express = require('express');
const router = express.Router();
const {
  register,
  login,
  firebaseLogin,
  getMe,
  updateLocation,
  updatePushToken,
  verifyPhone,
} = require('../controllers/authController');
const { protect } = require('../middlewares/authMiddleware');

// Public routes
router.post('/register', register);
router.post('/login', login);
router.post('/firebase-login', firebaseLogin);
router.post('/push-token', updatePushToken);
router.post('/verify-phone', verifyPhone);

// Protected routes (Require Bearer Token)
router.get('/me', protect, getMe);
router.put('/location', protect, updateLocation);

module.exports = router;
