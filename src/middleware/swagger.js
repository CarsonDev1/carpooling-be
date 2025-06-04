const { specs, swaggerUi, swaggerUiOptions } = require('../config/swagger');

// Middleware to serve swagger documentation
const serveSwagger = swaggerUi.serve;

const setupSwagger = (req, res, next) => {
	// Add API base URL to specs dynamically
	const updatedSpecs = {
		...specs,
		servers: [
			{
				url: `${req.protocol}://${req.get('host')}/api`,
				description: 'Current server',
			},
			{
				url: process.env.API_URL || 'http://localhost:5000/api',
				description: 'Development server',
			},
		],
	};

	return swaggerUi.setup(updatedSpecs, swaggerUiOptions)(req, res, next);
};

module.exports = {
	serveSwagger,
	setupSwagger,
};
