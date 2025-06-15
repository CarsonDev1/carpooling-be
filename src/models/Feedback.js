const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema(
	{
		user: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'User',
			required: true,
		},
		subject: {
			type: String,
			required: true,
			trim: true,
		},
		message: {
			type: String,
			required: true,
			trim: true,
		},
		category: {
			type: String,
			enum: ['bug', 'feature_request', 'complaint', 'general', 'security'],
			default: 'general',
		},
		// For admin to track feedback processing
		status: {
			type: String,
			enum: ['pending', 'in_progress', 'resolved', 'rejected'],
			default: 'pending',
		},
		// Admin response to the feedback
		response: {
			type: String,
			trim: true,
		},
		// Admin who processed the feedback
		processedBy: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'User',
		},
		processedAt: {
			type: Date,
		},
		// Optional screenshot or image attachment
		attachment: {
			type: String, // URL to the uploaded image
		},
		// For admin notes
		internalNotes: {
			type: String,
		},
	},
	{
		timestamps: true,
	}
);

// Indexes for faster querying
feedbackSchema.index({ user: 1 });
feedbackSchema.index({ status: 1 });
feedbackSchema.index({ category: 1 });
feedbackSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Feedback', feedbackSchema);
