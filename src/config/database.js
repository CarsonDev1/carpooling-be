const mongoose = require('mongoose');

const connectDB = async () => {
	try {
		// Add connection options for better reliability
		const conn = await mongoose.connect(process.env.MONGODB_URI, {
			serverSelectionTimeoutMS: 5000, // 5 seconds
			socketTimeoutMS: 45000, // 45 seconds
			family: 4, // Force IPv4
			maxPoolSize: 10, // Maintain up to 10 socket connections
		});

		console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
		return conn;
	} catch (error) {
		console.error('❌ MongoDB connection error:', error.message);

		// More helpful error message
		if (error.name === 'MongooseServerSelectionError') {
			console.error('Make sure MongoDB is running and MONGODB_URI is correct in .env file');
		}

		// Only exit in production, allow development to continue
		if (process.env.NODE_ENV === 'production') {
			process.exit(1);
		} else {
			console.warn('⚠️ Continuing without database in development mode');
			return null;
		}
	}
};

// Connection events
mongoose.connection.on('disconnected', () => {
	console.log('📱 MongoDB disconnected');
});

mongoose.connection.on('error', (err) => {
	console.error('❌ MongoDB error:', err);
});

// Add reconnection logic
mongoose.connection.on('disconnected', () => {
	console.log('Attempting to reconnect to MongoDB...');
	setTimeout(() => {
		connectDB().catch((err) => console.error('Failed reconnection attempt:', err));
	}, 5000); // Wait 5 seconds before reconnecting
});

module.exports = connectDB;
