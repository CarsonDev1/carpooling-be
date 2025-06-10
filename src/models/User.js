const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const userSchema = new mongoose.Schema(
	{
		// Phone is now the primary identifier (required)
		phone: {
			type: String,
			required: [true, 'Phone number is required'],
			unique: true,
			trim: true,
			match: [/^[0-9]{10,11}$/, 'Please enter a valid phone number'],
		},

		// Email is now optional (can be added later in profile)
		email: {
			type: String,
			unique: true,
			sparse: true, // Allows multiple null values
			lowercase: true,
			trim: true,
			match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email'],
		},

		password: {
			type: String,
			required: function () {
				// Password is required only after step 2 (when registration is being completed)
				return this.registrationStep >= 2;
			},
			minlength: [6, 'Password must be at least 6 characters'],
			select: false, // Don't include password in queries by default
		},

		// Registration flow tracking
		registrationStep: {
			type: Number,
			default: 1,
			enum: [1, 2, 3], // 1: phone+name+otp, 2: set password, 3: completed
		},
		registrationCompletedAt: Date,

		// Phone verification
		isPhoneVerified: {
			type: Boolean,
			default: false,
		},
		phoneOTP: String,
		phoneOTPExpiry: Date,

		// Email verification (optional)
		emailVerificationToken: String,
		emailVerificationExpire: Date,

		// Password reset (using SMS instead of email)
		resetPasswordToken: String, // Will store OTP instead of token
		resetPasswordExpire: Date,

		fullName: {
			type: String,
			required: [true, 'Full name is required'],
			trim: true,
			minlength: [2, 'Full name must be at least 2 characters'],
			maxlength: [50, 'Full name cannot exceed 50 characters'],
		},

		avatar: {
			type: String,
			default: '',
		},

		dateOfBirth: {
			type: Date,
			validate: {
				validator: function (value) {
					if (!value) return true; // Optional field
					// Must be at least 18 years old
					const today = new Date();
					const eighteenYearsAgo = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate());
					return value <= eighteenYearsAgo;
				},
				message: 'You must be at least 18 years old',
			},
		},

		gender: {
			type: String,
			enum: ['male', 'female', 'other'],
			default: 'other',
		},

		role: {
			type: String,
			enum: ['driver', 'passenger', 'both', 'admin'],
			default: 'both',
		},

		// Vehicle information (for drivers)
		vehicle: {
			brand: String,
			model: String,
			licensePlate: {
				type: String,
				uppercase: true,
				trim: true,
			},
			seats: {
				type: Number,
				min: 1,
				max: 8,
			},
			color: String,
			year: {
				type: Number,
				min: 1990,
				max: new Date().getFullYear() + 1,
			},
		},

		// Frequently used addresses
		addresses: [
			{
				label: {
					type: String,
					required: true,
					trim: true,
				},
				address: {
					type: String,
					required: true,
					trim: true,
				},
				coordinates: {
					lat: {
						type: Number,
						required: true,
						min: -90,
						max: 90,
					},
					lng: {
						type: Number,
						required: true,
						min: -180,
						max: 180,
					},
				},
			},
		],

		// Rating statistics
		rating: {
			asDriver: {
				average: { type: Number, default: 0, min: 0, max: 5 },
				totalReviews: { type: Number, default: 0, min: 0 },
				totalStars: { type: Number, default: 0, min: 0 },
			},
			asPassenger: {
				average: { type: Number, default: 0, min: 0, max: 5 },
				totalReviews: { type: Number, default: 0, min: 0 },
				totalStars: { type: Number, default: 0, min: 0 },
			},
		},

		// Notification settings
		notificationSettings: {
			email: { type: Boolean, default: true },
			push: { type: Boolean, default: true },
			sms: { type: Boolean, default: true }, // Changed default to true since phone is primary
		},

		// Account status
		isActive: {
			type: Boolean,
			default: false, // Only active after completing registration
		},

		isVerified: {
			type: Boolean,
			default: false,
		},

		// Login tracking
		lastLogin: Date,
		loginAttempts: {
			type: Number,
			default: 0,
		},
		lockUntil: Date,
	},
	{
		timestamps: true,
		toJSON: { virtuals: true },
		toObject: { virtuals: true },
	}
);

// Indexes
userSchema.index({ isActive: 1 });
userSchema.index({ role: 1 });
userSchema.index({ registrationStep: 1 });
userSchema.index({ isPhoneVerified: 1 });
userSchema.index({ phone: 1 }); // Primary identifier
userSchema.index({ email: 1 }, { sparse: true }); // Sparse index for optional email

