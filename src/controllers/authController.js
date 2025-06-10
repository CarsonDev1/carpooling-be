const User = require('../models/User');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const emailService = require('../services/emailService');
const smsService = require('../services/smsService');
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

// @desc    Step 1: Register user account (fullName + phone)
exports.register = async (req, res, next) => {
	try {
		console.log('📝 Step 1 - Register request received:', req.body);

		const { fullName, phone } = req.body;

		if (!fullName || !phone) {
			return res.status(400).json({
				status: 'error',
				message: 'Please provide full name and phone number',
			});
		}

		// Validate phone number format
		const phoneRegex = /^[0-9]{10,11}$/;
		if (!phoneRegex.test(phone)) {
			return res.status(400).json({
				status: 'error',
				message: 'Please provide a valid phone number (10-11 digits)',
			});
		}

		// Check if phone number already exists
		const existingUser = await User.findOne({ phone });
		if (existingUser) {
			return res.status(400).json({
				status: 'error',
				message: 'Phone number is already registered',
			});
		}

		// Generate OTP immediately
		const otp = Math.floor(100000 + Math.random() * 900000).toString();
		const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

		// Create user with phone and OTP
		const user = await User.create({
			fullName,
			phone,
			phoneOTP: otp,
			phoneOTPExpiry: otpExpiry,
			registrationStep: 1, // Track registration step
			isActive: false, // Not active until complete registration
		});

		console.log('✅ Step 1 completed - User created:', user._id);

		// Send OTP via SMS
		try {
			await smsService.sendOTP(phone, otp);
			console.log('✅ OTP sent successfully to:', phone);
		} catch (smsError) {
			console.error('❌ SMS sending failed:', smsError);
			console.log('🔢 Development OTP for', phone, ':', otp);
		}

		res.status(201).json({
			status: 'success',
			message: 'Account created and OTP sent to your phone number',
			data: {
				userId: user._id,
				phone: user.phone,
				fullName: user.fullName,
				otpSent: true,
				expiryTime: otpExpiry,
				nextStep: 'otp_verification',
				// In development, include OTP for testing
				...(process.env.NODE_ENV === 'development' && { developmentOTP: otp })
			},
		});
	} catch (error) {
		console.error('❌ Step 1 registration error:', error);
		res.status(500).json({
			status: 'error',
			message: 'Registration failed',
			error: error.message,
		});
	}
};

// @desc    Step 2: Verify OTP
exports.verifyOTP = async (req, res, next) => {
	try {
		console.log('🔍 Step 2 - Verify OTP request:', req.body);

		const { userId, otp } = req.body;

		if (!userId || !otp) {
			return res.status(400).json({
				status: 'error',
				message: 'Please provide user ID and OTP',
			});
		}

		// Find user and check OTP
		const user = await User.findById(userId);
		if (!user) {
			return res.status(404).json({
				status: 'error',
				message: 'User not found',
			});
		}

		if (user.registrationStep !== 1) {
			return res.status(400).json({
				status: 'error',
				message: 'Invalid registration step',
			});
		}

		// Check if OTP is valid and not expired
		if (!user.phoneOTP || user.phoneOTP !== otp) {
			return res.status(400).json({
				status: 'error',
				message: 'Invalid OTP',
			});
		}

		if (!user.phoneOTPExpiry || user.phoneOTPExpiry < new Date()) {
			return res.status(400).json({
				status: 'error',
				message: 'OTP has expired. Please request a new one.',
			});
		}

		// Mark phone as verified and move to next step
		user.isPhoneVerified = true;
		user.phoneOTP = undefined;
		user.phoneOTPExpiry = undefined;
		user.registrationStep = 2;
		await user.save();

		console.log('✅ Phone verified successfully for user:', user._id);

		res.status(200).json({
			status: 'success',
			message: 'Phone number verified successfully',
			data: {
				userId: user._id,
				phoneVerified: true,
				nextStep: 'set_password'
			},
		});
	} catch (error) {
		console.error('❌ OTP verification error:', error);
		res.status(500).json({
			status: 'error',
			message: 'OTP verification failed',
			error: error.message,
		});
	}
};

