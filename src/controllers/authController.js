const User = require('../models/User');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const emailService = require('../services/emailService');
const { cloudinary } = require('../config/cloudinary');
const path = require('path');
const fs = require('fs');

// Generate JWT token
const generateToken = (id) => {
	return jwt.sign({ id }, process.env.JWT_SECRET || 'fallback-secret', {
		expiresIn: process.env.JWT_EXPIRE || '7d',
	});
};

// Send token response
const sendTokenResponse = (user, statusCode, res, message = '') => {
	const token = generateToken(user._id);

	// Remove password from output
	user.password = undefined;

	res.status(statusCode).json({
		status: 'success',
		message,
		data: {
			token,
			user,
		},
	});
};

// Test endpoint
exports.test = (req, res) => {
	res.status(200).json({
		status: 'success',
		message: 'Auth controller test working',
		timestamp: new Date().toISOString(),
	});
};

// @desc    Register user
exports.register = async (req, res, next) => {
	try {
		console.log('📝 Register request received:', req.body);

		const { email, password, fullName } = req.body;

		if (!email || !password || !fullName) {
			return res.status(400).json({
				status: 'error',
				message: 'Please provide email, password, and full name',
			});
		}

		const existingUser = await User.findOne({ email });
		if (existingUser) {
			return res.status(400).json({
				status: 'error',
				message: 'User with this email already exists',
			});
		}

		const user = await User.create({
			email,
			password,
			fullName,
		});

		console.log('✅ User created successfully:', user._id);
		sendTokenResponse(user, 201, res, 'Registration successful!');
	} catch (error) {
		console.error('❌ Registration error:', error);
		res.status(500).json({
			status: 'error',
			message: 'Registration failed',
			error: error.message,
		});
	}
};

// @desc    Login user
exports.login = async (req, res, next) => {
	try {
		console.log('🔐 Login request received:', req.body.email);

		const { email, password } = req.body;

		if (!email || !password) {
			return res.status(400).json({
				status: 'error',
				message: 'Please provide email and password',
			});
		}

		const user = await User.findOne({ email }).select('+password');

		if (!user) {
			return res.status(401).json({
				status: 'error',
				message: 'Invalid email or password',
			});
		}

		const isPasswordValid = await user.comparePassword(password);

		if (!isPasswordValid) {
			return res.status(401).json({
				status: 'error',
				message: 'Invalid email or password',
			});
		}

		console.log('✅ Login successful:', user._id);
		sendTokenResponse(user, 200, res, 'Login successful');
	} catch (error) {
		console.error('❌ Login error:', error);
		res.status(500).json({
			status: 'error',
			message: 'Login failed',
			error: error.message,
		});
	}
};

// @desc    Get current logged in user
exports.getMe = async (req, res, next) => {
	try {
		console.log('👤 Get me request for user:', req.user._id);

		const user = await User.findById(req.user._id);

		if (!user) {
			return res.status(404).json({
				status: 'error',
				message: 'User not found',
			});
		}

		console.log('✅ Full user info retrieved:', user.email);

		res.status(200).json({
			status: 'success',
			data: {
				user: user,
			},
		});
	} catch (error) {
		console.error('❌ Get me error:', error);
		res.status(500).json({
			status: 'error',
			message: 'Failed to get user info',
			error: error.message,
		});
	}
};

// @desc    Update user profile
exports.updateProfile = async (req, res, next) => {
	try {
		console.log('📝 Update profile request for user:', req.user._id);

		const fieldsToUpdate = {
			fullName: req.body.fullName,
			phone: req.body.phone,
			dateOfBirth: req.body.dateOfBirth,
			gender: req.body.gender,
			vehicle: req.body.vehicle,
			addresses: req.body.addresses,
			notificationSettings: req.body.notificationSettings,
		};

		Object.keys(fieldsToUpdate).forEach((key) => {
			if (fieldsToUpdate[key] === undefined) {
				delete fieldsToUpdate[key];
			}
		});

		const user = await User.findByIdAndUpdate(req.user._id, fieldsToUpdate, {
			new: true,
			runValidators: true,
		});

		if (!user) {
			return res.status(404).json({
				status: 'error',
				message: 'User not found',
			});
		}

		console.log('✅ Profile updated successfully');

		res.status(200).json({
			status: 'success',
			message: 'Profile updated successfully',
			data: {
				user: user,
			},
		});
	} catch (error) {
		console.error('❌ Update profile error:', error);
		res.status(400).json({
			status: 'error',
			message: 'Failed to update profile',
			error: error.message,
		});
	}
};

