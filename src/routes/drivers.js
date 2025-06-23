const express = require('express');
const router = express.Router();
const {
	registerDriver,
	updateVehicle,
	getDriverProfile,
	getDriverTrips,
	switchToPassenger,
} = require('../controllers/driverController');

const { protect } = require('../middleware/auth');

// All routes require authentication
router.use(protect);

// @route   POST /api/drivers/register
// @desc    Register as driver
// @access  Private
router.post('/register', registerDriver);

// @route   PUT /api/drivers/vehicle
// @desc    Update vehicle information
// @access  Private (Driver only)
router.put('/vehicle', updateVehicle);

// @route   GET /api/drivers/profile
// @desc    Get driver profile with statistics
// @access  Private (Driver only)
router.get('/profile', getDriverProfile);

// @route   GET /api/drivers/trips
// @desc    Get driver's trips
// @access  Private (Driver only)
router.get('/trips', getDriverTrips);

// @route   PATCH /api/drivers/switch-to-passenger
// @desc    Switch to passenger only mode
// @access  Private (Driver only)
router.patch('/switch-to-passenger', switchToPassenger);

module.exports = router;
