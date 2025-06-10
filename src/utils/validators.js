const { body, param } = require('express-validator');

// Step 1: Register validation (email + fullName only)
exports.validateRegisterStep1 = [
	body('email')
		.isEmail()
		.normalizeEmail()
		.withMessage('Please provide a valid email'),

	body('fullName')
		.trim()
		.isLength({ min: 2, max: 50 })
		.withMessage('Full name must be between 2 and 50 characters')
		.matches(/^[a-zA-Z\s\u00C0-\u024F\u1E00-\u1EFF]+$/)
		.withMessage('Full name can only contain letters and spaces'),
];

// Step 2: Send OTP validation
exports.validateSendOTP = [
	body('userId')
		.notEmpty()
		.withMessage('User ID is required')
		.isMongoId()
		.withMessage('Invalid user ID format'),

	body('phone')
		.notEmpty()
		.withMessage('Phone number is required')
		.matches(/^[0-9]{10,11}$/)
		.withMessage('Please provide a valid phone number (10-11 digits)')
		.custom((value) => {
			// Vietnamese phone number validation
			const cleanPhone = value.replace(/\D/g, '');
			const patterns = [
				/^(84|0)(3[2-9]|5[689]|7[06-9]|8[1-689]|9[0-46-9])[0-9]{7}$/,  // Mobile
				/^(84|0)(1[2689])[0-9]{8}$/  // Old mobile format
			];

			const isValid = patterns.some(pattern => pattern.test(cleanPhone));
			if (!isValid) {
				throw new Error('Please provide a valid Vietnamese phone number');
			}
			return true;
		}),
];

// Step 2.5: Verify OTP validation
exports.validateVerifyOTP = [
	body('userId')
		.notEmpty()
		.withMessage('User ID is required')
		.isMongoId()
		.withMessage('Invalid user ID format'),

	body('otp')
		.notEmpty()
		.withMessage('OTP is required')
		.isLength({ min: 6, max: 6 })
		.withMessage('OTP must be exactly 6 digits')
		.matches(/^[0-9]{6}$/)
		.withMessage('OTP must contain only numbers'),
];

// Step 2.6: Resend OTP validation
exports.validateResendOTP = [
	body('userId')
		.notEmpty()
		.withMessage('User ID is required')
		.isMongoId()
		.withMessage('Invalid user ID format'),
];

// Step 3: Set password validation
exports.validateSetPassword = [
	body('userId')
		.notEmpty()
		.withMessage('User ID is required')
		.isMongoId()
		.withMessage('Invalid user ID format'),

	body('password')
		.isLength({ min: 6 })
		.withMessage('Password must be at least 6 characters')
		.matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
		.withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),

	body('confirmPassword')
		.notEmpty()
		.withMessage('Confirm password is required')
		.custom((value, { req }) => {
			if (value !== req.body.password) {
				throw new Error('Passwords do not match');
			}
			return true;
		}),
];

// Login validation (updated for new flow)
exports.validateLogin = [
	body('email')
		.isEmail()
		.normalizeEmail()
		.withMessage('Please provide a valid email'),

	body('password')
		.notEmpty()
		.withMessage('Password is required'),
];

// Forgot password validation
exports.validateForgotPassword = [
	body('email')
		.isEmail()
		.normalizeEmail()
		.withMessage('Please provide a valid email')
];

// Reset password validation
exports.validateResetPassword = [
	body('password')
		.isLength({ min: 6 })
		.withMessage('Password must be at least 6 characters')
		.matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
		.withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),

	body('confirmPassword')
		.custom((value, { req }) => {
			if (value !== req.body.password) {
				throw new Error('Passwords do not match');
			}
			return true;
		}),

	param('token')
		.notEmpty()
		.withMessage('Reset token is required'),
];

// Change password validation
exports.validateChangePassword = [
	body('currentPassword')
		.notEmpty()
		.withMessage('Current password is required'),

	body('newPassword')
		.isLength({ min: 6 })
		.withMessage('New password must be at least 6 characters')
		.matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
		.withMessage('New password must contain at least one uppercase letter, one lowercase letter, and one number'),

	body('confirmPassword')
		.custom((value, { req }) => {
			if (value !== req.body.newPassword) {
				throw new Error('Passwords do not match');
			}
			return true;
		}),
];

