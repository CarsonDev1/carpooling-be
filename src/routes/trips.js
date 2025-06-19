const express = require('express');
const router = express.Router();
const tripController = require('../controllers/tripController');
const authMiddleware = require('../middleware/auth');

console.log('🔥 Loading trip routes...');

// Get vehicle types (không cần auth)
router.get('/vehicle-types', tripController.getVehicleTypes);

// All trip routes are protected and require authentication
router.use(authMiddleware.protect);

// Ước tính giá trước khi tạo chuyến đi
router.post('/estimate-price', tripController.estimatePrice);

// Get all trips (with filters)
router.get('/', tripController.getTrips);

// Create a new trip (driver)
router.post('/', tripController.createTrip);

// Get trips created by the current user (as driver)
router.get('/my-trips', tripController.getMyTrips);

// Get trips joined by the current user (as passenger)
router.get('/my-joined-trips', tripController.getMyJoinedTrips);

// Get a single trip by ID
router.get('/:id', tripController.getTrip);

// Update a trip (driver only)
router.put('/:id', tripController.updateTrip);

// Delete a trip (driver only)
router.delete('/:id', tripController.deleteTrip);

// Cancel a trip (driver only)
router.patch('/:id/cancel', tripController.cancelTrip);

// Update trip status (e.g. start, complete) - (driver only)
router.patch('/:id/status', tripController.updateTripStatus);

// Request to join a trip (passenger)
router.post('/:id/join', tripController.joinTrip);

// Cancel join request or leave a trip (passenger)
router.delete('/:id/join', tripController.cancelJoinRequest);

// Accept or decline a passenger request (driver only)
router.patch('/:id/passengers/:passengerId', tripController.updatePassengerStatus);

console.log('✅ Trip routes loaded successfully');

module.exports = router;