// @desc    Forgot password
exports.forgotPassword = async (req, res, next) => {
	try {
		console.log('🔐 Forgot password request:', req.body.email);

		const { email } = req.body;

		if (!email) {
			return res.status(400).json({
				status: 'error',
				message: 'Please provide email address',
			});
		}

		const user = await User.findOne({ email });

		if (!user) {
			return res.status(200).json({
				status: 'success',
				message: 'If an account with that email exists, a password reset email has been sent.',
			});
		}

		if (!user.isActive) {
			return res.status(400).json({
				status: 'error',
				message: 'Account has been deactivated. Please contact support.',
			});
		}

		const resetToken = user.generatePasswordResetToken();
		await user.save({ validateBeforeSave: false });

		console.log('🔑 Password reset token generated for user:', user._id);

		try {
			await emailService.sendPasswordResetEmail(email, resetToken, user.fullName);

			console.log('✅ Password reset email sent successfully');

			res.status(200).json({
				status: 'success',
				message: 'Password reset email sent successfully. Please check your email.',
			});
		} catch (error) {
			user.resetPasswordToken = undefined;
			user.resetPasswordExpire = undefined;
			await user.save({ validateBeforeSave: false });

			console.error('❌ Failed to send password reset email:', error);

			return res.status(500).json({
				status: 'error',
				message: 'Email could not be sent. Please try again later.',
			});
		}
	} catch (error) {
		console.error('❌ Forgot password error:', error);
		res.status(500).json({
			status: 'error',
			message: 'Failed to process forgot password request',
			error: error.message,
		});
	}
};

// @desc    Reset password
exports.resetPassword = async (req, res, next) => {
	try {
		console.log('🔄 Reset password request with token');

		const { password, confirmPassword } = req.body;
		const { token } = req.params;

		if (!password || !confirmPassword) {
			return res.status(400).json({
				status: 'error',
				message: 'Please provide password and confirm password',
			});
		}

		if (password !== confirmPassword) {
			return res.status(400).json({
				status: 'error',
				message: 'Passwords do not match',
			});
		}

		if (password.length < 6) {
			return res.status(400).json({
				status: 'error',
				message: 'Password must be at least 6 characters long',
			});
		}

		const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

		const user = await User.findOne({
			resetPasswordToken: hashedToken,
			resetPasswordExpire: { $gt: Date.now() },
		});

		if (!user) {
			return res.status(400).json({
				status: 'error',
				message: 'Invalid or expired password reset token',
			});
		}

		console.log('✅ Valid reset token found for user:', user._id);

		user.password = password;
		user.resetPasswordToken = undefined;
		user.resetPasswordExpire = undefined;

		await user.save();

		console.log('✅ Password reset successful for user:', user._id);

		try {
			await emailService.sendPasswordChangedEmail(user.email, user.fullName);
		} catch (emailError) {
			console.log('⚠️ Failed to send password changed email:', emailError.message);
		}

		res.status(200).json({
			status: 'success',
			message: 'Password reset successful. You can now log in with your new password.',
		});
	} catch (error) {
		console.error('❌ Reset password error:', error);
		res.status(500).json({
			status: 'error',
			message: 'Failed to reset password',
			error: error.message,
		});
	}
};

// @desc    Change password
exports.changePassword = async (req, res, next) => {
	try {
		console.log('🔐 Change password request for user:', req.user._id);

		const { currentPassword, newPassword, confirmPassword } = req.body;

		if (!currentPassword || !newPassword || !confirmPassword) {
			return res.status(400).json({
				status: 'error',
				message: 'Please provide current password, new password, and confirm password',
			});
		}

		if (newPassword !== confirmPassword) {
			return res.status(400).json({
				status: 'error',
				message: 'New passwords do not match',
			});
		}

		if (newPassword.length < 6) {
			return res.status(400).json({
				status: 'error',
				message: 'New password must be at least 6 characters long',
			});
		}

		if (currentPassword === newPassword) {
			return res.status(400).json({
				status: 'error',
				message: 'New password must be different from current password',
			});
		}

		const user = await User.findById(req.user._id).select('+password');

		if (!user) {
			return res.status(404).json({
				status: 'error',
				message: 'User not found',
			});
		}

		const isCurrentPasswordValid = await user.comparePassword(currentPassword);

		if (!isCurrentPasswordValid) {
			return res.status(400).json({
				status: 'error',
				message: 'Current password is incorrect',
			});
		}

		console.log('✅ Current password verified for user:', user._id);

		user.password = newPassword;
		await user.save();

		console.log('✅ Password changed successfully for user:', user._id);

		try {
			await emailService.sendPasswordChangedEmail(user.email, user.fullName);
		} catch (emailError) {
			console.log('⚠️ Failed to send password changed email:', emailError.message);
		}

		res.status(200).json({
			status: 'success',
			message: 'Password changed successfully',
		});
	} catch (error) {
		console.error('❌ Change password error:', error);
		res.status(500).json({
			status: 'error',
			message: 'Failed to change password',
			error: error.message,
		});
	}
};

