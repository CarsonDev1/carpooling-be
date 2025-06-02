const mongoose = require('mongoose');

const connectDB = async () => {
	try {
		// Bỏ các options deprecated
		const conn = await mongoose.connect(process.env.MONGODB_URI);

		console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
	} catch (error) {
		console.error('❌ MongoDB connection error:', error.message);
		process.exit(1);
	}
};

// Connection events
mongoose.connection.on('disconnected', () => {
	console.log('📱 MongoDB disconnected');
});

mongoose.connection.on('error', (err) => {
	console.error('❌ MongoDB error:', err);
});

module.exports = connectDB;
