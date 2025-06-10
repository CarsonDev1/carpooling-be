const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { serveSwagger, setupSwagger } = require('./middleware/swagger');

const app = express();

// CORS configuration - Allow all origins for development
const corsOptions = {
	origin: true, // Allow all origins in development
	methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'],
	allowedHeaders: [
		'Origin',
		'X-Requested-With',
		'Content-Type',
		'Accept',
		'Authorization',
		'Cache-Control',
		'Pragma',
		'X-API-Key'
	],
	credentials: false,
	optionsSuccessStatus: 200,
	preflightContinue: false
};

// Apply CORS middleware
app.use(cors(corsOptions));

// Handle preflight requests explicitly
app.options('*', cors(corsOptions));

// Additional CORS headers for Swagger compatibility
app.use((req, res, next) => {
	res.header('Access-Control-Allow-Origin', '*');
	res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,PATCH,OPTIONS');
	res.header(
		'Access-Control-Allow-Headers',
		'Origin, X-Requested-With, Content-Type, Accept, Authorization, Cache-Control, Pragma'
	);
	res.header('Access-Control-Allow-Credentials', 'false');

	// Handle preflight requests
	if (req.method === 'OPTIONS') {
		res.sendStatus(200);
		return;
	}

	next();
});

// Middleware cơ bản
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use('/uploads', express.static('uploads'));

// Tắt X-Powered-By header để bảo mật
app.disable('x-powered-by');

// Trust proxy for correct IP detection
app.set('trust proxy', true);

// Swagger Documentation - MUST be before other routes
app.use('/api-docs', serveSwagger, setupSwagger);

// Redirect /docs to /api-docs for convenience
app.get('/docs', (req, res) => {
	res.redirect('/api-docs');
});

// Health check endpoint (before /api routes)
app.get('/health', (req, res) => {
	res.json({
		message: 'Server working!',
		timestamp: new Date().toISOString(),
		cors: 'enabled - all origins allowed',
		swagger: 'available at /api-docs'
	});
});

// Simple test route
app.get('/test', (req, res) => {
	res.json({
		message: 'Direct test route working',
		method: req.method,
		url: req.url,
		headers: {
			origin: req.get('Origin'),
			userAgent: req.get('User-Agent')
		}
	});
});

// Load API routes with error handling
try {
	console.log('Loading API routes...');
	const routes = require('./routes');
	app.use('/api', routes);
	console.log('✅ API routes registered successfully');
} catch (error) {
	console.error('❌ Routes loading error:', error);

	// Fallback route if routes fail
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

	// CORS headers for error responses
	res.header('Access-Control-Allow-Origin', '*');
	res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,PATCH,OPTIONS');

	res.status(500).json({
		status: 'error',
		message: 'Internal server error',
		error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong',
	});
});

// 404 handler
app.all('*', (req, res) => {
	// CORS headers for 404 responses
	res.header('Access-Control-Allow-Origin', '*');
	res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,PATCH,OPTIONS');

	res.status(404).json({
		status: 'error',
		message: `Route ${req.originalUrl} not found`,
		availableRoutes: [
			'GET /health - Health check',
			'GET /test - Simple test',
			'GET /api-docs - Swagger documentation',
			'GET /api/health - API health check',
			'GET /api/auth/test - Auth test'
		]
	});
});

module.exports = app;