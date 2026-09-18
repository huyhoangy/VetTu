const express = require('express');
const router = express.Router();
const shareController = require('../controllers/shareController');
const { protect } = require('../middlewares/authMiddleware');

// Public route to view nearby community shares
router.get('/nearby', shareController.getNearbyShares);

// Seed sample shares for quick exploration
router.post('/seed', shareController.seedSampleShares);

// Get single share detail
router.get('/:id', shareController.getShareById);

// Create new share post (protected, with fallback if req.user is set or user ID passed)
router.post('/', protect, shareController.createShare);

// Update status
router.put('/:id/status', protect, shareController.updateShareStatus);

module.exports = router;
