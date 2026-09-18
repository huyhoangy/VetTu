const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');

// Get all notifications for current user
router.get('/', notificationController.getNotifications);

// Get unread notification count
router.get('/unread-count', notificationController.getUnreadCount);

// Mark all as read
router.put('/read-all', notificationController.markAllAsRead);

// Mark all notifications in a conversation as read
router.put('/read-by-conversation', notificationController.markReadByConversation);

// Mark single notification as read
router.put('/:id/read', notificationController.markAsRead);

// Delete all notifications for current user
router.delete('/delete-all', notificationController.deleteAllNotifications);

// Delete single notification
router.delete('/:id', notificationController.deleteNotification);

module.exports = router;
