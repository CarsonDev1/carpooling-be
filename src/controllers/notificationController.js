const Notification = require('../models/Notification');
const User = require('../models/User');

/**
 * @swagger
 * components:
 *   schemas:
 *     Notification:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         recipient:
 *           type: string
 *           description: User ID who receives the notification
 *         title:
 *           type: string
 *           description: Short notification title
 *         message:
 *           type: string
 *           description: Notification message content
 *         type:
 *           type: string
 *           description: Type of notification (trip_updated, request_accepted, etc.)
 *         read:
 *           type: boolean
 *           description: Whether notification has been read
 *         relatedId:
 *           type: string
 *           description: ID of the related object (trip, rating, etc.)
 *         relatedModel:
 *           type: string
 *           description: Type of the related model (Trip, Rating, etc.)
 *         createdAt:
 *           type: string
 *           format: date-time
 *       required:
 *         - recipient
 *         - title
 *         - message
 *         - type
 */

/**
 * @swagger
 * /notifications:
 *   get:
 *     summary: Get user notifications
 *     description: Get notifications for the current user
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: unreadOnly
 *         schema:
 *           type: boolean
 *         description: Get only unread notifications
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Items per page
 *     responses:
 *       200:
 *         description: List of notifications
 *       401:
 *         description: Unauthorized
 */
// @desc    Get user notifications
// @route   GET /api/notifications
// @access  Private
exports.getNotifications = async (req, res) => {
	try {
		const userId = req.user._id;

		// Filter options
		const query = { recipient: userId };

		// Filter by read status
		if (req.query.read !== undefined) {
			query.read = req.query.read === 'true';
		}

		// Filter by type
		if (req.query.type) {
			query.type = req.query.type;
		}

		// Pagination
		const page = parseInt(req.query.page, 10) || 1;
		const limit = parseInt(req.query.limit, 10) || 20;
		const startIndex = (page - 1) * limit;

		// Get notifications with populate
		const notifications = await Notification.find(query)
			.sort({ createdAt: -1 })
			.skip(startIndex)
			.limit(limit)
			.populate({
				path: 'relatedId',
				select: '_id startLocation endLocation departureTime fullName',
				refPath: 'relatedModel',
			});

		// Get total count
		const totalNotifications = await Notification.countDocuments(query);

		// Count unread notifications
		const unreadCount = await Notification.countDocuments({
			recipient: userId,
			read: false,
		});

		res.status(200).json({
			success: true,
			count: notifications.length,
			unreadCount,
			total: totalNotifications,
			pagination: {
				currentPage: page,
				totalPages: Math.ceil(totalNotifications / limit),
				limit,
			},
			data: notifications,
		});
	} catch (error) {
		res.status(500).json({
			success: false,
			error: error.message,
		});
	}
};

/**
 * @swagger
 * /notifications/{id}/read:
 *   patch:
 *     summary: Mark notification as read
 *     description: Mark a specific notification as read
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Notification ID
 *     responses:
 *       200:
 *         description: Notification marked as read
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Notification not found
 */
// @desc    Mark notification as read
// @route   PATCH /api/notifications/:id/read
// @access  Private
exports.markAsRead = async (req, res) => {
	try {
		const notificationId = req.params.id;
		const userId = req.user._id;

		const notification = await Notification.findById(notificationId);

		if (!notification) {
			return res.status(404).json({
				success: false,
				error: 'Notification not found',
			});
		}

		// Check if notification belongs to the user
		if (notification.recipient.toString() !== userId.toString()) {
			return res.status(403).json({
				success: false,
				error: 'Not authorized to access this notification',
			});
		}

		// Update the notification
		notification.read = true;
		await notification.save();

		res.status(200).json({
			success: true,
			data: notification,
		});
	} catch (error) {
		res.status(500).json({
			success: false,
			error: error.message,
		});
	}
};

/**
 * @swagger
 * /notifications/read-all:
 *   patch:
 *     summary: Mark all notifications as read
 *     description: Mark all user's notifications as read
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: All notifications marked as read
 *       401:
 *         description: Unauthorized
 */
