const { validationResult } = require('express-validator');

// Check validation results
exports.validate = (req, res, next) => {
	const errors = validationResult(req);

	if (!errors.isEmpty()) {
		const errorMessages = errors.array().map((error) => ({
			field: error.path,
			message: error.msg,
			value: error.value,
		}));

		return res.status(400).json({
			status: 'error',
			message: 'Validation failed',
			errors: errorMessages,
		});
	}

	next();
};

// Custom validation middleware
exports.validateObjectId = (paramName = 'id') => {
	return (req, res, next) => {
		const mongoose = require('mongoose');
		const id = req.params[paramName];

		if (!mongoose.Types.ObjectId.isValid(id)) {
			return res.status(400).json({
				status: 'error',
				message: `Invalid ${paramName} format`,
			});
		}

		next();
	};
};
