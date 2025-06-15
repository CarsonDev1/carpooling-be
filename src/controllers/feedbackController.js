const Feedback = require('../models/Feedback');
const User = require('../models/User');
const Notification = require('../models/Notification');

// @desc    Create new feedback
// @route   POST /api/feedback
// @access  Private
exports.createFeedback = async (req, res) => {
	try {
		const { subject, message, category, attachment } = req.body;

		// Simple validation
		if (!subject || !message) {
			return res.status(400).json({
				success: false,
				error: 'Please provide subject and message',
			});
		}

		// Create feedback
		const feedback = await Feedback.create({
			user: req.user._id,
			subject,
			message,
			category: category || 'general',
			attachment,
			status: 'pending',
		});

		// Find all admin users to notify
		const admins = await User.find({ role: 'admin', isActive: true }, '_id');

		// Notify all admins
		for (const admin of admins) {
			await Notification.create({
				recipient: admin._id,
				title: 'New Feedback Received',
				message: `A user has submitted new feedback: ${subject}`,
				type: 'system',
				relatedId: feedback._id,
				relatedModel: 'Feedback',
			});
		}

		res.status(201).json({
			success: true,
			data: feedback,
		});
	} catch (error) {
		res.status(500).json({
			success: false,
			error: error.message,
		});
	}
};

// @desc    Get all feedback for the current user
// @route   GET /api/feedback
// @access  Private
exports.getMyFeedback = async (req, res) => {
	try {
		const userId = req.user._id;

		// Query options
		const query = { user: userId };

		// Filter by status
		if (req.query.status) {
			query.status = req.query.status;
		}

		// Filter by category
		if (req.query.category) {
			query.category = req.query.category;
		}

		// Pagination
		const page = parseInt(req.query.page, 10) || 1;
		const limit = parseInt(req.query.limit, 10) || 10;
		const startIndex = (page - 1) * limit;

		// Get feedback
		const feedback = await Feedback.find(query).sort({ createdAt: -1 }).skip(startIndex).limit(limit);

		// Get total count
		const totalFeedback = await Feedback.countDocuments(query);

		res.status(200).json({
			success: true,
			count: feedback.length,
			total: totalFeedback,
			pagination: {
				currentPage: page,
				totalPages: Math.ceil(totalFeedback / limit),
				limit,
			},
			data: feedback,
		});
	} catch (error) {
		res.status(500).json({
			success: false,
			error: error.message,
		});
	}
};

// @desc    Get feedback by ID
// @route   GET /api/feedback/:id
// @access  Private
exports.getFeedbackById = async (req, res) => {
	try {
		const feedback = await Feedback.findById(req.params.id);

		if (!feedback) {
			return res.status(404).json({
				success: false,
				error: 'Feedback not found',
			});
		}

		// Check if user is the owner or an admin
		if (feedback.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
			return res.status(403).json({
				success: false,
				error: 'Not authorized to access this feedback',
			});
		}

		res.status(200).json({
			success: true,
			data: feedback,
		});
	} catch (error) {
		res.status(500).json({
			success: false,
			error: error.message,
		});
	}
};

// @desc    Update feedback response (admin only)
// @route   PATCH /api/feedback/:id/response
// @access  Private (Admin)
exports.updateFeedbackResponse = async (req, res) => {
	try {
		// Check if user is admin
		if (req.user.role !== 'admin') {
			return res.status(403).json({
				success: false,
				error: 'Only admins can respond to feedback',
			});
		}

		const { response, status, internalNotes } = req.body;

		// Find feedback by id
		const feedback = await Feedback.findById(req.params.id);

		if (!feedback) {
			return res.status(404).json({
				success: false,
				error: 'Feedback not found',
			});
		}

		// Update feedback
		feedback.response = response;
		if (status) feedback.status = status;
		if (internalNotes) feedback.internalNotes = internalNotes;
		feedback.processedBy = req.user._id;
		feedback.processedAt = new Date();

		await feedback.save();

		// Notify the user who submitted the feedback
		await Notification.create({
			recipient: feedback.user,
			title: 'Feedback Response',
			message: `Your feedback "${feedback.subject}" has been responded to.`,
			type: 'system',
			relatedId: feedback._id,
			relatedModel: 'Feedback',
		});

		res.status(200).json({
			success: true,
			data: feedback,
		});
	} catch (error) {
		res.status(500).json({
			success: false,
			error: error.message,
		});
	}
};

