const express = require('express');
const router = express.Router();
const shareController = require('../controllers/shareController');
const { protect } = require('../middlewares/authMiddleware');

// Public / Protected route to view nearby community shares
router.get('/nearby', shareController.getNearbyShares);

// Get my shared items (must be before /:id)
router.get('/my-shares', shareController.getMyShares);

// Seed sample shares for quick exploration
router.post('/seed', shareController.seedSampleShares);

// Get single share detail
router.get('/:id', shareController.getShareById);

// Create new share post
router.post('/', protect, shareController.createShare);

// Update entire share post
router.put('/:id', protect, shareController.updateShare);

// Update status
router.put('/:id/status', protect, shareController.updateShareStatus);

// Delete share post
router.delete('/:id', protect, shareController.deleteShare);

module.exports = router;