// @desc    Upload avatar
exports.uploadAvatar = async (req, res, next) => {
	try {
		console.log('📸 Avatar upload request for user:', req.user._id);

		if (!req.file) {
			return res.status(400).json({
				status: 'error',
				message: 'Please select an image file to upload',
				code: 'NO_FILE_SELECTED',
			});
		}

		let avatarUrl = `/uploads/avatars/${req.file.filename}`;
		let uploadType = 'local';

		const currentUser = await User.findById(req.user._id);
		const oldAvatar = currentUser.avatar;

		const user = await User.findByIdAndUpdate(
			req.user._id,
			{
				avatar: avatarUrl,
				updatedAt: new Date(),
			},
			{
				new: true,
				runValidators: true,
			}
		);

		if (!user) {
			return res.status(404).json({
				status: 'error',
				message: 'User not found',
			});
		}

		console.log('✅ Avatar uploaded and updated successfully');

		res.status(200).json({
			status: 'success',
			message: 'Avatar uploaded successfully',
			data: {
				user: user,
				avatar: {
					url: avatarUrl,
					uploadType: uploadType,
					filename: req.file.filename,
					size: req.file.size,
					originalName: req.file.originalname,
				},
			},
		});
	} catch (error) {
		console.error('❌ Avatar upload error:', error);

		if (req.file && req.file.path) {
			try {
				if (fs.existsSync(req.file.path)) {
					fs.unlinkSync(req.file.path);
					console.log('🧹 Cleaned up failed upload file');
				}
			} catch (cleanupError) {
				console.log('⚠️ Failed to cleanup upload file:', cleanupError.message);
			}
		}

		res.status(500).json({
			status: 'error',
			message: 'Failed to upload avatar',
			error: error.message,
		});
	}
};

// @desc    Delete avatar
exports.deleteAvatar = async (req, res, next) => {
	try {
		console.log('🗑️ Delete avatar request for user:', req.user._id);

		const user = await User.findById(req.user._id);

		if (!user || !user.avatar) {
			return res.status(400).json({
				status: 'error',
				message: 'No avatar to delete',
			});
		}

		const currentAvatar = user.avatar;
		user.avatar = '';
		await user.save();

		try {
			if (!currentAvatar.includes('cloudinary.com')) {
				const filePath = path.join(process.cwd(), currentAvatar);
				if (fs.existsSync(filePath)) {
					fs.unlinkSync(filePath);
					console.log('💾 Avatar deleted from local storage');
				}
			}
		} catch (deleteError) {
			console.log('⚠️ Failed to delete avatar file:', deleteError.message);
		}

		console.log('✅ Avatar deleted successfully');

		res.status(200).json({
			status: 'success',
			message: 'Avatar deleted successfully',
			data: {
				user: user,
			},
		});
	} catch (error) {
		console.error('❌ Delete avatar error:', error);
		res.status(500).json({
			status: 'error',
			message: 'Failed to delete avatar',
			error: error.message,
		});
	}
};

exports.logout = async (req, res, next) => {
	try {
		console.log('🚪 Logout request for user:', req.user._id);

		// If you're using refresh tokens, you would invalidate them here
		// For now, just return success as JWT tokens are stateless

		res.status(200).json({
			status: 'success',
			message: 'Logout successful',
			data: null,
		});
	} catch (error) {
		console.error('❌ Logout error:', error);
		res.status(500).json({
			status: 'error',
			message: 'Logout failed',
			error: error.message,
		});
	}
};

