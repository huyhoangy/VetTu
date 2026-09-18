const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const { protect } = require('../middlewares/authMiddleware');

// Get or create conversation for a food share
router.post('/conversation', chatController.getOrCreateConversation);

// Get user's conversations list
router.get('/conversations', chatController.getUserConversations);

// Get single conversation details
router.get('/conversations/:id', chatController.getConversationById);

// Delete conversation and messages history
router.delete('/conversations/:id', chatController.deleteConversation);

// Get messages for a specific conversation
router.get('/conversations/:id/messages', chatController.getConversationMessages);

// Send message
router.post('/conversations/:id/messages', chatController.sendMessage);

// Confirm item claim / transaction complete
router.post('/conversations/:id/confirm-claim', chatController.confirmClaim);

module.exports = router;