// @desc    Step 2.5: Resend OTP
exports.resendOTP = async (req, res, next) => {
	try {
		console.log('🔄 Resend OTP request:', req.body);

		const { userId } = req.body;

		if (!userId) {
			return res.status(400).json({
				status: 'error',
				message: 'Please provide user ID',
			});
		}

		const user = await User.findById(userId);
		if (!user) {
			return res.status(404).json({
				status: 'error',
				message: 'User not found',
			});
		}

		if (user.registrationStep !== 1) {
			return res.status(400).json({
				status: 'error',
				message: 'Invalid registration step',
			});
		}

		// Check rate limiting (prevent spam)
		if (user.phoneOTPExpiry && user.phoneOTPExpiry > new Date(Date.now() - 60000)) {
			return res.status(429).json({
				status: 'error',
				message: 'Please wait at least 1 minute before requesting a new OTP',
			});
		}

		// Generate new OTP
		const otp = Math.floor(100000 + Math.random() * 900000).toString();
		const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

		user.phoneOTP = otp;
		user.phoneOTPExpiry = otpExpiry;
		await user.save();

		// Send OTP via SMS
		try {
			await smsService.sendOTP(user.phone, otp);
			console.log('✅ OTP resent successfully to:', user.phone);
		} catch (smsError) {
			console.error('❌ SMS resending failed:', smsError);
			console.log('🔢 Development OTP for', user.phone, ':', otp);
		}

		res.status(200).json({
			status: 'success',
			message: 'New OTP sent successfully',
			data: {
				userId: user._id,
				otpSent: true,
				expiryTime: otpExpiry,
				// In development, include OTP for testing
				...(process.env.NODE_ENV === 'development' && { developmentOTP: otp })
			},
		});
	} catch (error) {
		console.error('❌ Resend OTP error:', error);
		res.status(500).json({
			status: 'error',
			message: 'Failed to resend OTP',
			error: error.message,
		});
	}
};