// Update profile validation
exports.validateUpdateProfile = [
	body('fullName')
		.optional()
		.trim()
		.isLength({ min: 2, max: 50 })
		.withMessage('Full name must be between 2 and 50 characters')
		.matches(/^[a-zA-Z\s\u00C0-\u024F\u1E00-\u1EFF]+$/)
		.withMessage('Full name can only contain letters and spaces'),

	body('phone')
		.optional()
		.matches(/^[0-9]{10,11}$/)
		.withMessage('Please provide a valid phone number')
		.custom((value) => {
			if (value) {
				// Vietnamese phone number validation
				const cleanPhone = value.replace(/\D/g, '');
				const patterns = [
					/^(84|0)(3[2-9]|5[689]|7[06-9]|8[1-689]|9[0-46-9])[0-9]{7}$/,
					/^(84|0)(1[2689])[0-9]{8}$/
				];

				const isValid = patterns.some(pattern => pattern.test(cleanPhone));
				if (!isValid) {
					throw new Error('Please provide a valid Vietnamese phone number');
				}
			}
			return true;
		}),

	body('dateOfBirth')
		.optional()
		.isISO8601()
		.withMessage('Please provide a valid date')
		.custom((value) => {
			if (value) {
				const date = new Date(value);
				const today = new Date();
				const eighteenYearsAgo = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate());

				if (date > eighteenYearsAgo) {
					throw new Error('You must be at least 18 years old');
				}
			}
			return true;
		}),

	body('gender')
		.optional()
		.isIn(['male', 'female', 'other'])
		.withMessage('Gender must be male, female, or other'),

	body('role')
		.optional()
		.isIn(['driver', 'passenger', 'both'])
		.withMessage('Role must be driver, passenger, or both'),

	// Vehicle validation (optional, for drivers)
	body('vehicle.brand')
		.optional()
		.trim()
		.isLength({ min: 1, max: 50 })
		.withMessage('Vehicle brand must be between 1 and 50 characters'),

	body('vehicle.model')
		.optional()
		.trim()
		.isLength({ min: 1, max: 50 })
		.withMessage('Vehicle model must be between 1 and 50 characters'),

	body('vehicle.licensePlate')
		.optional()
		.trim()
		.matches(/^[0-9]{2}[A-Z]{1,2}-[0-9]{4,5}$/)
		.withMessage('Please provide a valid Vietnamese license plate format (e.g., 29A-12345)'),

	body('vehicle.seats')
		.optional()
		.isInt({ min: 1, max: 8 })
		.withMessage('Vehicle seats must be between 1 and 8'),

	body('vehicle.year')
		.optional()
		.isInt({ min: 1990, max: new Date().getFullYear() + 1 })
		.withMessage('Vehicle year must be between 1990 and next year'),

	body('vehicle.color')
		.optional()
		.trim()
		.isLength({ min: 1, max: 30 })
		.withMessage('Vehicle color must be between 1 and 30 characters'),

	// Addresses validation
	body('addresses')
		.optional()
		.isArray({ max: 10 })
		.withMessage('You can have maximum 10 saved addresses'),

	body('addresses.*.label')
		.optional()
		.trim()
		.isLength({ min: 1, max: 50 })
		.withMessage('Address label must be between 1 and 50 characters'),

	body('addresses.*.address')
		.optional()
		.trim()
		.isLength({ min: 5, max: 200 })
		.withMessage('Address must be between 5 and 200 characters'),

	body('addresses.*.coordinates.lat')
		.optional()
		.isFloat({ min: -90, max: 90 })
		.withMessage('Latitude must be between -90 and 90'),

	body('addresses.*.coordinates.lng')
		.optional()
		.isFloat({ min: -180, max: 180 })
		.withMessage('Longitude must be between -180 and 180'),

	// Notification settings validation
	body('notificationSettings.email')
		.optional()
		.isBoolean()
		.withMessage('Email notification setting must be true or false'),

	body('notificationSettings.push')
		.optional()
		.isBoolean()
		.withMessage('Push notification setting must be true or false'),

	body('notificationSettings.sms')
		.optional()
		.isBoolean()
		.withMessage('SMS notification setting must be true or false'),
];

// Custom validation for registration step
exports.validateRegistrationStep = (requiredStep) => {
	return async (req, res, next) => {
		try {
			const { userId } = req.body;

			if (!userId) {
				return res.status(400).json({
					status: 'error',
					message: 'User ID is required',
				});
			}

			const User = require('../models/User');
			const user = await User.findById(userId);

			if (!user) {
				return res.status(404).json({
					status: 'error',
					message: 'User not found',
				});
			}

			if (user.registrationStep !== requiredStep) {
				const stepNames = {
					1: 'email registration',
					2: 'phone verification',
					3: 'password setup',
					4: 'completed'
				};

				return res.status(400).json({
					status: 'error',
					message: `Invalid registration step. Expected: ${stepNames[requiredStep]}, Current: ${stepNames[user.registrationStep]}`,
					data: {
						currentStep: user.registrationStep,
						expectedStep: requiredStep,
						nextStep: user.registrationStep === 1 ? 'phone_verification' :
							user.registrationStep === 2 ? 'otp_verification' :
								user.registrationStep === 3 ? 'set_password' : 'completed'
					}
				});
			}

			req.registrationUser = user;
			next();
		} catch (error) {
			console.error('Registration step validation error:', error);
			res.status(500).json({
				status: 'error',
				message: 'Registration step validation failed',
				error: error.message,
			});
		}
	};
};

// Rate limiting validation for OTP requests
exports.validateOTPRateLimit = async (req, res, next) => {
	try {
		const { userId } = req.body;

		if (!userId) {
			return next();
		}

		const User = require('../models/User');
		const user = await User.findById(userId);

		if (!user) {
			return next();
		}

		// Check if OTP was sent recently (rate limiting)
		if (user.phoneOTPExpiry && user.phoneOTPExpiry > new Date(Date.now() - 60000)) {
			const timeLeft = Math.ceil((user.phoneOTPExpiry - (Date.now() - 60000)) / 1000);
			return res.status(429).json({
				status: 'error',
				message: `Please wait ${timeLeft} seconds before requesting another OTP`,
				data: {
					retryAfter: timeLeft,
					type: 'rate_limit'
				}
			});
		}

		next();
	} catch (error) {
		console.error('OTP rate limit validation error:', error);
		next(); // Continue even if validation fails
	}
};