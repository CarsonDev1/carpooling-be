const express = require('express');
const router = express.Router();
const tripController = require('../controllers/tripController');
const { protect, requireDriver, requirePassenger } = require('../middleware/auth');

console.log('🔥 Loading trip routes...');

// Get vehicle types (không cần auth)
router.get('/vehicle-types', tripController.getVehicleTypes);

// All trip routes are protected and require authentication
router.use(protect);

// Ước tính giá trước khi tạo chuyến đi
router.post('/estimate-price', tripController.estimatePrice);

// Get all trips (with filters)
router.get('/', tripController.getTrips);

// Get a single trip by ID
router.get('/:id', tripController.getTrip);

// Get trips created by the current user (as driver)
router.get('/my-trips', tripController.getMyTrips);

// Get trips joined by the current user (as passenger)
router.get('/my-joined-trips', tripController.getMyJoinedTrips);

// === DRIVER ONLY ROUTES ===
// Create a new trip (driver only)
router.post('/', requireDriver, tripController.createTrip);

// Update a trip (driver only)
router.put('/:id', requireDriver, tripController.updateTrip);

// Delete a trip (driver only)
router.delete('/:id', requireDriver, tripController.deleteTrip);

// Cancel a trip (driver only)
router.patch('/:id/cancel', requireDriver, tripController.cancelTrip);

// Update trip status (driver only)
router.patch('/:id/status', requireDriver, tripController.updateTripStatus);

// Accept or decline a passenger request (driver only)
router.patch('/:id/passengers/:passengerId', requireDriver, tripController.updatePassengerStatus);

// === PASSENGER ROUTES ===
// Request to join a trip (any user can join as passenger)
router.post('/:id/join', tripController.joinTrip);

// Cancel join request or leave a trip (any user)
router.delete('/:id/join', tripController.cancelJoinRequest);

console.log('✅ Trip routes loaded successfully');

module.exports = router;
