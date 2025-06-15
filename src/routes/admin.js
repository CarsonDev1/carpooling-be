const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const authMiddleware = require('../middleware/auth');

console.log('🔥 Loading admin routes...');

// All admin routes are protected and require authentication
router.use(authMiddleware.protect);

// Admin dashboard statistics
router.get('/stats', adminController.getDashboardStats);

// User management
router.get('/users', adminController.getAllUsers);
router.get('/users/:id', adminController.getUserDetails);
router.patch('/users/:id/status', adminController.updateUserStatus);
router.patch('/users/:id/role', adminController.updateUserRole);

// Trip management
router.get('/trips', adminController.getAllTrips);
router.get('/trips/:id', adminController.getTripDetails);
router.patch('/trips/:id/cancel', adminController.cancelTrip);

console.log('✅ Admin routes loaded successfully');

module.exports = router;
