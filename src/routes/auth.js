const express = require('express');
const router = express.Router();

console.log('🔥 Loading auth controllers...');

// Import controllers với error handling
let authController;
try {
	authController = require('../controllers/authController');
	console.log('✅ Auth controller loaded');

	// Debug: check which functions are available
	const availableFunctions = Object.keys(authController);
	console.log('📋 Available controller functions:', availableFunctions);

	// Check specific functions
	const requiredFunctions = [
		'test',
		'register',
		'login',
		'getMe',
		'updateProfile',
		'forgotPassword',
		'resetPassword',
		'changePassword',
		'uploadAvatar',
		'deleteAvatar',
	];

	requiredFunctions.forEach((funcName) => {
		if (typeof authController[funcName] === 'function') {
			console.log(`✅ ${funcName}: OK`);
		} else {
			console.log(`❌ ${funcName}: MISSING or NOT A FUNCTION`);
		}
	});
} catch (error) {
	console.error('❌ Failed to load auth controller:', error.message);
	throw error; // Stop execution if controller can't be loaded
}

// Import middleware
let authMiddleware;
try {
	authMiddleware = require('../middleware/auth');
	console.log('✅ Auth middleware loaded');
} catch (error) {
	console.error('❌ Failed to load auth middleware:', error.message);
	// Fallback middleware
	authMiddleware = {
		protect: (req, res, next) => {
			req.user = { _id: 'dummy-user-id' };
			next();
		},
	};
}

// Import upload middleware
let uploadMiddleware;
try {
	uploadMiddleware = require('../middleware/upload');
	console.log('✅ Upload middleware loaded');
} catch (error) {
	console.error('❌ Failed to load upload middleware:', error.message);
	uploadMiddleware = {
		uploadAvatar: (req, res, next) => next(),
		handleUploadError: (error, req, res, next) => next(error),
	};
}

console.log('🔥 Setting up auth routes...');

// Public routes
router.get('/test', authController.test);
router.post('/register', authController.register);
router.post('/login', authController.login);

// Password management routes (public)
router.post('/forgot-password', authController.forgotPassword);
router.put('/reset-password/:token', authController.resetPassword);

// Protected routes (require authentication)
router.get('/me', authMiddleware.protect, authController.getMe);
router.put('/profile', authMiddleware.protect, authController.updateProfile);
router.put('/change-password', authMiddleware.protect, authController.changePassword);

// Avatar upload routes
router.post(
	'/avatar',
	authMiddleware.protect,
	uploadMiddleware.uploadAvatar,
	uploadMiddleware.handleUploadError,
	authController.uploadAvatar
);
router.delete('/avatar', authMiddleware.protect, authController.deleteAvatar);

console.log('✅ Auth routes defined successfully');
module.exports = router;
