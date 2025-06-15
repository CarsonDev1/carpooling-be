const express = require('express');
const router = express.Router();
const ratingController = require('../controllers/ratingController');
const authMiddleware = require('../middleware/auth');

console.log('🔥 Loading rating routes...');

// All rating routes are protected and require authentication
router.use(authMiddleware.protect);

// Create a new rating
router.post('/', ratingController.createRating);

// Get ratings for a specific trip
router.get('/trip/:tripId', ratingController.getTripRatings);

// Get ratings for a specific user
router.get('/user/:userId', ratingController.getUserRatings);

// Get my ratings (both given and received)
router.get('/me', ratingController.getMyRatings);

console.log('✅ Rating routes loaded successfully');

module.exports = router;
