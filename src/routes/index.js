// src/routes/index.js - Fixed version
const express = require('express');
const router = express.Router();

console.log('🔥 Loading main routes index...');

// Health check endpoint for API
router.get('/health', (req, res) => {
	res.json({
		message: 'API working!',
		timestamp: new Date().toISOString(),
		endpoint: '/api/health',
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

// Import and mount trips routes
try {
	console.log('📝 Loading trips routes...');
	const tripsRoutes = require('./trips');
	router.use('/trips', tripsRoutes);
	console.log('✅ Trips routes mounted at /trips');
} catch (error) {
	console.error('❌ Failed to load trips routes:', error.message);
	router.use('/trips', (req, res) => {
		res.status(500).json({
			error: 'Trips routes loading failed',
			message: error.message,
		});
	});
}

// Import and mount ratings routes
try {
	console.log('📝 Loading ratings routes...');
	const ratingsRoutes = require('./ratings');
	router.use('/ratings', ratingsRoutes);
	console.log('✅ Ratings routes mounted at /ratings');
} catch (error) {
	console.error('❌ Failed to load ratings routes:', error.message);
	router.use('/ratings', (req, res) => {
		res.status(500).json({
			error: 'Ratings routes loading failed',
			message: error.message,
		});
	});
}

// Import and mount notifications routes
try {
	console.log('📝 Loading notifications routes...');
	const notificationsRoutes = require('./notifications');
	router.use('/notifications', notificationsRoutes);
	console.log('✅ Notifications routes mounted at /notifications');
} catch (error) {
	console.error('❌ Failed to load notifications routes:', error.message);
	router.use('/notifications', (req, res) => {
		res.status(500).json({
			error: 'Notifications routes loading failed',
			message: error.message,
		});
	});
}

// Import and mount feedback routes
try {
	console.log('📝 Loading feedback routes...');
	const feedbackRoutes = require('./feedback');
	router.use('/feedback', feedbackRoutes);
	console.log('✅ Feedback routes mounted at /feedback');
} catch (error) {
	console.error('❌ Failed to load feedback routes:', error.message);
	router.use('/feedback', (req, res) => {
		res.status(500).json({
			error: 'Feedback routes loading failed',
			message: error.message,
		});
	});
}

// Import and mount chat routes
try {
	console.log('📝 Loading chat routes...');
	const chatRoutes = require('./chat');
	router.use('/chats', chatRoutes);
	console.log('✅ Chat routes mounted at /chats');
} catch (error) {
	console.error('❌ Failed to load chat routes:', error.message);
	router.use('/chats', (req, res) => {
		res.status(500).json({
			error: 'Chat routes loading failed',
			message: error.message,
		});
	});
}

// Import and mount driver routes
try {
	console.log('📝 Loading driver routes...');
	const driverRoutes = require('./drivers');
	router.use('/drivers', driverRoutes);
	console.log('✅ Driver routes mounted at /drivers');
} catch (error) {
	console.error('❌ Failed to load driver routes:', error.message);
	router.use('/drivers', (req, res) => {
		res.status(500).json({
			error: 'Driver routes loading failed',
			message: error.message,
		});
	});
}

// Import and mount payment routes
try {
	console.log('📝 Loading payment routes...');
	const paymentRoutes = require('./payments');
	router.use('/payments', paymentRoutes);
	console.log('✅ Payment routes mounted at /payments');
} catch (error) {
	console.error('❌ Failed to load payment routes:', error.message);
	router.use('/payments', (req, res) => {
		res.status(500).json({
			error: 'Payment routes loading failed',
			message: error.message,
		});
	});
}

// Import and mount admin routes
try {
	console.log('📝 Loading admin routes...');
	const adminRoutes = require('./admin');
	router.use('/admin', adminRoutes);
	console.log('✅ Admin routes mounted at /admin');
} catch (error) {
	console.error('❌ Failed to load admin routes:', error.message);
	router.use('/admin', (req, res) => {
		res.status(500).json({
			error: 'Admin routes loading failed',
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
			'POST /api/auth/login',
		],
	});
});

console.log('✅ Main routes index loaded successfully');

module.exports = router;
