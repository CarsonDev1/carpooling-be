const Chat = require('../models/Chat');
const User = require('../models/User');
const Trip = require('../models/Trip');
const Notification = require('../models/Notification');

// @desc    Get all chats for the current user
// @route   GET /api/chats
// @access  Private
exports.getMyChats = async (req, res) => {
	try {
		const userId = req.user._id;

		// Find all chats where the current user is a participant
		const chats = await Chat.find({
			participants: userId,
			isActive: true,
		})
			.populate({
				path: 'participants',
				select: 'fullName avatar phone',
			})
			.populate({
				path: 'trip',
				select: 'startLocation endLocation departureTime status',
			})
			.sort({ updatedAt: -1 });

		// Format chat data to show the other participant clearly
		const formattedChats = chats.map((chat) => {
			const chatObj = chat.toObject();

			// Find the other participant
			const otherParticipant = chatObj.participants.find((p) => p._id.toString() !== userId.toString());

			// Add convenience property for the other participant
			chatObj.otherParticipant = otherParticipant;

			// Count unread messages
			const unreadCount = chatObj.messages.filter(
				(message) => !message.read && message.sender.toString() !== userId.toString()
			).length;

			chatObj.unreadCount = unreadCount;

			// Don't send all messages in the chat list
			delete chatObj.messages;

			return chatObj;
		});

		res.status(200).json({
			success: true,
			count: formattedChats.length,
			data: formattedChats,
		});
	} catch (error) {
		res.status(500).json({
			success: false,
			error: error.message,
		});
	}
};

// @desc    Get messages for a specific chat
// @route   GET /api/chats/:chatId/messages
// @access  Private
exports.getChatMessages = async (req, res) => {
	try {
		const { chatId } = req.params;
		const userId = req.user._id;

		// Find the chat
		const chat = await Chat.findById(chatId).populate({
			path: 'participants',
			select: 'fullName avatar phone',
		});

		if (!chat) {
			return res.status(404).json({
				success: false,
				error: 'Chat not found',
			});
		}

		// Check if user is a participant
		if (!chat.participants.some((p) => p._id.toString() === userId.toString())) {
			return res.status(403).json({
				success: false,
				error: 'Not authorized to access this chat',
			});
		}

		// Format the response
		const chatData = chat.toObject();

		// Find the other participant
		const otherParticipant = chatData.participants.find((p) => p._id.toString() !== userId.toString());

		// Add convenience property for the other participant
		chatData.otherParticipant = otherParticipant;

		// Mark messages as read
		await chat.markAsRead(userId);

		res.status(200).json({
			success: true,
			data: chatData,
		});
	} catch (error) {
		res.status(500).json({
			success: false,
			error: error.message,
		});
	}
};

// @desc    Send a message in a chat
// @route   POST /api/chats/:chatId/messages
// @access  Private
exports.sendMessage = async (req, res) => {
	try {
		const { chatId } = req.params;
		const { content, attachment } = req.body;
		const userId = req.user._id;

		if (!content && !attachment) {
			return res.status(400).json({
				success: false,
				error: 'Message content or attachment is required',
			});
		}

		// Find the chat
		const chat = await Chat.findById(chatId).populate({
			path: 'participants',
			select: 'fullName avatar notificationSettings',
		});

		if (!chat) {
			return res.status(404).json({
				success: false,
				error: 'Chat not found',
			});
		}

		// Check if user is a participant
		if (!chat.participants.some((p) => p._id.toString() === userId.toString())) {
			return res.status(403).json({
				success: false,
				error: 'Not authorized to send messages in this chat',
			});
		}

		// Add the message
		const message = await chat.addMessage(userId, content, attachment);

		// Find the recipient (other participant)
		const recipient = chat.participants.find((p) => p._id.toString() !== userId.toString());

		// Send notification to the recipient
		await Notification.create({
			recipient: recipient._id,
			title: 'New Message',
			message: `You received a new message from ${req.user.fullName}`,
			type: 'message',
			relatedId: chat._id,
			relatedModel: 'Chat',
		});

		res.status(201).json({
			success: true,
			data: message,
		});
	} catch (error) {
		res.status(500).json({
			success: false,
			error: error.message,
		});
	}
};

