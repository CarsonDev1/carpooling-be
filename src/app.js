const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { serveSwagger, setupSwagger } = require('./middleware/swagger');

const app = express();

// CORS cho phép tất cả origins và methods
app.use(
	cors({
		origin: '*', // Cho phép tất cả domains
		methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'],
		allowedHeaders: ['*'], // Cho phép tất cả headers
		credentials: false, // Tắt credentials để tránh conflict với origin: '*'
		optionsSuccessStatus: 200, // Hỗ trợ legacy browsers
	})
);

// Thêm headers tùy chỉnh để đảm bảo không có policy nào bị chặn
app.use((req, res, next) => {
	res.header('Access-Control-Allow-Origin', '*');
	res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,PATCH,OPTIONS');
	res.header(
		'Access-Control-Allow-Headers',
		'Origin, X-Requested-With, Content-Type, Accept, Authorization, Cache-Control, Pragma'
	);
	res.header('Access-Control-Allow-Credentials', 'false');

	// Xử lý preflight requests
	if (req.method === 'OPTIONS') {
		res.sendStatus(200);
		return;
	}

	next();
});

// Middleware cơ bản
app.use(express.json({ limit: '50mb' })); // Tăng limit cho large payloads
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use('/uploads', express.static('uploads'));

// Tắt X-Powered-By header để bảo mật
app.disable('x-powered-by');

// Swagger Documentation
app.use('/api-docs', serveSwagger, setupSwagger);

// Redirect /docs to /api-docs for convenience
app.get('/docs', (req, res) => {
	res.redirect('/api-docs');
});

// Simple test route trước khi load routes
app.get('/health', (req, res) => {
	res.json({
		message: 'Server working!',
		timestamp: new Date().toISOString(),
		cors: 'disabled - all origins allowed',
	});
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
