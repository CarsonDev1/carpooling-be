const swaggerJSDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const path = require('path');

const options = {
	definition: {
		openapi: '3.0.0',
		info: {
			title: 'Carpooling API',
			version: '1.0.0',
			description: 'API documentation for Carpooling application',
			contact: {
				name: 'API Support',
				email: 'support@carpooling.com',
			},
			license: {
				name: 'MIT',
				url: 'https://opensource.org/licenses/MIT',
			},
		},
		servers: [
			{
				url: process.env.API_URL || 'http://localhost:5000/api',
				description: 'Development server',
			},
		],
		components: {
			securitySchemes: {
				bearerAuth: {
					type: 'http',
					scheme: 'bearer',
					bearerFormat: 'JWT',
					description: 'JWT token authentication',
				},
			},
		},
	},
	apis: [
		path.join(__dirname, '../routes/*.js'),
		path.join(__dirname, '../controllers/*.js'),
		path.join(__dirname, '../models/*.js'),
		path.join(__dirname, '../docs/swagger.yaml'), // External YAML file
	],
};

const specs = swaggerJSDoc(options);

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
	customfavIcon: '/assets/favicon.ico',
	swaggerOptions: {
		persistAuthorization: true,
		displayRequestDuration: true,
		docExpansion: 'none',
		filter: true,
		showExtensions: true,
		tryItOutEnabled: true,
		requestInterceptor: (req) => {
			// Add custom headers if needed
			if (req.url.includes('/auth/') && !req.url.includes('/login') && !req.url.includes('/register')) {
				const token = localStorage.getItem('token');
				if (token) {
					req.headers.Authorization = `Bearer ${token}`;
				}
			}
			return req;
		},
	},
};

module.exports = {
	specs,
	swaggerUi,
	swaggerUiOptions,
};
