const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const authMiddleware = require('../middleware/auth');

console.log('🔥 Loading chat routes...');

// All chat routes are protected and require authentication
router.use(authMiddleware.protect);

// Get all chats for the current user
router.get('/', chatController.getMyChats);

// Create a new chat or get existing one
router.post('/', chatController.createChat);

// Get unread messages count
router.get('/unread-count', chatController.getUnreadCount);

// Get messages for a specific chat
router.get('/:chatId/messages', chatController.getChatMessages);

// Send a message in a chat
router.post('/:chatId/messages', chatController.sendMessage);

// Mark all messages in a chat as read
router.patch('/:chatId/read', chatController.markChatAsRead);

// Delete (archive) a chat
router.delete('/:chatId', chatController.deleteChat);

console.log('✅ Chat routes loaded successfully');

module.exports = router;
