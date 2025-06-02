const express = require('express');
const router = express.Router();

console.log('Loading routes...');

// Health check
router.get('/health', (req, res) => {
	res.json({
		status: 'success',
		message: 'API Health OK',
		timestamp: new Date().toISOString(),
	});
});

// API info
router.get('/', (req, res) => {
	res.json({
		status: 'success',
		message: 'Welcome to Carpooling API',
		version: '1.0.0',
	});
});

// Simple route (đã working)
try {
	const simpleRoutes = require('./simple');
	router.use('/simple', simpleRoutes);
	console.log('✅ Simple routes loaded');
} catch (error) {
	console.error('❌ Simple routes error:', error);
}

// Thêm auth routes từ từ
try {
	const authRoutes = require('./auth');
	router.use('/auth', authRoutes);
	console.log('✅ Auth routes loaded');
} catch (error) {
	console.error('❌ Auth routes error:', error);
}

module.exports = router;