// Virtual for account locked status
userSchema.virtual('isLocked').get(function () {
	return !!(this.lockUntil && this.lockUntil > Date.now());
});

// Virtual for registration completion status
userSchema.virtual('isRegistrationComplete').get(function () {
	return this.registrationStep === 3 && this.isActive && this.isPhoneVerified;
});

// Virtual for age calculation
userSchema.virtual('age').get(function () {
	if (!this.dateOfBirth) return null;

	const today = new Date();
	const birthDate = new Date(this.dateOfBirth);
	let age = today.getFullYear() - birthDate.getFullYear();
	const monthDiff = today.getMonth() - birthDate.getMonth();

	if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
		age--;
	}

	return age;
});

// Pre-save middleware to hash password
userSchema.pre('save', async function (next) {
	if (!this.isModified('password')) return next();

	try {
		const salt = await bcrypt.genSalt(12);
		this.password = await bcrypt.hash(this.password, salt);
		next();
	} catch (error) {
		next(error);
	}
});

// Method to check password
userSchema.methods.comparePassword = async function (candidatePassword) {
	if (!this.password) return false;
	return await bcrypt.compare(candidatePassword, this.password);
};

// Method to format user response (remove sensitive data)
userSchema.methods.toJSON = function () {
	const userObject = this.toObject();

	// Remove sensitive fields
	delete userObject.password;
	delete userObject.phoneOTP;
	delete userObject.phoneOTPExpiry;
	delete userObject.resetPasswordToken;
	delete userObject.resetPasswordExpire;
	delete userObject.loginAttempts;
	delete userObject.lockUntil;
	delete userObject.__v;

	return userObject;
};

// Method to generate password reset token (now OTP for SMS)
userSchema.methods.generatePasswordResetOTP = function () {
	const resetOTP = Math.floor(100000 + Math.random() * 900000).toString();

	// Store OTP directly (no hashing needed for OTP)
	this.resetPasswordToken = resetOTP;

	// Set expire time (30 minutes)
	this.resetPasswordExpire = Date.now() + 30 * 60 * 1000;

	return resetOTP;
};

// Method to check if reset OTP is valid
userSchema.methods.isResetOTPValid = function () {
	return this.resetPasswordExpire && this.resetPasswordExpire > Date.now();
};

// Method to generate email verification token (optional since email is optional)
userSchema.methods.generateEmailVerificationToken = function () {
	const verificationToken = crypto.randomBytes(32).toString('hex');

	// Hash token and set to emailVerificationToken field
	this.emailVerificationToken = crypto.createHash('sha256').update(verificationToken).digest('hex');

	// Set expire time (24 hours)
	this.emailVerificationExpire = Date.now() + 24 * 60 * 60 * 1000;

	return verificationToken; // Return unhashed token
};

// Method to check if verification token is valid
userSchema.methods.isVerificationTokenValid = function () {
	return this.emailVerificationExpire && this.emailVerificationExpire > Date.now();
};

// Method to generate OTP for phone verification
userSchema.methods.generatePhoneOTP = function () {
	const otp = Math.floor(100000 + Math.random() * 900000).toString();

	this.phoneOTP = otp;
	this.phoneOTPExpiry = Date.now() + 10 * 60 * 1000; // 10 minutes

	return otp;
};

// Method to verify phone OTP
userSchema.methods.verifyPhoneOTP = function (otp) {
	if (!this.phoneOTP || !this.phoneOTPExpiry) {
		return false;
	}

	if (this.phoneOTPExpiry < Date.now()) {
		return false; // Expired
	}

	return this.phoneOTP === otp;
};

// Method to clear phone OTP
userSchema.methods.clearPhoneOTP = function () {
	this.phoneOTP = undefined;
	this.phoneOTPExpiry = undefined;
};

// Method to move to next registration step
userSchema.methods.nextRegistrationStep = function () {
	if (this.registrationStep < 3) {
		this.registrationStep += 1;
	}

	// Activate account when registration is complete
	if (this.registrationStep === 3) {
		this.isActive = true;
		this.registrationCompletedAt = new Date();
	}
};

// Method to generate a display identifier (phone or email)
userSchema.methods.getDisplayIdentifier = function () {
	return this.phone || this.email || this.fullName;
};

module.exports = mongoose.model('User', userSchema);