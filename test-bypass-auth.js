// Temporarily bypass auth to test trip creation
const express = require('express');
const connectDB = require('./src/config/database');
const tripController = require('./src/controllers/tripController');

async function testTripCreation() {
	try {
		// Connect to database
		await connectDB();

		// Mock request object
		const mockReq = {
			user: {
				_id: '674fd59888f5db80981e30', // Using ID from your token
			},
			body: {
				startLocation: {
					address: '227 Nguyen Van Cu, Q5, TP HCM',
					coordinates: {
						lat: 10.7631,
						lng: 106.6814,
					},
				},
				endLocation: {
					address: 'Landmark 81, Vinhomes Central Park, TP HCM',
					coordinates: {
						lat: 10.7951,
						lng: 106.7218,
					},
				},
				departureTime: '2024-12-30T08:00:00.000Z',
				preferredVehicleType: 'car',
				maxPrice: 100000,
				availableSeats: 1,
				requestNote: 'Test trip direct controller call',
			},
		};

		// Mock response object
		const mockRes = {
			statusCode: null,
			responseData: null,
			status(code) {
				this.statusCode = code;
				return this;
			},
			json(data) {
				this.responseData = data;
				console.log(`📊 Response Status: ${this.statusCode}`);
				console.log('📋 Response Data:', JSON.stringify(data, null, 2));
				return this;
			},
		};

		console.log('🚀 Testing trip controller directly...');
		console.log('👤 Mock User ID:', mockReq.user._id);

		// Call controller directly
		await tripController.createTrip(mockReq, mockRes);

		// Check database after
		const Trip = require('./src/models/Trip');
		const tripCount = await Trip.countDocuments();
		const pendingTrips = await Trip.find({ status: 'pending_driver' });

		console.log('📊 Total trips in DB:', tripCount);
		console.log('📋 Pending driver trips:', pendingTrips.length);
	} catch (error) {
		console.error('❌ Error:', error.message);
		console.error('Stack:', error.stack);
	} finally {
		process.exit(0);
	}
}

testTripCreation();
