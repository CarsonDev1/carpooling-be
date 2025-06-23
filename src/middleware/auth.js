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

// Check if user has driver role
exports.requireDriver = async (req, res, next) => {
	try {
		// This middleware should be used after protect middleware
		if (!req.user) {
			return res.status(401).json({
				success: false,
				error: 'Authentication required',
			});
		}

		// Check if user is a driver
		if (!['driver', 'both'].includes(req.user.role)) {
			return res.status(403).json({
				success: false,
				error: 'Driver access required. Please register as a driver first.',
			});
		}

		next();
	} catch (error) {
		console.error('Driver middleware error:', error);
		res.status(500).json({
			success: false,
			error: 'Authorization failed',
		});
	}
};

// Check if user has passenger role
exports.requirePassenger = async (req, res, next) => {
	try {
		if (!req.user) {
			return res.status(401).json({
				success: false,
				error: 'Authentication required',
			});
		}

		// Check if user is a passenger
		if (!['passenger', 'both'].includes(req.user.role)) {
			return res.status(403).json({
				success: false,
				error: 'Passenger access required.',
			});
		}

		next();
	} catch (error) {
		console.error('Passenger middleware error:', error);
		res.status(500).json({
			success: false,
			error: 'Authorization failed',
		});
	}
};

// Check if user has admin role
exports.requireAdmin = async (req, res, next) => {
	try {
		if (!req.user) {
			return res.status(401).json({
				success: false,
				error: 'Authentication required',
			});
		}

		// Check if user is an admin
		if (req.user.role !== 'admin') {
			return res.status(403).json({
				success: false,
				error: 'Admin access required.',
			});
		}

		next();
	} catch (error) {
		console.error('Admin middleware error:', error);
		res.status(500).json({
			success: false,
			error: 'Authorization failed',
		});
	}
};
