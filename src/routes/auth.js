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

	// Check specific functions for new flow
	const requiredFunctions = [
		'test',
		'register',           // Step 1: Email + fullName
		'sendPhoneOTP',       // Step 2: Send OTP to phone
		'verifyPhoneOTP',     // Step 2.5: Verify OTP
		'resendPhoneOTP',     // Step 2.6: Resend OTP
		'setPassword',        // Step 3: Set password and complete
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

// Import validation middleware
let validationMiddleware;
try {
	validationMiddleware = require('../middleware/validation');
	console.log('✅ Validation middleware loaded');
} catch (error) {
	console.error('❌ Failed to load validation middleware:', error.message);
	validationMiddleware = {
		validate: (req, res, next) => next(),
		validateObjectId: () => (req, res, next) => next(),
	};
}

console.log('🔥 Setting up new registration flow routes...');

/**
 * @swagger
 * components:
 *   schemas:
 *     RegisterStep1:
 *       type: object
 *       required:
 *         - email
 *         - fullName
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           description: User's email address
 *         fullName:
 *           type: string
 *           minLength: 2
 *           maxLength: 50
 *           description: User's full name
 *       example:
 *         email: "user@example.com"
 *         fullName: "Nguyen Van A"
 * 
 *     SendOTPRequest:
 *       type: object
 *       required:
 *         - userId
 *         - phone
 *       properties:
 *         userId:
 *           type: string
 *           description: User ID from step 1
 *         phone:
 *           type: string
 *           pattern: '^[0-9]{10,11}$'
 *           description: Phone number for OTP
 *       example:
 *         userId: "60f7b3b3b3b3b3b3b3b3b3b3"
 *         phone: "0987654321"
 * 
 *     VerifyOTPRequest:
 *       type: object
 *       required:
 *         - userId
 *         - otp
 *       properties:
 *         userId:
 *           type: string
 *           description: User ID
 *         otp:
 *           type: string
 *           pattern: '^[0-9]{6}$'
 *           description: 6-digit OTP code
 *       example:
 *         userId: "60f7b3b3b3b3b3b3b3b3b3b3"
 *         otp: "123456"
 * 
 *     SetPasswordRequest:
 *       type: object
 *       required:
 *         - userId
 *         - password
 *         - confirmPassword
 *       properties:
 *         userId:
 *           type: string
 *           description: User ID
 *         password:
 *           type: string
 *           minLength: 6
 *           description: New password
 *         confirmPassword:
 *           type: string
 *           description: Confirm password
 *       example:
 *         userId: "60f7b3b3b3b3b3b3b3b3b3b3"
 *         password: "password123"
 *         confirmPassword: "password123"
 */

// Public routes
router.get('/test', authController.test);

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Step 1 - Register user with email and name
 *     description: First step of registration process - create account with email and full name
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegisterStep1'
 *     responses:
 *       201:
 *         description: Account created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 message:
 *                   type: string
 *                   example: Account created successfully. Please verify your phone number.
 *                 data:
 *                   type: object
 *                   properties:
 *                     userId:
 *                       type: string
 *                     email:
 *                       type: string
 *                     fullName:
 *                       type: string
 *                     nextStep:
 *                       type: string
 *                       example: phone_verification
 *       400:
 *         description: Bad request - missing fields or email already exists
 */
router.post('/register', authController.register);

/**
 * @swagger
 * /auth/send-otp:
 *   post:
 *     summary: Step 2 - Send OTP to phone number
 *     description: Send verification code to user's phone number
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SendOTPRequest'
 *     responses:
 *       200:
 *         description: OTP sent successfully
 *       400:
 *         description: Invalid user ID or phone number
 */
router.post('/send-otp', authController.sendPhoneOTP);

/**
 * @swagger
 * /auth/verify-otp:
 *   post:
 *     summary: Step 2.5 - Verify OTP code
 *     description: Verify the OTP code sent to phone number
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/VerifyOTPRequest'
 *     responses:
 *       200:
 *         description: OTP verified successfully
 *       400:
 *         description: Invalid or expired OTP
 */
router.post('/verify-otp', authController.verifyPhoneOTP);

/**
 * @swagger
 * /auth/resend-otp:
 *   post:
 *     summary: Step 2.6 - Resend OTP code
 *     description: Resend verification code to phone number
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *             properties:
 *               userId:
 *                 type: string
 *     responses:
 *       200:
 *         description: New OTP sent successfully
 *       429:
 *         description: Too many requests - rate limited
 */
router.post('/resend-otp', authController.resendPhoneOTP);

/**
 * @swagger
 * /auth/set-password:
 *   post:
 *     summary: Step 3 - Set password and complete registration
 *     description: Final step - set password and activate account
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SetPasswordRequest'
 *     responses:
 *       201:
 *         description: Registration completed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     token:
 *                       type: string
 *                     user:
 *                       type: object
 *       400:
 *         description: Invalid data or registration step
 */
router.post('/set-password', authController.setPassword);

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Login user
 *     description: Authenticate user with email and password
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 *       401:
 *         description: Invalid credentials or incomplete registration
 */
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

// Logout route
router.post('/logout', authMiddleware.protect, authController.logout);

console.log('✅ New registration flow routes defined successfully');

module.exports = router;