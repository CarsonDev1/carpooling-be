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

// === BOOKING REQUEST ROUTES ===
// Create a booking request (any user can create)
router.post('/', tripController.createTrip);

// Driver request to accept a booking
router.post('/:id/driver-request', requireDriver, tripController.driverRequestBooking);

// Passenger accept/decline driver requests
router.patch('/:id/driver-requests/:requestId', tripController.respondToDriverRequest);

// === DRIVER ONLY ROUTES (confirmed trips) ===
// Update a trip (driver only, after confirmed)
router.put('/:id', requireDriver, tripController.updateTrip);

// Delete a trip (driver only, before confirmed)
router.delete('/:id', tripController.deleteTrip); // Allow both passenger (if pending) and driver (if confirmed)

// Cancel a trip (driver only)
router.patch('/:id/cancel', requireDriver, tripController.cancelTrip);

// Update trip status (driver only)
router.patch('/:id/status', requireDriver, tripController.updateTripStatus);

// === LEGACY PASSENGER ROUTES (for multi-passenger future) ===
// Request to join a trip (for future multi-passenger support)
router.post('/:id/join', tripController.joinTrip);

// Cancel join request or leave a trip
router.delete('/:id/join', tripController.cancelJoinRequest);

console.log('✅ Trip routes loaded successfully');

module.exports = router;
