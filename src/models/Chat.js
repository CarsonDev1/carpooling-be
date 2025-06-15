const mongoose = require('mongoose');

// Schema for individual messages
const messageSchema = new mongoose.Schema(
	{
		sender: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'User',
			required: true,
		},
		content: {
			type: String,
			required: true,
			trim: true,
		},
		read: {
			type: Boolean,
			default: false,
		},
		// For storing image/file URLs
		attachment: {
			type: String,
		},
		// For messages that might be deleted
		isDeleted: {
			type: Boolean,
			default: false,
		},
	},
	{
		timestamps: true,
	}
);

// Main Chat schema
const chatSchema = new mongoose.Schema(
	{
		// The trip this chat is related to (optional)
		trip: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Trip',
		},
		// Always exactly 2 participants in direct chat
		participants: [
			{
				type: mongoose.Schema.Types.ObjectId,
				ref: 'User',
				required: true,
			},
		],
		// Array of messages in this chat
		messages: [messageSchema],
		// Metadata about the chat
		lastMessage: {
			content: String,
			sender: {
				type: mongoose.Schema.Types.ObjectId,
				ref: 'User',
			},
			timestamp: Date,
		},
		isActive: {
			type: Boolean,
			default: true,
		},
	},
	{
		timestamps: true,
	}
);

// Ensure we always have exactly 2 participants
chatSchema.pre('save', function (next) {
	if (this.participants.length !== 2) {
		const error = new Error('Chat must have exactly 2 participants');
		return next(error);
	}
	next();
});

// Index to find chats between two users
chatSchema.index({ participants: 1 });
// Index for trip-related chats
chatSchema.index({ trip: 1 });
// Index for faster queries of active chats
chatSchema.index({ isActive: 1 });
// Compound index for finding specific chat between two users
chatSchema.index({ 'participants.0': 1, 'participants.1': 1 });

// Method to add a message to the chat
chatSchema.methods.addMessage = async function (senderId, content, attachment = null) {
	const message = {
		sender: senderId,
		content,
		attachment,
		read: false,
		createdAt: new Date(),
		updatedAt: new Date(),
	};

	this.messages.push(message);
	this.lastMessage = {
		content,
		sender: senderId,
		timestamp: new Date(),
	};

	await this.save();
	return message;
};

// Method to mark messages as read
chatSchema.methods.markAsRead = async function (userId) {
	// Only mark messages sent by the other participant as read
	this.messages.forEach((message) => {
		if (!message.sender.equals(userId) && !message.read) {
			message.read = true;
		}
	});

	await this.save();
	return this;
};

// Static method to find or create a chat between two users
chatSchema.statics.findOrCreateChat = async function (user1Id, user2Id, tripId = null) {
	// Try to find an existing chat
	let chat = await this.findOne({
		participants: { $all: [user1Id, user2Id] },
		trip: tripId,
	});

	// If no chat exists, create one
	if (!chat) {
		chat = await this.create({
			participants: [user1Id, user2Id],
			trip: tripId,
			messages: [],
			isActive: true,
		});
	}

	return chat;
};

module.exports = mongoose.model('Chat', chatSchema);
module.exports.Message = messageSchema;