// @desc    Step 3: Set password and complete registration
exports.setPassword = async (req, res, next) => {
	try {
		console.log('🔐 Step 3 - Set password request:', req.body);

		const { userId, password, confirmPassword } = req.body;

		if (!userId || !password || !confirmPassword) {
			return res.status(400).json({
				status: 'error',
				message: 'Please provide user ID, password, and confirm password',
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

		// Find user and check registration step
		const user = await User.findById(userId);
		if (!user) {
			return res.status(404).json({
				status: 'error',
				message: 'User not found',
			});
		}

		if (user.registrationStep !== 2) {
			return res.status(400).json({
				status: 'error',
				message: 'Invalid registration step. Please complete phone verification first.',
			});
		}

		if (!user.isPhoneVerified) {
			return res.status(400).json({
				status: 'error',
				message: 'Phone number must be verified before setting password',
			});
		}

		// Set password and complete registration
		user.password = password;
		user.isActive = true;
		user.registrationStep = 3; // Completed
		user.registrationCompletedAt = new Date();
		await user.save();

		console.log('✅ Registration completed successfully for user:', user._id);

		// Send welcome SMS instead of email (since we don't have email)
		try {
			const welcomeMessage = `Welcome to Carpooling! Your account has been created successfully. Start sharing rides and saving money today!`;
			await smsService.sendMessage(user.phone, welcomeMessage);
		} catch (smsError) {
			console.log('⚠️ Failed to send welcome SMS:', smsError.message);
		}

		// Return token for immediate login
		sendTokenResponse(user, 201, res, 'Registration completed successfully! Welcome to Carpooling!');
	} catch (error) {
		console.error('❌ Set password error:', error);
		res.status(500).json({
			status: 'error',
			message: 'Failed to complete registration',
			error: error.message,
		});
	}
};

// @desc    Login user (updated for new flow - phone + password)
exports.login = async (req, res, next) => {
	try {
		console.log('🔐 Login request received:', req.body.phone);

		const { phone, password } = req.body;

		if (!phone || !password) {
			return res.status(400).json({
				status: 'error',
				message: 'Please provide phone number and password',
			});
		}

		const user = await User.findOne({ phone }).select('+password');

		if (!user) {
			return res.status(401).json({
				status: 'error',
				message: 'Invalid phone number or password',
			});
		}

		// Check if registration is completed
		if (!user.isActive || user.registrationStep < 3) {
			return res.status(401).json({
				status: 'error',
				message: 'Please complete your registration process',
				data: {
					userId: user._id,
					registrationStep: user.registrationStep,
					nextStep: user.registrationStep === 1 ? 'otp_verification' :
						user.registrationStep === 2 ? 'set_password' : 'unknown'
				}
			});
		}

		const isPasswordValid = await user.comparePassword(password);

		if (!isPasswordValid) {
			return res.status(401).json({
				status: 'error',
				message: 'Invalid phone number or password',
			});
		}

		// Update last login
		user.lastLogin = new Date();
		await user.save();

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

// Keep all other existing methods unchanged...
// (getMe, updateProfile, forgotPassword, resetPassword, changePassword, uploadAvatar, deleteAvatar, etc.)

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

		console.log('✅ Full user info retrieved:', user.phone);

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
			email: req.body.email, // Optional email for later use
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

// @desc    Forgot password (using phone number)
exports.forgotPassword = async (req, res, next) => {
	try {
		console.log('🔐 Forgot password request:', req.body.phone);

		const { phone } = req.body;

		if (!phone) {
			return res.status(400).json({
				status: 'error',
				message: 'Please provide phone number',
			});
		}

		const user = await User.findOne({ phone });

		if (!user) {
			return res.status(200).json({
				status: 'success',
				message: 'If an account with that phone exists, a password reset code has been sent.',
			});
		}

		if (!user.isActive) {
			return res.status(400).json({
				status: 'error',
				message: 'Account has been deactivated. Please contact support.',
			});
		}

		// Generate reset OTP instead of email token
		const resetOTP = Math.floor(100000 + Math.random() * 900000).toString();
		const resetOTPExpiry = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

		user.resetPasswordToken = resetOTP;
		user.resetPasswordExpire = resetOTPExpiry;
		await user.save({ validateBeforeSave: false });

		console.log('🔑 Password reset OTP generated for user:', user._id);

		try {
			const resetMessage = `Your Carpooling password reset code is ${resetOTP}. Valid for 30 minutes. Do not share this code.`;
			await smsService.sendMessage(phone, resetMessage);

			console.log('✅ Password reset SMS sent successfully');

			res.status(200).json({
				status: 'success',
				message: 'Password reset code sent to your phone number.',
				data: {
					// In development, include OTP for testing
					...(process.env.NODE_ENV === 'development' && { developmentResetOTP: resetOTP })
				}
			});
		} catch (error) {
			user.resetPasswordToken = undefined;
			user.resetPasswordExpire = undefined;
			await user.save({ validateBeforeSave: false });

			console.error('❌ Failed to send password reset SMS:', error);

			return res.status(500).json({
				status: 'error',
				message: 'SMS could not be sent. Please try again later.',
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

// @desc    Reset password (using OTP instead of token)
exports.resetPassword = async (req, res, next) => {
	try {
		console.log('🔄 Reset password request with OTP');

		const { phone, otp, password, confirmPassword } = req.body;

		if (!phone || !otp || !password || !confirmPassword) {
			return res.status(400).json({
				status: 'error',
				message: 'Please provide phone number, OTP, password, and confirm password',
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

		const user = await User.findOne({
			phone: phone,
			resetPasswordToken: otp,
			resetPasswordExpire: { $gt: Date.now() },
		});

		if (!user) {
			return res.status(400).json({
				status: 'error',
				message: 'Invalid or expired password reset code',
			});
		}

		console.log('✅ Valid reset OTP found for user:', user._id);

		user.password = password;
		user.resetPasswordToken = undefined;
		user.resetPasswordExpire = undefined;

		await user.save();

		console.log('✅ Password reset successful for user:', user._id);

		try {
			const confirmMessage = `Your Carpooling password has been changed successfully. If you didn't make this change, please contact support immediately.`;
			await smsService.sendMessage(user.phone, confirmMessage);
		} catch (smsError) {
			console.log('⚠️ Failed to send password changed SMS:', smsError.message);
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

// Rest of the methods remain the same...
// (changePassword, uploadAvatar, deleteAvatar, logout)

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
			const confirmMessage = `Your Carpooling password has been changed successfully.`;
			await smsService.sendMessage(user.phone, confirmMessage);
		} catch (smsError) {
			console.log('⚠️ Failed to send password changed SMS:', smsError.message);
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

module.exports = {
	test: exports.test,
	register: exports.register,           // ✅ Already exists
	verifyOTP: exports.verifyOTP,         // ✅ Already exists  
	resendOTP: exports.resendOTP,         // ✅ Already exists
	setPassword: exports.setPassword,     // ✅ Already exists
	login: exports.login,                 // ✅ Already exists
	getMe: exports.getMe,                 // ✅ Already exists
	updateProfile: exports.updateProfile, // ✅ Already exists
	forgotPassword: exports.forgotPassword, // ✅ Already exists
	resetPassword: exports.resetPassword,   // ✅ Already exists
	changePassword: exports.changePassword, // ✅ Already exists
	uploadAvatar: exports.uploadAvatar,     // ✅ Already exists
	deleteAvatar: exports.deleteAvatar,     // ✅ Already exists
	logout: exports.logout                  // ✅ Already exists
};