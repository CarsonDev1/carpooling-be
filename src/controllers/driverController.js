const User = require('../models/User');
const Trip = require('../models/Trip');

/**
 * @swagger
 * /drivers/register:
 *   post:
 *     summary: Register as a driver
 *     description: Register user as a driver and add vehicle information
 *     tags: [Drivers]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [vehicle]
 *             properties:
 *               vehicle:
 *                 type: object
 *                 required: [brand, model, licensePlate, seats, color, year]
 *                 properties:
 *                   brand:
 *                     type: string
 *                     example: "Toyota"
 *                   model:
 *                     type: string
 *                     example: "Vios"
 *                   licensePlate:
 *                     type: string
 *                     example: "51A-12345"
 *                   seats:
 *                     type: number
 *                     minimum: 2
 *                     maximum: 8
 *                     example: 4
 *                   color:
 *                     type: string
 *                     example: "Trắng"
 *                   year:
 *                     type: number
 *                     minimum: 1990
 *                     example: 2020
 *     responses:
 *       200:
 *         description: Driver registration successful
 *       400:
 *         description: Invalid vehicle information
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
// @desc    Register as driver
// @route   POST /api/drivers/register
// @access  Private
exports.registerDriver = async (req, res) => {
	try {
		const { vehicle } = req.body;

		// Validate vehicle information
		if (
			!vehicle ||
			!vehicle.brand ||
			!vehicle.model ||
			!vehicle.licensePlate ||
			!vehicle.seats ||
			!vehicle.color ||
			!vehicle.year
		) {
			return res.status(400).json({
				success: false,
				error: 'All vehicle information fields are required',
			});
		}

		// Check if license plate already exists
		const existingDriver = await User.findOne({
			'vehicle.licensePlate': vehicle.licensePlate.toUpperCase(),
			_id: { $ne: req.user._id },
		});

		if (existingDriver) {
			return res.status(400).json({
				success: false,
				error: 'Vehicle with this license plate is already registered',
			});
		}

		const user = await User.findById(req.user._id);

		// Update user role and vehicle info
		user.role = user.role === 'passenger' ? 'both' : 'driver';
		user.vehicle = {
			brand: vehicle.brand,
			model: vehicle.model,
			licensePlate: vehicle.licensePlate.toUpperCase(),
			seats: vehicle.seats,
			color: vehicle.color,
			year: vehicle.year,
		};

		await user.save();

		res.status(200).json({
			success: true,
			message: 'Driver registration successful',
			data: {
				role: user.role,
				vehicle: user.vehicle,
			},
		});
	} catch (error) {
		console.error('Driver registration error:', error);
		res.status(500).json({
			success: false,
			error: error.message,
		});
	}
};

/**
 * @swagger
 * /drivers/vehicle:
 *   put:
 *     summary: Update vehicle information
 *     description: Update driver's vehicle information
 *     tags: [Drivers]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               brand:
 *                 type: string
 *               model:
 *                 type: string
 *               licensePlate:
 *                 type: string
 *               seats:
 *                 type: number
 *               color:
 *                 type: string
 *               year:
 *                 type: number
 *     responses:
 *       200:
 *         description: Vehicle information updated
 *       400:
 *         description: Invalid data
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Not a driver
 *       500:
 *         description: Server error
 */
// @desc    Update vehicle information
// @route   PUT /api/drivers/vehicle
// @access  Private (Driver only)
exports.updateVehicle = async (req, res) => {
	try {
		const user = await User.findById(req.user._id);

		// Check if user is a driver
		if (!['driver', 'both'].includes(user.role)) {
			return res.status(403).json({
				success: false,
				error: 'Only drivers can update vehicle information',
			});
		}

		const updates = req.body;

		// If updating license plate, check for duplicates
		if (updates.licensePlate) {
			const existingDriver = await User.findOne({
				'vehicle.licensePlate': updates.licensePlate.toUpperCase(),
				_id: { $ne: req.user._id },
			});

			if (existingDriver) {
				return res.status(400).json({
					success: false,
					error: 'Vehicle with this license plate is already registered',
				});
			}
			updates.licensePlate = updates.licensePlate.toUpperCase();
		}

		// Update only provided fields
		Object.keys(updates).forEach((key) => {
			if (user.vehicle) {
				user.vehicle[key] = updates[key];
			}
		});

		await user.save();

		res.status(200).json({
			success: true,
			message: 'Vehicle information updated successfully',
			data: user.vehicle,
		});
	} catch (error) {
		console.error('Update vehicle error:', error);
		res.status(500).json({
			success: false,
			error: error.message,
		});
	}
};

/**
 * @swagger
 * /drivers/profile:
 *   get:
 *     summary: Get driver profile
 *     description: Get driver profile with statistics
 *     tags: [Drivers]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Driver profile
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Not a driver
 *       500:
 *         description: Server error
 */
