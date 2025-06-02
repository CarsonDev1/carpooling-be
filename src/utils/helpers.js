const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// Generate JWT token
exports.generateToken = (id) => {
	return jwt.sign({ id }, process.env.JWT_SECRET, {
		expiresIn: process.env.JWT_EXPIRE || '7d',
	});
};

// Generate refresh token
exports.generateRefreshToken = (id) => {
	return jwt.sign({ id }, process.env.JWT_REFRESH_SECRET, {
		expiresIn: process.env.JWT_REFRESH_EXPIRE || '30d',
	});
};

// Verify refresh token
exports.verifyRefreshToken = (token) => {
	return jwt.verify(token, process.env.JWT_REFRESH_SECRET);
};

// Send token response
exports.sendTokenResponse = (user, statusCode, res, message = '') => {
	// Create token
	const token = this.generateToken(user._id);
	const refreshToken = this.generateRefreshToken(user._id);

	// Calculate expiry dates
	const tokenExpire = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
	const refreshTokenExpire = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

	// Save refresh token to user
	user.refreshTokens.push({
		token: refreshToken,
		expiresAt: refreshTokenExpire,
		isActive: true,
	});

	// Clean up old refresh tokens
	user.cleanupRefreshTokens();

	// Cookie options
	const options = {
		expires: tokenExpire,
		httpOnly: true,
		secure: process.env.NODE_ENV === 'production',
		sameSite: 'strict',
	};

	// Remove password from output
	user.password = undefined;
	user.refreshTokens = undefined;

	res.status(statusCode)
		.cookie('token', token, options)
		.json({
			status: 'success',
			message,
			data: {
				token,
				refreshToken,
				user,
				expiresAt: tokenExpire,
			},
		});
};

// Hash token (for storing in database)
exports.hashToken = (token) => {
	return crypto.createHash('sha256').update(token).digest('hex');
};

// Generate random token
exports.generateRandomToken = () => {
	return crypto.randomBytes(32).toString('hex');
};

// Calculate user age
exports.calculateAge = (dateOfBirth) => {
	if (!dateOfBirth) return null;

	const today = new Date();
	const birthDate = new Date(dateOfBirth);
	let age = today.getFullYear() - birthDate.getFullYear();
	const monthDiff = today.getMonth() - birthDate.getMonth();

	if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
		age--;
	}

	return age;
};

// Format user response (remove sensitive data)
exports.formatUserResponse = (user) => {
	const userObj = user.toObject ? user.toObject() : user;

	// Remove sensitive fields
	delete userObj.password;
	delete userObj.refreshTokens;
	delete userObj.verificationToken;
	delete userObj.verificationTokenExpire;
	delete userObj.resetPasswordToken;
	delete userObj.resetPasswordExpire;
	delete userObj.loginAttempts;
	delete userObj.lockUntil;

	// Add computed fields
	if (userObj.dateOfBirth) {
		userObj.age = this.calculateAge(userObj.dateOfBirth);
	}

	return userObj;
};

// Validate Vietnamese phone number
exports.validateVietnamesePhone = (phone) => {
	// Vietnamese phone number patterns
	const patterns = [
		/^(\+84|84|0)(3[2-9]|5[689]|7[06-9]|8[1-689]|9[0-46-9])[0-9]{7}$/,
		/^(\+84|84|0)(1[2689])[0-9]{8}$/,
	];

	return patterns.some((pattern) => pattern.test(phone));
};

// Clean phone number (remove spaces, dashes, etc.)
exports.cleanPhoneNumber = (phone) => {
	if (!phone) return '';
	return phone.replace(/[\s\-\(\)]/g, '');
};

// Generate verification code (6 digits)
exports.generateVerificationCode = () => {
	return Math.floor(100000 + Math.random() * 900000).toString();
};

// Rate limiting key generator
exports.generateRateLimitKey = (req, suffix = '') => {
	const ip = req.ip || req.connection.remoteAddress;
	const userAgent = req.get('User-Agent') || '';
	return `${ip}:${userAgent}${suffix ? ':' + suffix : ''}`;
};
