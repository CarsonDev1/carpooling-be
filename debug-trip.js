const mongoose = require('mongoose');
const Trip = require('./src/models/Trip');

async function debugTrip() {
	try {
		// Connect to database
		await mongoose.connect('mongodb://localhost:27017/test');
		console.log('✅ Connected to MongoDB');

		// Check existing trips
		const existingTrips = await Trip.find().limit(5);
		console.log('📊 Existing trips count:', await Trip.countDocuments());
		console.log(
			'📋 Sample existing trip statuses:',
			existingTrips.map((t) => t.status)
		);

		// Test create new trip
		console.log('\n🔄 Testing trip creation...');
		const testTrip = new Trip({
			requestedBy: new mongoose.Types.ObjectId(),
			startLocation: {
				address: 'Test Start Location',
				coordinates: {
					type: 'Point',
					coordinates: [106.6814, 10.7631], // [lng, lat]
				},
			},
			endLocation: {
				address: 'Test End Location',
				coordinates: {
					type: 'Point',
					coordinates: [106.7218, 10.7951], // [lng, lat]
				},
			},
			departureTime: new Date('2024-12-30T08:00:00.000Z'),
			availableSeats: 1,
			preferredVehicleType: 'car',
			maxPrice: 100000,
			status: 'pending_driver',
		});

		// Validate before save
		const validationError = testTrip.validateSync();
		if (validationError) {
			console.error('❌ Validation Error:', validationError.message);
			return;
		}

		// Save to database
		const savedTrip = await testTrip.save();
		console.log('✅ Trip saved successfully!');
		console.log('📝 Trip ID:', savedTrip._id);
		console.log('📝 Trip Status:', savedTrip.status);

		// Check updated count
		const newCount = await Trip.countDocuments();
		console.log('📊 New trips count:', newCount);

		// Check by status
		const pendingDriverTrips = await Trip.find({ status: 'pending_driver' });
		console.log('📋 Pending driver trips:', pendingDriverTrips.length);
	} catch (error) {
		console.error('❌ Error:', error.message);
		console.error('Stack:', error.stack);
	} finally {
		await mongoose.disconnect();
		console.log('🔌 Disconnected from MongoDB');
	}
}

debugTrip();