// @desc    Update feedback status (admin only)
// @route   PATCH /api/feedback/:id/status
// @access  Private (Admin)
exports.updateFeedbackStatus = async (req, res) => {
	try {
		// Check if user is admin
		if (req.user.role !== 'admin') {
			return res.status(403).json({
				success: false,
				error: 'Only admins can update feedback status',
			});
		}

		const { status, internalNotes } = req.body;

		// Validate status
		if (!['pending', 'in_progress', 'resolved', 'rejected'].includes(status)) {
			return res.status(400).json({
				success: false,
				error: 'Invalid status value',
			});
		}

		// Find feedback by id
		const feedback = await Feedback.findById(req.params.id);

		if (!feedback) {
			return res.status(404).json({
				success: false,
				error: 'Feedback not found',
			});
		}

		// Update status
		feedback.status = status;
		if (internalNotes) feedback.internalNotes = internalNotes;
		feedback.processedBy = req.user._id;
		feedback.processedAt = new Date();

		await feedback.save();

		// Notify the user about status change
		if (status === 'resolved' || status === 'rejected') {
			await Notification.create({
				recipient: feedback.user,
				title: `Feedback ${status === 'resolved' ? 'Resolved' : 'Rejected'}`,
				message: `Your feedback "${feedback.subject}" has been ${status}.`,
				type: 'system',
				relatedId: feedback._id,
				relatedModel: 'Feedback',
			});
		}

		res.status(200).json({
			success: true,
			data: feedback,
		});
	} catch (error) {
		res.status(500).json({
			success: false,
			error: error.message,
		});
	}
};

// @desc    Get all feedback (admin only)
// @route   GET /api/feedback/admin/all
// @access  Private (Admin)
exports.getAllFeedback = async (req, res) => {
	try {
		// Check if user is admin
		if (req.user.role !== 'admin') {
			return res.status(403).json({
				success: false,
				error: 'Only admins can view all feedback',
			});
		}

		// Query options
		const query = {};

		// Filter by user
		if (req.query.userId) {
			query.user = req.query.userId;
		}

		// Filter by status
		if (req.query.status) {
			query.status = req.query.status;
		}

		// Filter by category
		if (req.query.category) {
			query.category = req.query.category;
		}

		// Pagination
		const page = parseInt(req.query.page, 10) || 1;
		const limit = parseInt(req.query.limit, 10) || 20;
		const startIndex = (page - 1) * limit;

		// Get feedback with user info
		const feedback = await Feedback.find(query)
			.populate({
				path: 'user',
				select: 'fullName phone email avatar',
			})
			.populate({
				path: 'processedBy',
				select: 'fullName',
			})
			.sort({ createdAt: -1 })
			.skip(startIndex)
			.limit(limit);

		// Get total count
		const totalFeedback = await Feedback.countDocuments(query);

		// Get stats by status
		const pendingCount = await Feedback.countDocuments({ status: 'pending' });
		const inProgressCount = await Feedback.countDocuments({ status: 'in_progress' });
		const resolvedCount = await Feedback.countDocuments({ status: 'resolved' });
		const rejectedCount = await Feedback.countDocuments({ status: 'rejected' });

		res.status(200).json({
			success: true,
			count: feedback.length,
			total: totalFeedback,
			stats: {
				pending: pendingCount,
				inProgress: inProgressCount,
				resolved: resolvedCount,
				rejected: rejectedCount,
			},
			pagination: {
				currentPage: page,
				totalPages: Math.ceil(totalFeedback / limit),
				limit,
			},
			data: feedback,
		});
	} catch (error) {
		res.status(500).json({
			success: false,
			error: error.message,
		});
	}
};
