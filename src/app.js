const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Chỉ dùng middleware cơ bản
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static('uploads'));

// Simple test route trước khi load routes
app.get('/health', (req, res) => {
	res.json({ message: 'Server working!' });
});

// Load routes với error handling
try {
	console.log('Loading routes...');
	const routes = require('./routes');
	app.use('/api', routes);
	console.log('Routes registered successfully');
} catch (error) {
	console.error('Routes error:', error);

	// Fallback route nếu routes fail
	app.use('/api', (req, res) => {
		res.status(500).json({
			error: 'Routes loading failed',
			message: error.message,
		});
	});
}

// Global error handler
app.use((error, req, res, next) => {
	console.error('Global error:', error);
	res.status(500).json({
		status: 'error',
		message: 'Internal server error',
		error: error.message,
	});
});

// 404 handler
app.all('*', (req, res) => {
	res.status(404).json({
		status: 'error',
		message: `Route ${req.originalUrl} not found`,
	});
});

module.exports = app;
