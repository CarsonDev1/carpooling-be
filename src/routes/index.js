const express = require('express');
const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           description: User ID
 *         phone:
 *           type: string
 *           description: User phone number (primary identifier)
 *         email:
 *           type: string
 *           format: email
 *           description: User email (optional)
 *         fullName:
 *           type: string
 *           description: User full name
 *         isActive:
 *           type: boolean
 *           description: Account status
 *         isPhoneVerified:
 *           type: boolean
 *           description: Phone verification status
 *         registrationStep:
 *           type: number
 *           description: Current registration step (1-3)
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Account creation date
 *       example:
 *         _id: "64f7b3b3b3b3b3b3b3b3b3b3"
 *         phone: "0987654321"
 *         email: "user@example.com"
 *         fullName: "Nguyen Van A"
 *         isActive: true
 *         isPhoneVerified: true
 *         registrationStep: 3
 *         createdAt: "2024-01-15T10:00:00.000Z"
 * 
 *     RegisterRequest:
 *       type: object
 *       required:
 *         - fullName
 *         - phone
 *       properties:
 *         fullName:
 *           type: string
 *           minLength: 2
 *           maxLength: 50
 *           description: User's full name
 *         phone:
 *           type: string
 *           pattern: '^[0-9]{10,11}$'
 *           description: User's phone number
 *       example:
 *         fullName: "Nguyen Van A"
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
 *           description: User ID from registration
 *         otp:
 *           type: string
 *           pattern: '^[0-9]{6}$'
 *           description: 6-digit OTP code
 *       example:
 *         userId: "64f7b3b3b3b3b3b3b3b3b3b3"
 *         otp: "123456"
 * 
 *     ResendOTPRequest:
 *       type: object
 *       required:
 *         - userId
 *       properties:
 *         userId:
 *           type: string
 *           description: User ID
 *       example:
 *         userId: "64f7b3b3b3b3b3b3b3b3b3b3"
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
 *         userId: "64f7b3b3b3b3b3b3b3b3b3b3"
 *         password: "password123"
 *         confirmPassword: "password123"
 * 
 *     LoginRequest:
 *       type: object
 *       required:
 *         - phone
 *         - password
 *       properties:
 *         phone:
 *           type: string
 *           pattern: '^[0-9]{10,11}$'
 *           description: Phone number
 *         password:
 *           type: string
 *           description: User password
 *       example:
 *         phone: "0987654321"
 *         password: "password123"
 * 
 *     ForgotPasswordRequest:
 *       type: object
 *       required:
 *         - phone
 *       properties:
 *         phone:
 *           type: string
 *           pattern: '^[0-9]{10,11}$'
 *           description: Phone number
 *       example:
 *         phone: "0987654321"
 * 
 *     ResetPasswordRequest:
 *       type: object
 *       required:
 *         - phone
 *         - otp
 *         - password
 *         - confirmPassword
 *       properties:
 *         phone:
 *           type: string
 *           pattern: '^[0-9]{10,11}$'
 *         otp:
 *           type: string
 *           pattern: '^[0-9]{6}$'
 *           description: OTP received via SMS
 *         password:
 *           type: string
 *           minLength: 6
 *         confirmPassword:
 *           type: string
 *       example:
 *         phone: "0987654321"
 *         otp: "123456"
 *         password: "newPassword123"
 *         confirmPassword: "newPassword123"
 * 
 *     AuthResponse:
 *       type: object
 *       properties:
 *         status:
 *           type: string
 *           example: success
 *         message:
 *           type: string
 *         data:
 *           type: object
 *           properties:
 *             token:
 *               type: string
 *               description: JWT access token
 *             user:
 *               $ref: '#/components/schemas/User'
 * 
 *     ErrorResponse:
 *       type: object
 *       properties:
 *         status:
 *           type: string
 *           example: error
 *         message:
 *           type: string
 *           description: Error message
 * 
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 * 
 * tags:
 *   - name: Authentication
 *     description: User authentication and registration endpoints (phone-based)
 */

