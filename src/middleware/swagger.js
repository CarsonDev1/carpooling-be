// src/middleware/swagger.js
const { specs, swaggerUi, swaggerUiOptions } = require('../config/swagger');

// Debug function to check specs
const debugSwagger = () => {
	console.log('🔍 Swagger Debug Info:');
	console.log('📊 Specs paths found:', Object.keys(specs.paths || {}));
	console.log('📋 Schemas found:', Object.keys(specs.components?.schemas || {}));

	if (!specs.paths || Object.keys(specs.paths).length === 0) {
		console.log('⚠️ No paths found in Swagger specs!');
		console.log('📁 Check if routes files contain JSDoc comments');
	} else {
		console.log('✅ Swagger specs loaded successfully');
		console.log('📍 Available paths:', Object.keys(specs.paths));
	}

	return specs;
};

// Middleware to serve swagger documentation
const serveSwagger = swaggerUi.serve;

const setupSwagger = (req, res, next) => {
	// Debug on setup
	const currentSpecs = debugSwagger();

	// Enhanced Swagger UI options with CORS support
	const enhancedOptions = {
		...swaggerUiOptions,
		swaggerOptions: {
			...swaggerUiOptions.swaggerOptions,
			// Use relative URLs to avoid CORS issues
			url: '/api-docs/swagger.json',
			// Support CORS for Try It Out
			requestInterceptor: (req) => {
				console.log('📤 Swagger request interceptor:', req.url);
				// Ensure proper headers for CORS
				req.headers = {
					...req.headers,
					'Content-Type': 'application/json',
					'Accept': 'application/json'
				};
				return req;
			},
			responseInterceptor: (res) => {
				console.log('📥 Swagger response interceptor:', res.status, res.url);
				return res;
			}
		}
	};

	// Add current server dynamically
	const finalSpecs = {
		...currentSpecs,
		servers: [
			{
				url: `${req.protocol}://${req.get('host')}/api`,
				description: 'Current server (auto-detected)',
			},
			{
				url: 'http://localhost:5000/api',
				description: 'Local development server',
			}
		],
	};

	console.log('🌐 Swagger UI configured for:', finalSpecs.servers);
	return swaggerUi.setup(finalSpecs, enhancedOptions)(req, res, next);
};

// Endpoint to serve swagger spec as JSON (for CORS-friendly loading)
const serveSwaggerSpec = (req, res) => {
	const currentSpecs = debugSwagger();

	const finalSpecs = {
		...currentSpecs,
		servers: [
			{
				url: `${req.protocol}://${req.get('host')}/api`,
				description: 'Current server',
			},
			{
				url: 'http://localhost:5000/api',
				description: 'Development server',
			}
		],
	};

	res.header('Access-Control-Allow-Origin', '*');
	res.header('Content-Type', 'application/json');
	res.json(finalSpecs);
};

module.exports = {
	serveSwagger,
	setupSwagger,
	serveSwaggerSpec
};