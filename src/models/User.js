const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const userSchema = new mongoose.Schema(
	{
		email: {
			type: String,
			required: [true, 'Email is required'],
			unique: true,
			lowercase: true,
			trim: true,
			match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email'],
		},

		password: {
			type: String,
			required: [true, 'Password is required'],
			minlength: [6, 'Password must be at least 6 characters'],
			select: false, // Don't include password in queries by default
		},

		resetPasswordToken: String,
		resetPasswordExpire: Date,

		fullName: {
			type: String,
			required: [true, 'Full name is required'],
			trim: true,
			minlength: [2, 'Full name must be at least 2 characters'],
			maxlength: [50, 'Full name cannot exceed 50 characters'],
		},

		phone: {
			type: String,
			unique: true,
			sparse: true,
			trim: true,
			match: [/^[0-9]{10,11}$/, 'Please enter a valid phone number'],
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
			sms: { type: Boolean, default: false },
		},

		// Account status
		isActive: {
			type: Boolean,
			default: true,
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

// Virtual for account locked status
userSchema.virtual('isLocked').get(function () {
	return !!(this.lockUntil && this.lockUntil > Date.now());
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
	delete userObject.loginAttempts;
	delete userObject.lockUntil;
	delete userObject.__v;

	return userObject;
};

// Method to generate password reset token
userSchema.methods.generatePasswordResetToken = function () {
	const resetToken = crypto.randomBytes(32).toString('hex');

	// Hash token and set to resetPasswordToken field
	this.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');

	// Set expire time (30 minutes)
	this.resetPasswordExpire = Date.now() + 30 * 60 * 1000;

	return resetToken; // Return unhashed token
};

// Method to check if reset token is valid
userSchema.methods.isResetTokenValid = function () {
	return this.resetPasswordExpire && this.resetPasswordExpire > Date.now();
};

module.exports = mongoose.model('User', userSchema);