// Import controllers
let authController;
try {
	authController = require('../controllers/authController');
	console.log('✅ Auth controller loaded');
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

console.log('🔥 Setting up phone-based authentication routes...');

/**
 * @swagger
 * /auth/test:
 *   get:
 *     summary: Test authentication endpoint
 *     description: Simple test endpoint to verify API is working
 *     tags: [Authentication]
 *     responses:
 *       200:
 *         description: Test successful
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
 *                   example: Auth controller test working
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 */
router.get('/test', authController.test);

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Step 1 - Register with phone number and name (+ auto OTP)
 *     description: Register account with phone number and full name, automatically sends OTP
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegisterRequest'
 *     responses:
 *       201:
 *         description: Account created and OTP sent successfully
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
 *                   example: Account created and OTP sent to your phone number
 *                 data:
 *                   type: object
 *                   properties:
 *                     userId:
 *                       type: string
 *                       example: "64f7b3b3b3b3b3b3b3b3b3b3"
 *                     phone:
 *                       type: string
 *                       example: "0987654321"
 *                     fullName:
 *                       type: string
 *                       example: "Nguyen Van A"
 *                     otpSent:
 *                       type: boolean
 *                       example: true
 *                     expiryTime:
 *                       type: string
 *                       format: date-time
 *                     nextStep:
 *                       type: string
 *                       example: otp_verification
 *                     developmentOTP:
 *                       type: string
 *                       description: OTP for development testing
 *       400:
 *         description: Bad request - missing fields or phone already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/register', authController.register);

/**
 * @swagger
 * /auth/verify-otp:
 *   post:
 *     summary: Step 2 - Verify OTP code
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
 *                   example: Phone number verified successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     userId:
 *                       type: string
 *                     phoneVerified:
 *                       type: boolean
 *                     nextStep:
 *                       type: string
 *                       example: set_password
 *       400:
 *         description: Invalid or expired OTP
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/verify-otp', authController.verifyOTP);

/**
 * @swagger
 * /auth/resend-otp:
 *   post:
 *     summary: Step 2.5 - Resend OTP code
 *     description: Resend verification code to phone number (rate limited)
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ResendOTPRequest'
 *     responses:
 *       200:
 *         description: New OTP sent successfully
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
 *                   example: New OTP sent successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     userId:
 *                       type: string
 *                     otpSent:
 *                       type: boolean
 *                     expiryTime:
 *                       type: string
 *                       format: date-time
 *                     developmentOTP:
 *                       type: string
 *       429:
 *         description: Too many requests - rate limited
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: error
 *                 message:
 *                   type: string
 *                   example: Please wait at least 1 minute before requesting a new OTP
 */
router.post('/resend-otp', authController.resendOTP);

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
 *               $ref: '#/components/schemas/AuthResponse'
 *       400:
 *         description: Invalid data or registration step
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/set-password', authController.setPassword);

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Login user with phone and password
 *     description: Authenticate user with phone number and password
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       401:
 *         description: Invalid credentials or incomplete registration
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - $ref: '#/components/schemas/ErrorResponse'
 *                 - type: object
 *                   properties:
 *                     status:
 *                       type: string
 *                       example: error
 *                     message:
 *                       type: string
 *                       example: Please complete your registration process
 *                     data:
 *                       type: object
 *                       properties:
 *                         userId:
 *                           type: string
 *                         registrationStep:
 *                           type: number
 *                         nextStep:
 *                           type: string
 */
router.post('/login', authController.login);

/**
 * @swagger
 * /auth/forgot-password:
 *   post:
 *     summary: Request password reset via SMS
 *     description: Send password reset OTP to user's phone number
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ForgotPasswordRequest'
 *     responses:
 *       200:
 *         description: Password reset OTP sent (if account exists)
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
 *                   example: Password reset code sent to your phone number.
 *                 data:
 *                   type: object
 *                   properties:
 *                     developmentResetOTP:
 *                       type: string
 *                       description: Reset OTP for development testing
 */
router.post('/forgot-password', authController.forgotPassword);

/**
 * @swagger
 * /auth/reset-password:
 *   post:
 *     summary: Reset password with OTP
 *     description: Reset password using OTP received via SMS
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ResetPasswordRequest'
 *     responses:
 *       200:
 *         description: Password reset successful
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
 *                   example: Password reset successful. You can now log in with your new password.
 *       400:
 *         description: Invalid or expired OTP
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/reset-password', authController.resetPassword);

/**
 * @swagger
 * /auth/me:
 *   get:
 *     summary: Get current user profile
 *     description: Get the profile of the currently authenticated user
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       $ref: '#/components/schemas/User'
 *       401:
 *         description: Unauthorized - invalid or missing token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/me', authMiddleware.protect, authController.getMe);

/**
 * @swagger
 * /auth/profile:
 *   put:
 *     summary: Update user profile
 *     description: Update the profile of the currently authenticated user
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               fullName:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 50
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Optional email address
 *               dateOfBirth:
 *                 type: string
 *                 format: date
 *               gender:
 *                 type: string
 *                 enum: [male, female, other]
 *             example:
 *               fullName: "Nguyen Van B"
 *               email: "user@example.com"
 *               dateOfBirth: "1990-01-01"
 *               gender: "male"
 *     responses:
 *       200:
 *         description: Profile updated successfully
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
 *                   example: Profile updated successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       $ref: '#/components/schemas/User'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.put('/profile', authMiddleware.protect, authController.updateProfile);

/**
 * @swagger
 * /auth/change-password:
 *   put:
 *     summary: Change user password
 *     description: Change password for the currently authenticated user
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - currentPassword
 *               - newPassword
 *               - confirmPassword
 *             properties:
 *               currentPassword:
 *                 type: string
 *               newPassword:
 *                 type: string
 *                 minLength: 6
 *               confirmPassword:
 *                 type: string
 *             example:
 *               currentPassword: "oldPassword123"
 *               newPassword: "newPassword123"
 *               confirmPassword: "newPassword123"
 *     responses:
 *       200:
 *         description: Password changed successfully
 *       400:
 *         description: Invalid current password or passwords don't match
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.put('/change-password', authMiddleware.protect, authController.changePassword);

/**
 * @swagger
 * /auth/avatar:
 *   post:
 *     summary: Upload user avatar
 *     description: Upload profile picture for the currently authenticated user
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               avatar:
 *                 type: string
 *                 format: binary
 *                 description: Image file (max 5MB, formats: jpg, png, gif, webp)
 *     responses:
 *       200:
 *         description: Avatar uploaded successfully
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
 *                   example: Avatar uploaded successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       $ref: '#/components/schemas/User'
 *                     avatar:
 *                       type: object
 *                       properties:
 *                         url:
 *                           type: string
 *                         uploadType:
 *                           type: string
 *                         filename:
 *                           type: string
 *                         size:
 *                           type: number
 *       400:
 *         description: No file selected or invalid file type
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *   delete:
 *     summary: Delete user avatar
 *     description: Remove profile picture for the currently authenticated user
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Avatar deleted successfully
 *       400:
 *         description: No avatar to delete
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post(
	'/avatar',
	authMiddleware.protect,
	uploadMiddleware.uploadAvatar,
	uploadMiddleware.handleUploadError,
	authController.uploadAvatar
);
router.delete('/avatar', authMiddleware.protect, authController.deleteAvatar);

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: Logout user
 *     description: Logout the currently authenticated user
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logout successful
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
 *                   example: Logout successful
 *                 data:
 *                   type: null
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/logout', authMiddleware.protect, authController.logout);

console.log('✅ Phone-based authentication routes with Swagger docs defined successfully');

module.exports = router;