// @desc    Send email verification
exports.sendEmailVerification = async (req, res, next) => {
	try {
		console.log('📧 Send email verification request for user:', req.user._id);

		const user = await User.findById(req.user._id);

		if (!user) {
			return res.status(404).json({
				status: 'error',
				message: 'User not found',
			});
		}

		if (user.isVerified) {
			return res.status(400).json({
				status: 'error',
				message: 'Email is already verified',
			});
		}

		// Generate verification token
		const verificationToken = user.generateEmailVerificationToken();
		await user.save({ validateBeforeSave: false });

		console.log('🔑 Email verification token generated for user:', user._id);

		try {
			await emailService.sendEmailVerification(user.email, verificationToken, user.fullName);

			console.log('✅ Email verification sent successfully');

			res.status(200).json({
				status: 'success',
				message: 'Email verification sent successfully. Please check your email.',
			});
		} catch (error) {
			user.emailVerificationToken = undefined;
			user.emailVerificationExpire = undefined;
			await user.save({ validateBeforeSave: false });

			console.error('❌ Failed to send email verification:', error);

			return res.status(500).json({
				status: 'error',
				message: 'Email could not be sent. Please try again later.',
			});
		}
	} catch (error) {
		console.error('❌ Send email verification error:', error);
		res.status(500).json({
			status: 'error',
			message: 'Failed to send email verification',
			error: error.message,
		});
	}
};
// @desc    Verify email
exports.verifyEmail = async (req, res, next) => {
	try {
		console.log('✅ Email verification request with token');

		const { token } = req.params;

		if (!token) {
			return res.status(400).json({
				status: 'error',
				message: 'Verification token is required',
			});
		}

		const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

		const user = await User.findOne({
			emailVerificationToken: hashedToken,
			emailVerificationExpire: { $gt: Date.now() },
		});

		if (!user) {
			return res.status(400).json({
				status: 'error',
				message: 'Invalid or expired verification token',
			});
		}

		console.log('✅ Valid verification token found for user:', user._id);

		user.isVerified = true;
		user.emailVerificationToken = undefined;
		user.emailVerificationExpire = undefined;

		await user.save();

		console.log('✅ Email verified successfully for user:', user._id);

		try {
			await emailService.sendWelcomeEmail(user.email, user.fullName);
		} catch (emailError) {
			console.log('⚠️ Failed to send welcome email:', emailError.message);
		}

		res.status(200).json({
			status: 'success',
			message: 'Email verified successfully. Welcome to Carpooling!',
			data: {
				user: user,
			},
		});
	} catch (error) {
		console.error('❌ Email verification error:', error);
		res.status(500).json({
			status: 'error',
			message: 'Failed to verify email',
			error: error.message,
		});
	}
};
// @desc    Resend email verification
exports.resendEmailVerification = async (req, res, next) => {
	try {
		console.log('🔄 Resend email verification request for user:', req.user._id);

		const user = await User.findById(req.user._id);

		if (!user) {
			return res.status(404).json({
				status: 'error',
				message: 'User not found',
			});
		}

		if (user.isVerified) {
			return res.status(400).json({
				status: 'error',
				message: 'Email is already verified',
			});
		}

		// Check if too many requests
		if (user.emailVerificationExpire && user.emailVerificationExpire > Date.now()) {
			const timeLeft = Math.ceil((user.emailVerificationExpire - Date.now()) / 1000 / 60);
			return res.status(429).json({
				status: 'error',
				message: `Please wait ${timeLeft} minutes before requesting another verification email`,
			});
		}

		// Generate new verification token
		const verificationToken = user.generateEmailVerificationToken();
		await user.save({ validateBeforeSave: false });

		try {
			await emailService.sendEmailVerification(user.email, verificationToken, user.fullName);

			console.log('✅ Email verification resent successfully');

			res.status(200).json({
				status: 'success',
				message: 'Email verification resent successfully. Please check your email.',
			});
		} catch (error) {
			console.error('❌ Failed to resend email verification:', error);

			return res.status(500).json({
				status: 'error',
				message: 'Email could not be sent. Please try again later.',
			});
		}
	} catch (error) {
		console.error('❌ Resend email verification error:', error);
		res.status(500).json({
			status: 'error',
			message: 'Failed to resend email verification',
			error: error.message,
		});
	}
};

// @desc    Delete account
exports.deleteAccount = async (req, res, next) => {
	try {
		console.log('🗑️ Delete account request for user:', req.user._id);

		const { password } = req.body;

		if (!password) {
			return res.status(400).json({
				status: 'error',
				message: 'Password confirmation is required to delete account',
			});
		}

		const user = await User.findById(req.user._id).select('+password');

		if (!user) {
			return res.status(404).json({
				status: 'error',
				message: 'User not found',
			});
		}

		const isPasswordValid = await user.comparePassword(password);

		if (!isPasswordValid) {
			return res.status(400).json({
				status: 'error',
				message: 'Incorrect password',
			});
		}

		// Soft delete by setting isActive to false
		user.isActive = false;
		user.email = `deleted_${Date.now()}_${user.email}`;
		await user.save();

		console.log('✅ Account deactivated successfully for user:', user._id);

		try {
			await emailService.sendAccountDeletedEmail(user.email.replace(/^deleted_\d+_/, ''), user.fullName);
		} catch (emailError) {
			console.log('⚠️ Failed to send account deletion email:', emailError.message);
		}

		res.status(200).json({
			status: 'success',
			message: 'Account deleted successfully',
		});
	} catch (error) {
		console.error('❌ Delete account error:', error);
		res.status(500).json({
			status: 'error',
			message: 'Failed to delete account',
			error: error.message,
		});
	}
};
