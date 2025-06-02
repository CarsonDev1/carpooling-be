const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Protect routes - verify JWT token
exports.protect = async (req, res, next) => {
	try {
		let token;

		// Get token from header
		if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
			token = req.headers.authorization.split(' ')[1];
		}

		// Check if token exists
		if (!token) {
			return res.status(401).json({
				status: 'error',
				message: 'Access denied. No token provided.',
			});
		}

		try {
			// Verify token
			const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');

			console.log('🔍 Token decoded:', decoded);

			// Get user from token
			const user = await User.findById(decoded.id).select('-password');

			if (!user) {
				return res.status(401).json({
					status: 'error',
					message: 'Token is invalid - user not found',
				});
			}

			// Check if user is active
			if (!user.isActive) {
				return res.status(401).json({
					status: 'error',
					message: 'Account has been deactivated',
				});
			}

			console.log('✅ User authenticated:', user.email);
			req.user = user;
			next();
		} catch (error) {
			console.error('❌ Token verification failed:', error.message);
			return res.status(401).json({
				status: 'error',
				message: 'Token is invalid',
			});
		}
	} catch (error) {
		console.error('❌ Auth middleware error:', error);
		res.status(500).json({
			status: 'error',
			message: 'Authentication failed',
		});
	}
};

// Optional authentication - doesn't fail if no token
exports.optionalAuth = async (req, res, next) => {
	try {
		let token;

		if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
			token = req.headers.authorization.split(' ')[1];
		}

		if (token) {
			try {
				const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
				const user = await User.findById(decoded.id).select('-password');

				if (user && user.isActive) {
					req.user = user;
				}
			} catch (error) {
				// Token invalid, but we don't fail - just continue without user
				console.log('Optional auth failed:', error.message);
			}
		}

		next();
	} catch (error) {
		next(error);
	}
};
