const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const authMiddleware = require('../middleware/auth');

console.log('🔥 Loading notification routes...');

// All notification routes are protected and require authentication
router.use(authMiddleware.protect);

// Get all notifications for the current user
router.get('/', notificationController.getMyNotifications);

// Mark a notification as read
router.patch('/:id/read', notificationController.markAsRead);

// Mark all notifications as read
router.patch('/mark-all-read', notificationController.markAllAsRead);

// Delete a notification
router.delete('/:id', notificationController.deleteNotification);

// Clear all notifications
router.delete('/', notificationController.clearAllNotifications);

// Broadcast a notification to all users (admin only)
router.post('/broadcast', notificationController.broadcastNotification);

console.log('✅ Notification routes loaded successfully');

module.exports = router;
