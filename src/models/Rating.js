const mongoose = require('mongoose');

const ratingSchema = new mongoose.Schema(
	{
		trip: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Trip',
			required: true,
		},
		// Who gave the rating
		rater: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'User',
			required: true,
		},
		// Who received the rating
		rated: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'User',
			required: true,
		},
		// Rating score (1-5 stars)
		rating: {
			type: Number,
			required: true,
			min: 1,
			max: 5,
		},
		// Optional comment with the rating
		comment: {
			type: String,
			trim: true,
		},
		// The role of the rated user in the trip
		ratedUserRole: {
			type: String,
			enum: ['driver', 'passenger'],
			required: true,
		},
	},
	{
		timestamps: true,
	}
);

// Ensure a user can only rate once per trip for each other user
ratingSchema.index({ trip: 1, rater: 1, rated: 1 }, { unique: true });

// For quick lookups
ratingSchema.index({ rated: 1, ratedUserRole: 1 });
ratingSchema.index({ rater: 1 });

// Static method to calculate average rating for a user
ratingSchema.statics.calculateAverageRating = async function (userId, role) {
	const result = await this.aggregate([
		{
			$match: {
				rated: mongoose.Types.ObjectId(userId),
				ratedUserRole: role,
			},
		},
		{
			$group: {
				_id: '$rated',
				averageRating: { $avg: '$rating' },
				totalReviews: { $sum: 1 },
				totalStars: { $sum: '$rating' },
			},
		},
	]);

	try {
		if (result.length > 0) {
			const User = mongoose.model('User');

			// Update the user's rating data
			await User.findByIdAndUpdate(userId, {
				[`rating.as${role.charAt(0).toUpperCase() + role.slice(1)}`]: {
					average: Math.round(result[0].averageRating * 10) / 10, // Round to 1 decimal place
					totalReviews: result[0].totalReviews,
					totalStars: result[0].totalStars,
				},
			});
		}
	} catch (err) {
		console.error('Error updating user rating:', err);
	}
};

// Call calculateAverageRating after saving
ratingSchema.post('save', async function () {
	await this.constructor.calculateAverageRating(this.rated, this.ratedUserRole);
});

// Call calculateAverageRating after removing
ratingSchema.post('remove', async function () {
	await this.constructor.calculateAverageRating(this.rated, this.ratedUserRole);
});

module.exports = mongoose.model('Rating', ratingSchema);
