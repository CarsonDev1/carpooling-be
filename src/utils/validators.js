const { body, param } = require('express-validator');

// Register validation
exports.validateRegister = [
	body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email'),

	body('password')
		.isLength({ min: 6 })
		.withMessage('Password must be at least 6 characters')
		.matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
		.withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),

	body('fullName')
		.trim()
		.isLength({ min: 2, max: 50 })
		.withMessage('Full name must be between 2 and 50 characters')
		.matches(/^[a-zA-Z\s\u00C0-\u024F\u1E00-\u1EFF]+$/)
		.withMessage('Full name can only contain letters and spaces'),

	body('phone').optional().isMobilePhone(['vi-VN']).withMessage('Please provide a valid Vietnamese phone number'),

	body('dateOfBirth')
		.optional()
		.isISO8601()
		.withMessage('Please provide a valid date')
		.custom((value) => {
			const date = new Date(value);
			const today = new Date();
			const eighteenYearsAgo = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate());

			if (date > eighteenYearsAgo) {
				throw new Error('You must be at least 18 years old');
			}
			return true;
		}),

	body('gender').optional().isIn(['male', 'female', 'other']).withMessage('Gender must be male, female, or other'),
];

// Login validation
exports.validateLogin = [
	body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email'),

	body('password').notEmpty().withMessage('Password is required'),
];

// Forgot password validation
exports.validateForgotPassword = [body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email')];

// Reset password validation
exports.validateResetPassword = [
	body('password')
		.isLength({ min: 6 })
		.withMessage('Password must be at least 6 characters')
		.matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
		.withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),

	body('confirmPassword').custom((value, { req }) => {
		if (value !== req.body.password) {
			throw new Error('Passwords do not match');
		}
		return true;
	}),

	param('token').notEmpty().withMessage('Reset token is required'),
];

// Change password validation
exports.validateChangePassword = [
	body('currentPassword').notEmpty().withMessage('Current password is required'),

	body('newPassword')
		.isLength({ min: 6 })
		.withMessage('New password must be at least 6 characters')
		.matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
		.withMessage('New password must contain at least one uppercase letter, one lowercase letter, and one number'),

	body('confirmPassword').custom((value, { req }) => {
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

	body('phone').optional().isMobilePhone(['vi-VN']).withMessage('Please provide a valid Vietnamese phone number'),

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

	body('gender').optional().isIn(['male', 'female', 'other']).withMessage('Gender must be male, female, or other'),
];

// Verify email validation
exports.validateVerifyEmail = [param('token').notEmpty().withMessage('Verification token is required')];
