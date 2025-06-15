const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
	{
		recipient: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'User',
			required: true,
		},
		title: {
			type: String,
			required: true,
			trim: true,
		},
		message: {
			type: String,
			required: true,
			trim: true,
		},
		type: {
			type: String,
			enum: [
				'trip_request', // When someone requests to join a trip
				'request_accepted', // When driver accepts a passenger
				'request_declined', // When driver declines a passenger
				'trip_cancelled', // When a trip is cancelled
				'trip_updated', // When trip details are updated
				'trip_started', // When a trip begins
				'trip_completed', // When a trip ends
				'new_rating', // When you receive a rating
				'system', // General system notifications
				'message', // For chat notifications
			],
			required: true,
		},
		// Reference to related object (trip, message, etc.)
		relatedId: {
			type: mongoose.Schema.Types.ObjectId,
			refPath: 'relatedModel',
		},
		relatedModel: {
			type: String,
			enum: ['Trip', 'Rating', 'User', 'ChatMessage'],
		},
		read: {
			type: Boolean,
			default: false,
		},
		// For admin notifications to all users
		isGlobal: {
			type: Boolean,
			default: false,
		},
		// Extra data that might be needed for frontend display
		metadata: {
			type: mongoose.Schema.Types.Mixed,
		},
	},
	{
		timestamps: true,
	}
);

// Indexes for faster querying
notificationSchema.index({ recipient: 1, read: 1 });
notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ isGlobal: 1 });

module.exports = mongoose.model('Notification', notificationSchema);
