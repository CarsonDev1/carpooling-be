const nodemailer = require('nodemailer');

const createTransporter = () => {
	if (process.env.NODE_ENV === 'development') {
		// Mailtrap for development
		return nodemailer.createTransporter({
			host: 'smtp.mailtrap.io',
			port: 2525,
			auth: {
				user: process.env.MAILTRAP_USER,
				pass: process.env.MAILTRAP_PASS,
			},
		});
	} else {
		// Production email service
		return nodemailer.createTransporter({
			host: process.env.EMAIL_HOST,
			port: process.env.EMAIL_PORT,
			secure: false,
			auth: {
				user: process.env.EMAIL_USER,
				pass: process.env.EMAIL_PASS,
			},
		});
	}
};

module.exports = createTransporter;