// @desc    Get driver profile
// @route   GET /api/drivers/profile
// @access  Private (Driver only)
exports.getDriverProfile = async (req, res) => {
	try {
		const user = await User.findById(req.user._id);

		// Check if user is a driver
		if (!['driver', 'both'].includes(user.role)) {
			return res.status(403).json({
				success: false,
				error: 'Only drivers can access this endpoint',
			});
		}

		// Get driver statistics
		const totalTrips = await Trip.countDocuments({ driver: req.user._id });
		const completedTrips = await Trip.countDocuments({
			driver: req.user._id,
			status: 'completed',
		});
		const activeTrips = await Trip.countDocuments({
			driver: req.user._id,
			status: 'scheduled',
			departureTime: { $gte: new Date() },
		});

		const driverProfile = {
			_id: user._id,
			fullName: user.fullName,
			phone: user.phone,
			email: user.email,
			avatar: user.avatar,
			role: user.role,
			vehicle: user.vehicle,
			rating: user.rating.asDriver,
			statistics: {
				totalTrips,
				completedTrips,
				activeTrips,
				memberSince: user.createdAt,
			},
			isVerified: user.isVerified,
		};

		res.status(200).json({
			success: true,
			data: driverProfile,
		});
	} catch (error) {
		console.error('Get driver profile error:', error);
		res.status(500).json({
			success: false,
			error: error.message,
		});
	}
};

/**
 * @swagger
 * /drivers/trips:
 *   get:
 *     summary: Get driver's trips
 *     description: Get all trips created by the driver
 *     tags: [Drivers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [scheduled, in_progress, completed, cancelled]
 *         description: Filter by trip status
 *       - in: query
 *         name: page
 *         schema:
 *           type: number
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: number
 *         description: Items per page
 *     responses:
 *       200:
 *         description: Driver's trips
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Not a driver
 *       500:
 *         description: Server error
 */
// @desc    Get driver's trips
// @route   GET /api/drivers/trips
// @access  Private (Driver only)
exports.getDriverTrips = async (req, res) => {
	try {
		const user = await User.findById(req.user._id);

		// Check if user is a driver
		if (!['driver', 'both'].includes(user.role)) {
			return res.status(403).json({
				success: false,
				error: 'Only drivers can access this endpoint',
			});
		}

		// Build query
		const query = { driver: req.user._id };

		// Filter by status if provided
		if (req.query.status) {
			query.status = req.query.status;
		}

		// Pagination
		const page = parseInt(req.query.page, 10) || 1;
		const limit = parseInt(req.query.limit, 10) || 10;
		const startIndex = (page - 1) * limit;

		const trips = await Trip.find(query)
			.populate({
				path: 'passengers.user',
				select: 'fullName avatar phone rating',
			})
			.sort({ departureTime: -1 })
			.skip(startIndex)
			.limit(limit);

		const totalTrips = await Trip.countDocuments(query);

		res.status(200).json({
			success: true,
			count: trips.length,
			total: totalTrips,
			pagination: {
				currentPage: page,
				totalPages: Math.ceil(totalTrips / limit),
				limit,
			},
			data: trips,
		});
	} catch (error) {
		console.error('Get driver trips error:', error);
		res.status(500).json({
			success: false,
			error: error.message,
		});
	}
};

/**
 * @swagger
 * /drivers/switch-to-passenger:
 *   patch:
 *     summary: Switch to passenger only mode
 *     description: Change role from driver/both to passenger only
 *     tags: [Drivers]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Role switched successfully
 *       400:
 *         description: Cannot switch while having active trips
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Not a driver
 *       500:
 *         description: Server error
 */
// @desc    Switch to passenger only mode
// @route   PATCH /api/drivers/switch-to-passenger
// @access  Private (Driver only)
exports.switchToPassenger = async (req, res) => {
	try {
		const user = await User.findById(req.user._id);

		// Check if user is a driver
		if (!['driver', 'both'].includes(user.role)) {
			return res.status(403).json({
				success: false,
				error: 'Only drivers can use this endpoint',
			});
		}

		// Check for active trips
		const activeTrips = await Trip.countDocuments({
			driver: req.user._id,
			status: { $in: ['scheduled', 'in_progress'] },
			departureTime: { $gte: new Date() },
		});

		if (activeTrips > 0) {
			return res.status(400).json({
				success: false,
				error: 'Cannot switch to passenger mode while having active trips',
			});
		}

		// Update role
		user.role = 'passenger';
		await user.save();

		res.status(200).json({
			success: true,
			message: 'Successfully switched to passenger mode',
			data: {
				role: user.role,
			},
		});
	} catch (error) {
		console.error('Switch to passenger error:', error);
		res.status(500).json({
			success: false,
			error: error.message,
		});
	}
};
