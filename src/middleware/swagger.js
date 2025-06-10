// src/middleware/swagger.js - Fixed version
const swaggerUi = require('swagger-ui-express');
const { specs, debugSwagger } = require('../config/swagger');

// Custom CSS for Swagger UI
const customCss = `
	.swagger-ui .topbar { display: none }
	.swagger-ui .info .title { color: #FF6B6B }
	.swagger-ui .scheme-container { background: #fafafa; border: 1px solid #ddd }
	.swagger-ui .btn.authorize { background-color: #FF6B6B; border-color: #FF6B6B }
	.swagger-ui .btn.authorize:hover { background-color: #FF5252; border-color: #FF5252 }
	.swagger-ui .opblock.opblock-post { border-color: #49cc90; background: rgba(73, 204, 144, 0.1) }
	.swagger-ui .opblock.opblock-get { border-color: #61affe; background: rgba(97, 175, 254, 0.1) }
	.swagger-ui .opblock.opblock-put { border-color: #fca130; background: rgba(252, 161, 48, 0.1) }
	.swagger-ui .opblock.opblock-delete { border-color: #f93e3e; background: rgba(249, 62, 62, 0.1) }
`;

// Swagger UI options
const swaggerUiOptions = {
	customCss,
	customSiteTitle: 'Carpooling API Documentation',
	swaggerOptions: {
		persistAuthorization: true,
		displayRequestDuration: true,
		docExpansion: 'list', // Show all endpoints expanded
		filter: true,
		showExtensions: true,
		tryItOutEnabled: true,
		supportedSubmitMethods: ['get', 'post', 'put', 'delete', 'patch'],
		validatorUrl: null, // Disable validator
	},
};

// Middleware to serve swagger documentation
const serveSwagger = swaggerUi.serve;

const setupSwagger = (req, res, next) => {
	// Debug current specs
	console.log('🔍 Swagger Setup Debug:');
	console.log('📊 Paths available:', Object.keys(specs.paths || {}).length);
	console.log('📋 Paths list:', Object.keys(specs.paths || {}));

	// Add current server dynamically
	const finalSpecs = {
		...specs,
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

	// Check if we have any paths
	if (!finalSpecs.paths || Object.keys(finalSpecs.paths).length === 0) {
		console.log('⚠️ No API paths found! Swagger will show empty.');
		console.log('💡 Make sure your route files have proper JSDoc comments.');

		// Add a fallback path for testing
		finalSpecs.paths = {
			'/health': {
				get: {
					tags: ['System'],
					summary: 'Health check',
					responses: {
						'200': {
							description: 'API is healthy'
						}
					}
				}
			},
			'/auth/test': {
				get: {
					tags: ['Authentication'],
					summary: 'Test auth endpoint',
					responses: {
						'200': {
							description: 'Auth test successful'
						}
					}
				}
			}
		};
	}

	return swaggerUi.setup(finalSpecs, swaggerUiOptions)(req, res, next);
};

// Endpoint to serve swagger spec as JSON
const serveSwaggerSpec = (req, res) => {
	const finalSpecs = {
		...specs,
		servers: [
			{
				url: `${req.protocol}://${req.get('host')}/api`,
				description: 'Current server',
			},
		],
	};

	res.header('Access-Control-Allow-Origin', '*');
	res.header('Content-Type', 'application/json');
	res.json(finalSpecs);
};

module.exports = {
	serveSwagger,
	setupSwagger,
	serveSwaggerSpec,
	specs // Export specs for debugging
};