const express = require('express');
const router = express.Router();
const feedbackController = require('../controllers/feedbackController');
const authMiddleware = require('../middleware/auth');

console.log('🔥 Loading feedback routes...');

// All feedback routes are protected and require authentication
router.use(authMiddleware.protect);

// Create new feedback
router.post('/', feedbackController.createFeedback);

// Get all feedback for the current user
router.get('/', feedbackController.getMyFeedback);

// Get feedback by ID
router.get('/:id', feedbackController.getFeedbackById);

// Update feedback response (admin only)
router.patch('/:id/response', feedbackController.updateFeedbackResponse);

// Update feedback status (admin only)
router.patch('/:id/status', feedbackController.updateFeedbackStatus);

// Get all feedback (admin only)
router.get('/admin/all', feedbackController.getAllFeedback);

console.log('✅ Feedback routes loaded successfully');

module.exports = router;
