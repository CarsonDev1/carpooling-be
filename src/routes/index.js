// src/routes/index.js - Fixed version
const express = require('express');
const router = express.Router();

console.log('🔥 Loading main routes index...');

// Health check endpoint for API
router.get('/health', (req, res) => {
	res.json({
		message: 'API working!',
		timestamp: new Date().toISOString(),
		endpoint: '/api/health'
	});
});

// Import and mount authentication routes
try {
	console.log('📝 Loading auth routes...');
	const authRoutes = require('./auth');
	router.use('/auth', authRoutes);
	console.log('✅ Auth routes mounted at /auth');
} catch (error) {
	console.error('❌ Failed to load auth routes:', error.message);

	// Fallback auth routes if main auth fails
	router.use('/auth', (req, res) => {
		res.status(500).json({
			error: 'Auth routes loading failed',
			message: error.message,
		});
	});
}

// Test routes for debugging
router.get('/test', (req, res) => {
	res.json({
		message: 'API test route working',
		availableRoutes: [
			'GET /api/health',
			'GET /api/test',
			'GET /api/auth/test',
			'POST /api/auth/register',
			'POST /api/auth/verify-otp',
			'POST /api/auth/set-password',
			'POST /api/auth/login'
		]
	});
});

// Add any other route modules here
// router.use('/trips', require('./trips'));
// router.use('/users', require('./users'));

console.log('✅ Main routes index loaded successfully');

module.exports = router;