// @desc    Create a new chat or get existing one
// @route   POST /api/chats
// @access  Private
exports.createChat = async (req, res) => {
	try {
		const { userId, tripId } = req.body;
		const currentUserId = req.user._id;

		if (!userId) {
			return res.status(400).json({
				success: false,
				error: 'User ID is required',
			});
		}

		// Check if target user exists
		const targetUser = await User.findById(userId);
		if (!targetUser) {
			return res.status(404).json({
				success: false,
				error: 'User not found',
			});
		}

		// Don't allow chat with self
		if (userId === currentUserId.toString()) {
			return res.status(400).json({
				success: false,
				error: 'Cannot create chat with yourself',
			});
		}

		// If tripId is provided, check if it's valid and both users are part of it
		if (tripId) {
			const trip = await Trip.findById(tripId);

			if (!trip) {
				return res.status(404).json({
					success: false,
					error: 'Trip not found',
				});
			}

			const isDriverOrPassenger =
				trip.driver.toString() === currentUserId.toString() ||
				trip.passengers.some((p) => p.user.toString() === currentUserId.toString() && p.status === 'accepted');

			const isOtherUserDriverOrPassenger =
				trip.driver.toString() === userId ||
				trip.passengers.some((p) => p.user.toString() === userId && p.status === 'accepted');

			if (!isDriverOrPassenger || !isOtherUserDriverOrPassenger) {
				return res.status(403).json({
					success: false,
					error: 'Both users must be participants in the trip to create a trip-related chat',
				});
			}
		}

		// Find or create chat
		const chat = await Chat.findOrCreateChat(currentUserId, userId, tripId);

		// Populate participants
		await chat.populate({
			path: 'participants',
			select: 'fullName avatar phone',
		});

		// If trip ID is provided, populate trip data
		if (tripId) {
			await chat.populate({
				path: 'trip',
				select: 'startLocation endLocation departureTime status',
			});
		}

		res.status(201).json({
			success: true,
			data: chat,
		});
	} catch (error) {
		res.status(500).json({
			success: false,
			error: error.message,
		});
	}
};

// @desc    Mark all messages in a chat as read
// @route   PATCH /api/chats/:chatId/read
// @access  Private
exports.markChatAsRead = async (req, res) => {
	try {
		const { chatId } = req.params;
		const userId = req.user._id;

		// Find the chat
		const chat = await Chat.findById(chatId);

		if (!chat) {
			return res.status(404).json({
				success: false,
				error: 'Chat not found',
			});
		}

		// Check if user is a participant
		if (!chat.participants.some((p) => p.toString() === userId.toString())) {
			return res.status(403).json({
				success: false,
				error: 'Not authorized to access this chat',
			});
		}

		// Mark messages as read
		await chat.markAsRead(userId);

		res.status(200).json({
			success: true,
			message: 'Messages marked as read',
		});
	} catch (error) {
		res.status(500).json({
			success: false,
			error: error.message,
		});
	}
};

// @desc    Delete (archive) a chat
// @route   DELETE /api/chats/:chatId
// @access  Private
exports.deleteChat = async (req, res) => {
	try {
		const { chatId } = req.params;
		const userId = req.user._id;

		// Find the chat
		const chat = await Chat.findById(chatId);

		if (!chat) {
			return res.status(404).json({
				success: false,
				error: 'Chat not found',
			});
		}

		// Check if user is a participant
		if (!chat.participants.some((p) => p.toString() === userId.toString())) {
			return res.status(403).json({
				success: false,
				error: 'Not authorized to delete this chat',
			});
		}

		// Don't actually delete, just mark as inactive
		chat.isActive = false;
		await chat.save();

		res.status(200).json({
			success: true,
			message: 'Chat deleted successfully',
		});
	} catch (error) {
		res.status(500).json({
			success: false,
			error: error.message,
		});
	}
};

// @desc    Count unread messages across all chats
// @route   GET /api/chats/unread-count
// @access  Private
exports.getUnreadCount = async (req, res) => {
	try {
		const userId = req.user._id;

		// Find all chats for the user
		const chats = await Chat.find({
			participants: userId,
			isActive: true,
		});

		// Count unread messages
		let totalUnread = 0;
		for (const chat of chats) {
			const unreadInChat = chat.messages.filter(
				(message) => !message.read && message.sender.toString() !== userId.toString()
			).length;

			totalUnread += unreadInChat;
		}

		res.status(200).json({
			success: true,
			unreadCount: totalUnread,
		});
	} catch (error) {
		res.status(500).json({
			success: false,
			error: error.message,
		});
	}
};
