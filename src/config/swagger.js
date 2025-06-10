// src/config/swagger.js - Fixed version
const swaggerJSDoc = require('swagger-jsdoc');
const path = require('path');

const options = {
	definition: {
		openapi: '3.0.0',
		info: {
			title: 'Carpooling API',
			version: '1.0.0',
			description: 'API documentation for Carpooling application with phone-based authentication',
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
				url: 'http://localhost:5000/api',
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
			schemas: {
				User: {
					type: 'object',
					properties: {
						_id: {
							type: 'string',
							description: 'User ID'
						},
						phone: {
							type: 'string',
							description: 'User phone number (primary identifier)',
							example: '0987654321'
						},
						email: {
							type: 'string',
							format: 'email',
							description: 'User email (optional)',
							example: 'user@example.com'
						},
						fullName: {
							type: 'string',
							description: 'User full name',
							example: 'Nguyen Van A'
						},
						isActive: {
							type: 'boolean',
							description: 'Account status'
						},
						isPhoneVerified: {
							type: 'boolean',
							description: 'Phone verification status'
						},
						registrationStep: {
							type: 'number',
							description: 'Current registration step (1-3)'
						}
					}
				},
				RegisterRequest: {
					type: 'object',
					required: ['fullName', 'phone'],
					properties: {
						fullName: {
							type: 'string',
							minLength: 2,
							maxLength: 50,
							description: 'User full name',
							example: 'Nguyen Van A'
						},
						phone: {
							type: 'string',
							pattern: '^[0-9]{10,11}$',
							description: 'User phone number',
							example: '0987654321'
						}
					}
				},
				VerifyOTPRequest: {
					type: 'object',
					required: ['userId', 'otp'],
					properties: {
						userId: {
							type: 'string',
							description: 'User ID from registration',
							example: '64f7b3b3b3b3b3b3b3b3b3b3'
						},
						otp: {
							type: 'string',
							pattern: '^[0-9]{6}$',
							description: '6-digit OTP code',
							example: '123456'
						}
					}
				},
				SetPasswordRequest: {
					type: 'object',
					required: ['userId', 'password', 'confirmPassword'],
					properties: {
						userId: {
							type: 'string',
							description: 'User ID',
							example: '64f7b3b3b3b3b3b3b3b3b3b3'
						},
						password: {
							type: 'string',
							minLength: 6,
							description: 'New password',
							example: 'password123'
						},
						confirmPassword: {
							type: 'string',
							description: 'Confirm password',
							example: 'password123'
						}
					}
				},
				LoginRequest: {
					type: 'object',
					required: ['phone', 'password'],
					properties: {
						phone: {
							type: 'string',
							pattern: '^[0-9]{10,11}$',
							description: 'Phone number',
							example: '0987654321'
						},
						password: {
							type: 'string',
							description: 'User password',
							example: 'password123'
						}
					}
				},
				ErrorResponse: {
					type: 'object',
					properties: {
						status: {
							type: 'string',
							example: 'error'
						},
						message: {
							type: 'string',
							description: 'Error message'
						}
					}
				}
			}
		},
		tags: [
			{
				name: 'Authentication',
				description: 'User authentication and registration endpoints (phone-based)'
			}
		]
	},
	// Đây là phần quan trọng - phải đúng đường dẫn
	apis: [
		path.join(__dirname, '../routes/*.js'),      // Scan all route files
		path.join(__dirname, '../controllers/*.js'), // Scan controllers if they have docs
		path.join(__dirname, '../models/*.js'),      // Scan models if they have docs
		// Add inline documentation
		path.join(__dirname, '../docs/swagger-paths.js'), // We'll create this
	],
};

const specs = swaggerJSDoc(options);

// Debug function
const debugSwagger = () => {
	console.log('🔍 Swagger Debug Info:');
	console.log('📊 Total paths found:', Object.keys(specs.paths || {}).length);
	console.log('📋 Available paths:', Object.keys(specs.paths || {}));
	console.log('📦 Schemas found:', Object.keys(specs.components?.schemas || {}));

	if (!specs.paths || Object.keys(specs.paths).length === 0) {
		console.log('⚠️ No paths found in Swagger specs!');
		console.log('📁 Check if route files contain JSDoc comments');
		console.log('📝 APIs scanning paths:', options.apis);
	} else {
		console.log('✅ Swagger specs loaded successfully');
	}

	return specs;
};

module.exports = {
	specs: debugSwagger(),
	debugSwagger
};