// @desc    Mark all notifications as read
// @route   PATCH /api/notifications/read-all
// @access  Private
exports.markAllAsRead = async (req, res) => {
	try {
		const userId = req.user._id;

		// Update all unread notifications
		const result = await Notification.updateMany({ recipient: userId, read: false }, { read: true });

		res.status(200).json({
			success: true,
			message: `Marked ${result.modifiedCount} notifications as read`,
			data: {
				modifiedCount: result.modifiedCount,
			},
		});
	} catch (error) {
		res.status(500).json({
			success: false,
			error: error.message,
		});
	}
};

/**
 * @swagger
 * /notifications/{id}:
 *   delete:
 *     summary: Delete a notification
 *     description: Delete a specific notification
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Notification ID
 *     responses:
 *       200:
 *         description: Notification deleted
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Notification not found
 */
// @desc    Delete a notification
// @route   DELETE /api/notifications/:id
// @access  Private
exports.deleteNotification = async (req, res) => {
	try {
		const notificationId = req.params.id;
		const userId = req.user._id;

		const notification = await Notification.findById(notificationId);

		if (!notification) {
			return res.status(404).json({
				success: false,
				error: 'Notification not found',
			});
		}

		// Check if notification belongs to the user
		if (notification.recipient.toString() !== userId.toString()) {
			return res.status(403).json({
				success: false,
				error: 'Not authorized to access this notification',
			});
		}

		await notification.remove();

		res.status(200).json({
			success: true,
			data: {},
		});
	} catch (error) {
		res.status(500).json({
			success: false,
			error: error.message,
		});
	}
};

/**
 * @swagger
 * /notifications/delete-all:
 *   delete:
 *     summary: Delete all notifications
 *     description: Delete all notifications for the current user
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: All notifications deleted
 *       401:
 *         description: Unauthorized
 */
// @desc    Delete all user notifications
// @route   DELETE /api/notifications/delete-all
// @access  Private
exports.deleteAllNotifications = async (req, res) => {
	try {
		const userId = req.user._id;

		// Delete all notifications for this user
		const result = await Notification.deleteMany({ recipient: userId });

		res.status(200).json({
			success: true,
			message: `Deleted ${result.deletedCount} notifications`,
			data: {
				deletedCount: result.deletedCount,
			},
		});
	} catch (error) {
		res.status(500).json({
			success: false,
			error: error.message,
		});
	}
};

// @desc    Send a notification to all users (admin only)
// @route   POST /api/notifications/broadcast
// @access  Private (Admin only)
exports.broadcastNotification = async (req, res) => {
	try {
		// Check if user is admin
		if (req.user.role !== 'admin') {
			return res.status(403).json({
				success: false,
				error: 'Only admins can broadcast notifications',
			});
		}

		const { title, message, type = 'system' } = req.body;

		if (!title || !message) {
			return res.status(400).json({
				success: false,
				error: 'Please provide title and message',
			});
		}

		// Create a global notification
		const notification = await Notification.create({
			recipient: req.user._id, // Admin who created it
			title,
			message,
			type,
			isGlobal: true,
		});

		// Find all active users
		const users = await User.find({ isActive: true }, '_id');
		const userIds = users.map((user) => user._id);

		// For each user, create a personalized notification
		const notificationPromises = userIds.map((userId) => {
			// Skip creating notification for the admin who sent it
			if (userId.toString() === req.user._id.toString()) {
				return Promise.resolve();
			}

			return Notification.create({
				recipient: userId,
				title,
				message,
				type,
				isGlobal: false, // Individual copies aren't global
			});
		});

		await Promise.all(notificationPromises);

		res.status(201).json({
			success: true,
			message: `Notification sent to ${userIds.length - 1} users`,
			data: notification,
		});
	} catch (error) {
		res.status(500).json({
			success: false,
			error: error.message,
		});
	}
};
