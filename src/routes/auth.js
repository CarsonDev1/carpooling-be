// src/routes/auth.js - Fixed version for phone-based registration
const express = require('express');
const router = express.Router();

console.log('🔥 Loading auth controllers...');

// Import controllers with error handling
let authController;
try {
	authController = require('../controllers/authController');
	console.log('✅ Auth controller loaded');

	// Debug: check which functions are available
	const availableFunctions = Object.keys(authController);
	console.log('📋 Available controller functions:', availableFunctions);

	// Check specific functions for phone-based flow
	const requiredFunctions = [
		'test',
		'register',         // Step 1: Phone + fullName + auto OTP
		'verifyOTP',        // Step 2: Verify OTP
		'resendOTP',        // Step 2.5: Resend OTP
		'setPassword',      // Step 3: Set password and complete
		'login',            // Login with phone + password
		'getMe',
		'updateProfile',
		'forgotPassword',
		'resetPassword',
		'changePassword',
		'uploadAvatar',
		'deleteAvatar',
		'logout'
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
	throw error;
}

// Import middleware
let authMiddleware;
try {
	authMiddleware = require('../middleware/auth');
	console.log('✅ Auth middleware loaded');
} catch (error) {
	console.error('❌ Failed to load auth middleware:', error.message);
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

console.log('🔥 Setting up phone-based registration flow routes...');

// Public routes - NO authentication required

// Test endpoint
router.get('/test', authController.test);

// Phone-based registration flow
// Step 1: Register with phone + name (automatically sends OTP)
router.post('/register', authController.register);

// Step 2: Verify OTP
router.post('/verify-otp', authController.verifyOTP);

// Step 2.5: Resend OTP
router.post('/resend-otp', authController.resendOTP);

// Step 3: Set password and complete registration
router.post('/set-password', authController.setPassword);

// Login with phone + password
router.post('/login', authController.login);

// Password reset flow (phone-based)
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);

// Protected routes - authentication required

// Get current user profile
router.get('/me', authMiddleware.protect, authController.getMe);

// Update user profile
router.put('/profile', authMiddleware.protect, authController.updateProfile);

// Change password
router.put('/change-password', authMiddleware.protect, authController.changePassword);

// Avatar management
router.post(
	'/avatar',
	authMiddleware.protect,
	uploadMiddleware.uploadAvatar,
	uploadMiddleware.handleUploadError,
	authController.uploadAvatar
);
router.delete('/avatar', authMiddleware.protect, authController.deleteAvatar);

// Logout
router.post('/logout', authMiddleware.protect, authController.logout);

console.log('✅ Phone-based registration flow routes defined successfully');

module.exports = router;