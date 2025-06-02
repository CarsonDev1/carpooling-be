// User roles
exports.USER_ROLES = {
	DRIVER: 'driver',
	PASSENGER: 'passenger',
	BOTH: 'both',
	ADMIN: 'admin',
};

// Gender options
exports.GENDERS = {
	MALE: 'male',
	FEMALE: 'female',
	OTHER: 'other',
};

// Account status
exports.ACCOUNT_STATUS = {
	ACTIVE: 'active',
	INACTIVE: 'inactive',
	SUSPENDED: 'suspended',
	PENDING_VERIFICATION: 'pending_verification',
};

// Token types
exports.TOKEN_TYPES = {
	ACCESS: 'access',
	REFRESH: 'refresh',
	EMAIL_VERIFICATION: 'email_verification',
	PASSWORD_RESET: 'password_reset',
};

// Email templates
exports.EMAIL_TEMPLATES = {
	VERIFICATION: 'verification',
	PASSWORD_RESET: 'password_reset',
	WELCOME: 'welcome',
	PASSWORD_CHANGED: 'password_changed',
};

// Response messages
exports.MESSAGES = {
	SUCCESS: {
		REGISTRATION: 'Registration successful! Please check your email to verify your account.',
		LOGIN: 'Login successful',
		LOGOUT: 'Logout successful',
		PROFILE_UPDATED: 'Profile updated successfully',
		PASSWORD_CHANGED: 'Password changed successfully',
		EMAIL_VERIFIED: 'Email verified successfully',
		PASSWORD_RESET_SENT: 'Password reset email sent successfully',
		PASSWORD_RESET: 'Password reset successful',
		VERIFICATION_SENT: 'Verification email sent successfully',
		AVATAR_UPLOADED: 'Avatar uploaded successfully',
		ACCOUNT_DELETED: 'Account deleted successfully',
	},
	ERROR: {
		INVALID_CREDENTIALS: 'Invalid email or password',
		ACCOUNT_LOCKED: 'Account is temporarily locked due to too many failed login attempts',
		ACCOUNT_DEACTIVATED: 'Account has been deactivated',
		EMAIL_NOT_VERIFIED: 'Please verify your email address',
		INVALID_TOKEN: 'Invalid or expired token',
		USER_NOT_FOUND: 'User not found',
		EMAIL_EXISTS: 'Email already exists',
		PHONE_EXISTS: 'Phone number already exists',
		INCORRECT_PASSWORD: 'Current password is incorrect',
		EMAIL_SEND_FAILED: 'Failed to send email',
		FILE_UPLOAD_FAILED: 'File upload failed',
		INVALID_FILE_TYPE: 'Please upload only image files',
		FILE_TOO_LARGE: 'File too large. Maximum size is 5MB',
	},
};

// Validation rules
exports.VALIDATION = {
	PASSWORD: {
		MIN_LENGTH: 6,
		PATTERN: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
		MESSAGE: 'Password must contain at least one uppercase letter, one lowercase letter, and one number',
	},
	FULL_NAME: {
		MIN_LENGTH: 2,
		MAX_LENGTH: 50,
		PATTERN: /^[a-zA-Z\s\u00C0-\u024F\u1E00-\u1EFF]+$/,
		MESSAGE: 'Full name can only contain letters and spaces',
	},
	PHONE: {
		PATTERN: /^[0-9]{10,11}$/,
		MESSAGE: 'Please provide a valid phone number',
	},
	EMAIL: {
		PATTERN: /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
		MESSAGE: 'Please provide a valid email address',
	},
};

// File upload limits
exports.UPLOAD_LIMITS = {
	AVATAR: {
		MAX_SIZE: 5 * 1024 * 1024, // 5MB
		ALLOWED_TYPES: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'],
		DIMENSIONS: {
			WIDTH: 400,
			HEIGHT: 400,
		},
	},
};

// Rate limiting
exports.RATE_LIMITS = {
	STRICT: {
		WINDOW: 15 * 60 * 1000, // 15 minutes
		MAX: 5, // 5 attempts
	},
	AUTH: {
		WINDOW: 15 * 60 * 1000, // 15 minutes
		MAX: 10, // 10 attempts
	},
	GENERAL: {
		WINDOW: 15 * 60 * 1000, // 15 minutes
		MAX: 100, // 100 requests
	},
};

// JWT configuration
exports.JWT = {
	ACCESS_TOKEN_EXPIRE: '7d',
	REFRESH_TOKEN_EXPIRE: '30d',
	ALGORITHM: 'HS256',
};

// Account security
exports.SECURITY = {
	MAX_LOGIN_ATTEMPTS: 5,
	LOCK_TIME: 2 * 60 * 60 * 1000, // 2 hours
	PASSWORD_RESET_EXPIRE: 30 * 60 * 1000, // 30 minutes
	EMAIL_VERIFICATION_EXPIRE: 24 * 60 * 60 * 1000, // 24 hours
	REFRESH_TOKEN_EXPIRE: 30 * 24 * 60 * 60 * 1000, // 30 days
};
