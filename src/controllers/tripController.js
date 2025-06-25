const Trip = require('../models/Trip');
const User = require('../models/User');
const Notification = require('../models/Notification');
const mongoose = require('mongoose');
const { calculatePrice, VEHICLE_TYPES } = require('../utils/priceCalculator');

/**
 * @swagger
 * /trips:
 *   post:
 *     summary: Create a booking request
 *     description: Create a new booking request as a passenger. Drivers can then respond to accept the booking. Price is estimated for reference.
 *     tags: [Trips]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [startLocation, endLocation, departureTime]
 *             properties:
 *               startLocation:
 *                 type: object
 *                 required: [address, coordinates]
 *                 properties:
 *                   address:
 *                     type: string
 *                     example: "123 Nguyễn Huệ, Q1, HCM"
 *                   coordinates:
 *                     type: object
 *                     properties:
 *                       lat:
 *                         type: number
 *                         example: 10.7769
 *                       lng:
 *                         type: number
 *                         example: 106.7009
 *               endLocation:
 *                 type: object
 *                 required: [address, coordinates]
 *                 properties:
 *                   address:
 *                     type: string
 *                     example: "456 Lê Lợi, Q3, HCM"
 *                   coordinates:
 *                     type: object
 *                     properties:
 *                       lat:
 *                         type: number
 *                         example: 10.7851
 *                       lng:
 *                         type: number
 *                         example: 106.7085
 *               departureTime:
 *                 type: string
 *                 format: date-time
 *                 example: "2024-01-15T08:00:00.000Z"
 *               preferredVehicleType:
 *                 type: string
 *                 enum: [motorcycle, car, suv, luxury]
 *                 default: car
 *                 description: Preferred vehicle type for the trip
 *               maxPrice:
 *                 type: number
 *                 minimum: 0
 *                 description: Maximum price passenger is willing to pay (VND). If not provided, estimated price + 20% buffer is used
 *                 example: 100000
 *               availableSeats:
 *                 type: number
 *                 minimum: 1
 *                 default: 1
 *                 description: Number of seats needed
 *               requestNote:
 *                 type: string
 *                 description: Special note or request from passenger
 *                 example: "Cần đi gấp, tôi sẽ chờ ở tầng 1"
 *               estimatedArrivalTime:
 *                 type: string
 *                 format: date-time
 *               currency:
 *                 type: string
 *                 default: VND
 *               notes:
 *                 type: string
 *                 description: General notes about the trip
 *               stops:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     address:
 *                       type: string
 *                     coordinates:
 *                       type: object
 *                       properties:
 *                         lat:
 *                           type: number
 *                         lng:
 *                           type: number
 *               recurring:
 *                 type: object
 *                 properties:
 *                   isRecurring:
 *                     type: boolean
 *                     default: false
 *                   pattern:
 *                     type: string
 *                     enum: [daily, weekdays, weekends, weekly]
 *                   endDate:
 *                     type: string
 *                     format: date-time
 *     responses:
 *       201:
 *         description: Booking request created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Booking request created successfully. Waiting for drivers to respond."
 *                 data:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                     status:
 *                       type: string
 *                       example: "pending_driver"
 *                     requestedBy:
 *                       type: string
 *                     driver:
 *                       type: string
 *                       nullable: true
 *                       example: null
 *                     startLocation:
 *                       type: object
 *                     endLocation:
 *                       type: object
 *                     departureTime:
 *                       type: string
 *                       format: date-time
 *                     preferredVehicleType:
 *                       type: string
 *                     maxPrice:
 *                       type: number
 *                 pricing:
 *                   type: object
 *                   properties:
 *                     estimatedPrice:
 *                       type: number
 *                       description: Estimated price based on preferred vehicle type
 *                       example: 85000
 *                     maxPrice:
 *                       type: number
 *                       description: Maximum price passenger will pay
 *                       example: 100000
 *                     breakdown:
 *                       type: object
 *                       properties:
 *                         distanceInKm:
 *                           type: number
 *                         baseRate:
 *                           type: number
 *                         peakHourMultiplier:
 *                           type: number
 *                         qualityMultiplier:
 *                           type: number
 *                     preferredVehicleType:
 *                       type: string
 *                       example: "car"
 *                     currency:
 *                       type: string
 *                       example: "VND"
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
// @desc    Create a booking request (passenger creates trip request)
// @route   POST /api/trips
// @access  Private (Any user can create booking request)
exports.createTrip = async (req, res) => {
	try {
		let {
			startLocation,
			endLocation,
			departureTime,
			availableSeats,
			notes,
			stops,
			preferredVehicleType,
			maxPrice,
			requestNote,
			currency,
			recurring,
			estimatedArrivalTime,
		} = req.body;

		// Tính giá ước tính dựa trên loại xe passenger mong muốn
		const estimatedPriceData = calculatePrice(
			startLocation.coordinates,
			endLocation.coordinates,
			{
				type: preferredVehicleType || 'car',
				year: new Date().getFullYear() - 3, // Giả định xe 3 năm tuổi
			},
			departureTime
		);

		// Giá ước tính cho passenger tham khảo
		const estimatedPrice = estimatedPriceData.price;

		// Nếu passenger không set maxPrice, dùng giá ước tính + 20% buffer
		const finalMaxPrice = maxPrice || Math.ceil(estimatedPrice * 1.2);

		// Format coordinates as GeoJSON points
		if (startLocation && startLocation.coordinates) {
			startLocation = {
				...startLocation,
				coordinates: {
					type: 'Point',
					coordinates: [startLocation.coordinates.lng, startLocation.coordinates.lat], // [longitude, latitude]
				},
			};
		}

		if (endLocation && endLocation.coordinates) {
			endLocation = {
				...endLocation,
				coordinates: {
					type: 'Point',
					coordinates: [endLocation.coordinates.lng, endLocation.coordinates.lat], // [longitude, latitude]
				},
			};
		}

		// Format stops coordinates if present
		if (stops && Array.isArray(stops)) {
			stops = stops.map((stop) => {
				if (stop.coordinates) {
					return {
						...stop,
						coordinates: {
							type: 'Point',
							coordinates: [stop.coordinates.lng, stop.coordinates.lat], // [longitude, latitude]
						},
					};
				}
				return stop;
			});
		}

		// Create booking request
		const trip = await Trip.create({
			requestedBy: req.user._id,
			driver: null, // Chưa có driver
			startLocation,
			endLocation,
			departureTime,
			availableSeats: availableSeats || 1, // Mặc định 1 chỗ
			notes,
			stops: stops || [],
			preferredVehicleType: preferredVehicleType || 'car',
			maxPrice: finalMaxPrice,
			requestNote,
			price: 0, // Sẽ được set khi driver accept
			currency: currency || 'VND',
			recurring: recurring || { isRecurring: false },
			estimatedArrivalTime,
			status: 'pending_driver',
		});

		// Debug logging
		console.log('✅ Trip Created:', {
			tripId: trip._id,
			status: trip.status,
			requestedBy: trip.requestedBy,
			departureTime: trip.departureTime,
			preferredVehicleType: trip.preferredVehicleType,
		});

		res.status(201).json({
			success: true,
			message: 'Booking request created successfully. Waiting for drivers to respond.',
			data: trip,
			pricing: {
				estimatedPrice,
				maxPrice: finalMaxPrice,
				breakdown: estimatedPriceData.breakdown,
				preferredVehicleType: preferredVehicleType || 'car',
				currency: currency || 'VND',
			},
		});
	} catch (error) {
		console.error('Create trip error:', error);
		res.status(500).json({
			success: false,
			error: error.message,
		});
	}
};

/**
 * @swagger
 * /trips:
 *   get:
 *     summary: Get trips based on user role
 *     description: |
 *       Get trips with role-based filtering:
 *       - For passengers (role=passenger): Returns their own booking requests
 *       - For drivers (role=driver): Returns available booking requests that need drivers
 *     tags: [Trips]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [passenger, driver]
 *           default: passenger
 *         description: |
 *           Filter trips based on user role:
 *           - passenger: Show user's own booking requests
 *           - driver: Show available booking requests to accept
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: Filter by trip status
 *       - in: query
 *         name: fromDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter by departure time (start date)
 *       - in: query
 *         name: toDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter by departure time (end date)
 *       - in: query
 *         name: seats
 *         schema:
 *           type: number
 *         description: Filter by minimum available seats
 *       - in: query
 *         name: startLat
 *         schema:
 *           type: number
 *         description: Starting location latitude
 *       - in: query
 *         name: startLng
 *         schema:
 *           type: number
 *         description: Starting location longitude
 *       - in: query
 *         name: endLat
 *         schema:
 *           type: number
 *         description: Ending location latitude
 *       - in: query
 *         name: endLng
 *         schema:
 *           type: number
 *         description: Ending location longitude
 *       - in: query
 *         name: distance
 *         schema:
 *           type: number
 *         description: Max distance in meters
 *       - in: query
 *         name: includePast
 *         schema:
 *           type: boolean
 *         description: Include past trips
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           enum: [date_asc, date_desc, price_asc, price_desc]
 *         description: Sort options
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
 *         description: List of trips
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
// @desc    Get trips (for passengers: their requests, for drivers: available requests)
// @route   GET /api/trips
// @access  Private
exports.getTrips = async (req, res) => {
	try {
		// Build query based on filters and user role
		const query = {};

		// If user is passenger, show their own booking requests by default
		// If user is driver, show available booking requests by default
		const userRole = req.query.role || 'passenger';

		if (userRole === 'passenger') {
			// Show passenger's own booking requests (support both old and new schema)
			query.$or = [
				{ requestedBy: req.user._id }, // New schema
				{ driver: req.user._id, passengers: { $size: 0 } }, // Old schema - trips user created as driver
			];
		} else if (userRole === 'driver') {
			// Show available booking requests that need drivers (support both schemas)
			query.$or = [
				{ status: { $in: ['pending_driver'] } }, // New schema - pending requests
				{ status: 'scheduled', driver: { $ne: req.user._id } }, // Old schema - scheduled trips by others
			];
		}

		// Filter by status (override role-based status if explicitly provided)
		if (req.query.status) {
			query.status = req.query.status;
		}

		// Filter by departure time range
		if (req.query.fromDate) {
			query.departureTime = { $gte: new Date(req.query.fromDate) };
		}

		if (req.query.toDate) {
			query.departureTime = {
				...query.departureTime,
				$lte: new Date(req.query.toDate),
			};
		}

		// Filter by available seats
		if (req.query.seats) {
			query.availableSeats = { $gte: parseInt(req.query.seats) };
		}

		// Filter by proximity to start location (if coordinates provided)
		const locationQuery = {};
		if (req.query.startLat && req.query.startLng) {
			locationQuery['startLocation.coordinates'] = {
				$near: {
					$geometry: {
						type: 'Point',
						coordinates: [parseFloat(req.query.startLng), parseFloat(req.query.startLat)],
					},
					$maxDistance: req.query.distance ? parseInt(req.query.distance) : 10000, // Default 10km
				},
			};
		}

		// Filter by proximity to end location (if coordinates provided)
		if (req.query.endLat && req.query.endLng) {
			locationQuery['endLocation.coordinates'] = {
				$near: {
					$geometry: {
						type: 'Point',
						coordinates: [parseFloat(req.query.endLng), parseFloat(req.query.endLat)],
					},
					$maxDistance: req.query.distance ? parseInt(req.query.distance) : 10000, // Default 10km
				},
			};
		}

		// Combine filters
		const finalQuery = { ...query, ...locationQuery };

		// Only get future trips by default (unless explicitly including past trips)
		// TEMPORARILY DISABLED for debugging - include all trips regardless of time
		// if (!req.query.includePast) {
		// 	// Merge with existing departureTime query if any
		// 	finalQuery.departureTime = {
		// 		...finalQuery.departureTime,
		// 		$gte: new Date(),
		// 	};
		// }

		// Debug logging
		console.log('🔍 getTrips Debug:', {
			userRole,
			userId: req.user._id,
			baseQuery: query,
			finalQuery,
			queryParams: req.query,
		});

		// Additional logging for debugging old vs new data
		const allTrips = await Trip.find({}).limit(3);
		console.log('📊 Sample trips in DB:');
		allTrips.forEach((t, i) => {
			console.log(`  ${i + 1}. ID: ${t._id}`);
			console.log(`     Status: ${t.status}`);
			console.log(`     Driver: ${t.driver || 'null'}`);
			console.log(`     RequestedBy: ${t.requestedBy || 'null'}`);
			console.log(`     DepartureTime: ${t.departureTime}`);
			console.log(`     CreatedAt: ${t.createdAt}`);
			console.log('     ---');
		});

		const totalCount = await Trip.countDocuments({});
		console.log('📈 Total trips in DB:', totalCount);

		// Test the exact query being used
		console.log('🔍 Testing query step by step:');

		// Test without departureTime filter
		const queryWithoutTime = { ...finalQuery };
		delete queryWithoutTime.departureTime;
		const countWithoutTime = await Trip.countDocuments(queryWithoutTime);
		console.log(`  Without time filter: ${countWithoutTime} trips`);

		// Test with original query
		const countWithTime = await Trip.countDocuments(finalQuery);
		console.log(`  With time filter: ${countWithTime} trips`);

		// Show current time for comparison
		console.log(`  Current time: ${new Date()}`);

		// Test scheduled trips specifically for drivers
		if (userRole === 'driver') {
			const scheduledCount = await Trip.countDocuments({
				status: 'scheduled',
				driver: { $ne: req.user._id },
			});
			console.log(`  Scheduled trips (not by user): ${scheduledCount}`);
		}

		// Sort options
		let sort = {};
		if (req.query.sort) {
			switch (req.query.sort) {
				case 'date_asc':
					sort = { departureTime: 1 };
					break;
				case 'date_desc':
					sort = { departureTime: -1 };
					break;
				case 'price_asc':
					sort = { price: 1 };
					break;
				case 'price_desc':
					sort = { price: -1 };
					break;
				default:
					sort = { departureTime: 1 };
			}
		} else {
			sort = { departureTime: 1 }; // Default sort by departure time ascending
		}

		// Pagination
		const page = parseInt(req.query.page, 10) || 1;
		const limit = parseInt(req.query.limit, 10) || 10;
		const startIndex = (page - 1) * limit;

		const trips = await Trip.find(finalQuery)
			.populate({
				path: 'requestedBy',
				select: 'fullName avatar rating phone',
			})
			.populate({
				path: 'driver',
				select: 'fullName avatar rating vehicle phone',
			})
			.populate({
				path: 'driverRequests.driver',
				select: 'fullName avatar rating vehicle phone',
			})
			.sort(sort)
			.skip(startIndex)
			.limit(limit);

		const totalTrips = await Trip.countDocuments(finalQuery);

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
		res.status(500).json({
			success: false,
			error: error.message,
		});
	}
};

/**
 * @swagger
 * /trips/{id}:
 *   get:
 *     summary: Get a single trip
 *     description: Get detailed information about a specific trip
 *     tags: [Trips]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Trip ID
 *     responses:
 *       200:
 *         description: Trip details
 *       404:
 *         description: Trip not found
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
// @desc    Get a single trip
// @route   GET /api/trips/:id
// @access  Private
exports.getTrip = async (req, res) => {
	try {
		const trip = await Trip.findById(req.params.id)
			.populate({
				path: 'requestedBy',
				select: 'fullName avatar rating phone',
			})
			.populate({
				path: 'driver',
				select: 'fullName avatar rating vehicle phone',
			})
			.populate({
				path: 'driverRequests.driver',
				select: 'fullName avatar rating vehicle phone',
			})
			.populate({
				path: 'passengers.user',
				select: 'fullName avatar rating phone',
			});

		if (!trip) {
			return res.status(404).json({
				success: false,
				error: 'Trip not found',
			});
		}

		res.status(200).json({
			success: true,
			data: trip,
		});
	} catch (error) {
		res.status(500).json({
			success: false,
			error: error.message,
		});
	}
};

/**
 * @swagger
 * /trips/{id}:
 *   put:
 *     summary: Update a trip
 *     description: Update a trip (driver only)
 *     tags: [Trips]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Trip ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               startLocation:
 *                 type: object
 *               endLocation:
 *                 type: object
 *               departureTime:
 *                 type: string
 *                 format: date-time
 *               availableSeats:
 *                 type: number
 *               notes:
 *                 type: string
 *               stops:
 *                 type: array
 *               price:
 *                 type: number
 *               status:
 *                 type: string
 *                 enum: [pending, active, cancelled, completed]
 *     responses:
 *       200:
 *         description: Trip updated successfully
 *       404:
 *         description: Trip not found
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
// @desc    Update a trip
// @route   PUT /api/trips/:id
// @access  Private (Driver only)
exports.updateTrip = async (req, res) => {
	try {
		let trip = await Trip.findById(req.params.id);

		if (!trip) {
			return res.status(404).json({
				success: false,
				error: 'Trip not found',
			});
		}

		// Check if user is authorized (trip requester if pending, or driver if confirmed)
		const isRequester = trip.requestedBy && trip.requestedBy.toString() === req.user._id.toString();
		const isDriver = trip.driver && trip.driver.toString() === req.user._id.toString();

		if (!isRequester && !isDriver) {
			return res.status(403).json({
				success: false,
				error: 'Not authorized to update this trip',
			});
		}

		// Only requesters can update pending trips, only drivers can update confirmed+ trips
		if (trip.status === 'pending_driver' && !isRequester) {
			return res.status(403).json({
				success: false,
				error: 'Only trip requester can update pending trips',
			});
		}

		if (['confirmed', 'paid', 'in_progress'].includes(trip.status) && !isDriver) {
			return res.status(403).json({
				success: false,
				error: 'Only assigned driver can update confirmed trips',
			});
		}

		// Don't allow updates to completed or cancelled trips
		if (['completed', 'cancelled'].includes(trip.status)) {
			return res.status(400).json({
				success: false,
				error: `Cannot update ${trip.status} trip`,
			});
		}

		trip = await Trip.findByIdAndUpdate(req.params.id, req.body, {
			new: true,
			runValidators: true,
		}).populate({
			path: 'driver',
			select: 'fullName avatar rating vehicle phone',
		});

		// Notify all passengers about the trip update
		if (trip.passengers && trip.passengers.length > 0) {
			const acceptedPassengers = trip.passengers.filter((p) => p.status === 'accepted');

			for (const passenger of acceptedPassengers) {
				await Notification.create({
					recipient: passenger.user,
					title: 'Trip Updated',
					message: `A trip you are joining has been updated by the driver.`,
					type: 'trip_updated',
					relatedId: trip._id,
					relatedModel: 'Trip',
				});
			}
		}

		res.status(200).json({
			success: true,
			data: trip,
		});
	} catch (error) {
		res.status(500).json({
			success: false,
			error: error.message,
		});
	}
};

/**
 * @swagger
 * /trips/{id}:
 *   delete:
 *     summary: Delete a trip
 *     description: Delete a trip (driver only)
 *     tags: [Trips]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Trip ID
 *     responses:
 *       200:
 *         description: Trip deleted successfully
 *       404:
 *         description: Trip not found
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
// @desc    Delete a trip
// @route   DELETE /api/trips/:id
// @access  Private (Driver only)
exports.deleteTrip = async (req, res) => {
	try {
		const trip = await Trip.findById(req.params.id);

		if (!trip) {
			return res.status(404).json({
				success: false,
				error: 'Trip not found',
			});
		}

		// Check if user is authorized (trip requester if pending, or driver if confirmed but not paid)
		const isRequester = trip.requestedBy && trip.requestedBy.toString() === req.user._id.toString();
		const isDriver = trip.driver && trip.driver.toString() === req.user._id.toString();

		if (!isRequester && !isDriver) {
			return res.status(403).json({
				success: false,
				error: 'Not authorized to delete this trip',
			});
		}

		// Deletion rules based on trip status
		if (trip.status === 'pending_driver') {
			// Only requester can delete pending trips
			if (!isRequester) {
				return res.status(403).json({
					success: false,
					error: 'Only trip requester can delete pending trips',
				});
			}
		} else if (trip.status === 'confirmed') {
			// Either requester or driver can delete confirmed but unpaid trips
			// No additional check needed
		} else if (['paid', 'in_progress', 'completed'].includes(trip.status)) {
			// Cannot delete paid or active trips, must cancel instead
			return res.status(400).json({
				success: false,
				error: 'Cannot delete paid trips. Cancel it instead.',
			});
		}

		await trip.remove();

		res.status(200).json({
			success: true,
			data: {},
		});
	} catch (error) {
		res.status(500).json({
			success: false,
			error: error.message,
		});
	}
};

// @desc    Cancel a trip
// @route   PATCH /api/trips/:id/cancel
// @access  Private (Driver only)
exports.cancelTrip = async (req, res) => {
	try {
		const { reason } = req.body;

		const trip = await Trip.findById(req.params.id);

		if (!trip) {
			return res.status(404).json({
				success: false,
				error: 'Trip not found',
			});
		}

		// Check if user is the trip driver
		if (trip.driver.toString() !== req.user._id.toString()) {
			return res.status(403).json({
				success: false,
				error: 'Not authorized to cancel this trip',
			});
		}

		// Can't cancel a completed or already cancelled trip
		if (trip.status === 'completed') {
			return res.status(400).json({
				success: false,
				error: 'Cannot cancel a completed trip',
			});
		}

		if (trip.status === 'cancelled') {
			return res.status(400).json({
				success: false,
				error: 'Trip is already cancelled',
			});
		}

		trip.status = 'cancelled';
		trip.cancellationReason = reason;
		await trip.save();

		// Notify all passengers about the cancellation
		if (trip.passengers && trip.passengers.length > 0) {
			const acceptedPassengers = trip.passengers.filter((p) => p.status === 'accepted');

			for (const passenger of acceptedPassengers) {
				await Notification.create({
					recipient: passenger.user,
					title: 'Trip Cancelled',
					message: `A trip you were planning to join has been cancelled by the driver.`,
					type: 'trip_cancelled',
					relatedId: trip._id,
					relatedModel: 'Trip',
				});
			}
		}

		res.status(200).json({
			success: true,
			data: trip,
		});
	} catch (error) {
		res.status(500).json({
			success: false,
			error: error.message,
		});
	}
};

/**
 * @swagger
 * /trips/{id}/join:
 *   post:
 *     summary: Request to join a trip
 *     description: Request to join a trip as a passenger
 *     tags: [Trips]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Trip ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               seats:
 *                 type: number
 *                 default: 1
 *               pickupLocation:
 *                 type: object
 *               dropoffLocation:
 *                 type: object
 *               note:
 *                 type: string
 *     responses:
 *       200:
 *         description: Join request submitted
 *       400:
 *         description: Trip full or invalid request
 *       404:
 *         description: Trip not found
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
// @desc    Request to join a trip
// @route   POST /api/trips/:id/join
// @access  Private (Passenger)
exports.joinTrip = async (req, res) => {
	try {
		const { pickupLocation, dropoffLocation, note } = req.body;

		const trip = await Trip.findById(req.params.id);

		if (!trip) {
			return res.status(404).json({
				success: false,
				error: 'Trip not found',
			});
		}

		// Check if user is not the driver of this trip
		if (trip.driver.toString() === req.user._id.toString()) {
			return res.status(400).json({
				success: false,
				error: 'You cannot join your own trip',
			});
		}

		// Check if trip is open for joining
		if (trip.status !== 'scheduled') {
			return res.status(400).json({
				success: false,
				error: `Cannot join a trip with status: ${trip.status}`,
			});
		}

		// Check if trip is in the future
		if (new Date(trip.departureTime) < new Date()) {
			return res.status(400).json({
				success: false,
				error: 'Cannot join a past trip',
			});
		}

		// Check if user already requested to join
		const existingRequest = trip.passengers.find((p) => p.user.toString() === req.user._id.toString());

		if (existingRequest) {
			return res.status(400).json({
				success: false,
				error: `You have already requested to join this trip (status: ${existingRequest.status})`,
			});
		}

		// Check if seats are available
		const acceptedPassengers = trip.passengers.filter((p) => p.status === 'accepted').length;
		if (acceptedPassengers >= trip.availableSeats) {
			return res.status(400).json({
				success: false,
				error: 'No seats available on this trip',
			});
		}

		// Add passenger request
		trip.passengers.push({
			user: req.user._id,
			status: 'pending',
			pickupLocation,
			dropoffLocation,
			note,
			requestedAt: new Date(),
		});

		await trip.save();

		// Notify the driver about the join request
		await Notification.create({
			recipient: trip.driver,
			title: 'New Trip Request',
			message: `Someone has requested to join your trip from ${trip.startLocation.address} to ${trip.endLocation.address}.`,
			type: 'trip_request',
			relatedId: trip._id,
			relatedModel: 'Trip',
		});

		res.status(200).json({
			success: true,
			data: {
				message: 'Request to join trip submitted successfully',
				trip,
			},
		});
	} catch (error) {
		res.status(500).json({
			success: false,
			error: error.message,
		});
	}
};

/**
 * @swagger
 * /trips/{id}/join:
 *   delete:
 *     summary: Cancel join request or leave a trip
 *     description: Cancel a previously made request to join a trip
 *     tags: [Trips]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Trip ID
 *     responses:
 *       200:
 *         description: Request cancelled or left trip
 *       404:
 *         description: Trip or request not found
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
// @desc    Cancel join request or leave a trip
// @route   DELETE /api/trips/:id/join
// @access  Private (Passenger)
exports.cancelJoinRequest = async (req, res) => {
	try {
		const trip = await Trip.findById(req.params.id);

		if (!trip) {
			return res.status(404).json({
				success: false,
				error: 'Trip not found',
			});
		}

		// Find passenger request
		const passengerIndex = trip.passengers.findIndex((p) => p.user.toString() === req.user._id.toString());

		if (passengerIndex === -1) {
			return res.status(404).json({
				success: false,
				error: 'You have not requested to join this trip',
			});
		}

		const passenger = trip.passengers[passengerIndex];

		// Can only cancel pending requests or leave accepted trips before departure
		if (!['pending', 'accepted'].includes(passenger.status)) {
			return res.status(400).json({
				success: false,
				error: `Cannot cancel request with status: ${passenger.status}`,
			});
		}

		// Don't allow leaving a trip that's already in progress
		if (passenger.status === 'accepted' && trip.status === 'in_progress') {
			return res.status(400).json({
				success: false,
				error: 'Cannot leave a trip that is already in progress',
			});
		}

		// Update request status to cancelled
		trip.passengers[passengerIndex].status = 'cancelled';
		trip.passengers[passengerIndex].updatedAt = new Date();

		await trip.save();

		// Notify the driver
		await Notification.create({
			recipient: trip.driver,
			title: passenger.status === 'pending' ? 'Join Request Cancelled' : 'Passenger Left Trip',
			message:
				passenger.status === 'pending'
					? `A passenger has cancelled their request to join your trip.`
					: `A passenger has left your trip.`,
			type: 'trip_updated',
			relatedId: trip._id,
			relatedModel: 'Trip',
		});

		res.status(200).json({
			success: true,
			data: {
				message:
					passenger.status === 'pending'
						? 'Join request cancelled successfully'
						: 'You have left the trip successfully',
				trip,
			},
		});
	} catch (error) {
		res.status(500).json({
			success: false,
			error: error.message,
		});
	}
};

/**
 * @swagger
 * /trips/{id}/passengers/{passengerId}:
 *   patch:
 *     summary: Update passenger status
 *     description: Accept or decline a passenger request (driver only)
 *     tags: [Trips]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Trip ID
 *       - in: path
 *         name: passengerId
 *         required: true
 *         schema:
 *           type: string
 *         description: Passenger user ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [accepted, declined]
 *               message:
 *                 type: string
 *                 description: Optional message to passenger
 *     responses:
 *       200:
 *         description: Passenger status updated
 *       404:
 *         description: Trip or passenger not found
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
// @desc    Accept or decline a passenger request
// @route   PATCH /api/trips/:id/passengers/:passengerId
// @access  Private (Driver only)
exports.updatePassengerStatus = async (req, res) => {
	try {
		const { status, message } = req.body;

		const trip = await Trip.findById(req.params.id);

		if (!trip) {
			return res.status(404).json({
				success: false,
				error: 'Trip not found',
			});
		}

		// Check if user is the trip driver
		if (trip.driver.toString() !== req.user._id.toString()) {
			return res.status(403).json({
				success: false,
				error: 'Not authorized to update passenger status',
			});
		}

		// Find passenger request
		const passengerIndex = trip.passengers.findIndex((p) => p.user.toString() === req.params.passengerId);

		if (passengerIndex === -1) {
			return res.status(404).json({
				success: false,
				error: 'Passenger request not found',
			});
		}

		const passenger = trip.passengers[passengerIndex];

		// Check if request is pending
		if (passenger.status !== 'pending') {
			return res.status(400).json({
				success: false,
				error: `Cannot respond to a request with status: ${passenger.status}`,
			});
		}

		// Update passenger status
		passenger.status = status;
		passenger.updatedAt = new Date();
		passenger.responseMessage = message;

		await trip.save();

		// Notify the passenger
		await Notification.create({
			recipient: passenger.user,
			title: status === 'accepted' ? 'Trip Request Accepted' : 'Trip Request Declined',
			message:
				status === 'accepted'
					? `Your request to join a trip has been accepted. ${message ? `Reason: ${message}` : ''}`
					: `Your request to join a trip has been declined. ${message ? `Reason: ${message}` : ''}`,
			type: status === 'accepted' ? 'request_accepted' : 'request_declined',
			relatedId: trip._id,
			relatedModel: 'Trip',
		});

		res.status(200).json({
			success: true,
			data: {
				message: `Passenger request ${status} successfully`,
				trip,
			},
		});
	} catch (error) {
		res.status(500).json({
			success: false,
			error: error.message,
		});
	}
};

/**
 * @swagger
 * /trips/my-trips:
 *   get:
 *     summary: Get trips created by the current user
 *     description: Get trips where the user is the driver
 *     tags: [Trips]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: Filter by trip status
 *       - in: query
 *         name: fromDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter by from date
 *       - in: query
 *         name: toDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter by to date
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
 *         description: List of trips
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
// @desc    Get trips created by the current user (as driver)
// @route   GET /api/trips/my-trips
// @access  Private
exports.getMyTrips = async (req, res) => {
	try {
		// Build query based on filters
		const query = {
			$or: [{ driver: req.user._id }, { 'passengers.user': req.user._id }],
		};

		// Filter by status
		if (req.query.status) {
			query.status = req.query.status;
		}

		// Filter by date range
		if (req.query.fromDate) {
			query.departureTime = { $gte: new Date(req.query.fromDate) };
		}

		if (req.query.toDate) {
			query.departureTime = {
				...query.departureTime,
				$lte: new Date(req.query.toDate),
			};
		}

		// Only get future trips by default
		if (!req.query.includePast && !req.query.fromDate) {
			query.departureTime = { $gte: new Date() };
		}

		// Sort options
		let sort = {};
		if (req.query.sort) {
			switch (req.query.sort) {
				case 'date_asc':
					sort = { departureTime: 1 };
					break;
				case 'date_desc':
					sort = { departureTime: -1 };
					break;
				default:
					sort = { departureTime: 1 };
			}
		} else {
			sort = { departureTime: 1 }; // Default sort by departure time ascending
		}

		// Pagination
		const page = parseInt(req.query.page, 10) || 1;
		const limit = parseInt(req.query.limit, 10) || 10;
		const startIndex = (page - 1) * limit;

		const trips = await Trip.find(query)
			.populate({
				path: 'passengers.user',
				select: 'fullName avatar rating phone',
			})
			.sort(sort)
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
		res.status(500).json({
			success: false,
			error: error.message,
		});
	}
};

/**
 * @swagger
 * /trips/my-joined-trips:
 *   get:
 *     summary: Get trips joined by the current user
 *     description: Get trips where the user is a passenger
 *     tags: [Trips]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: Filter by passenger status
 *       - in: query
 *         name: tripStatus
 *         schema:
 *           type: string
 *         description: Filter by trip status
 *       - in: query
 *         name: fromDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter by from date
 *       - in: query
 *         name: toDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter by to date
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
 *         description: List of joined trips
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
// @desc    Get trips joined by the current user (as passenger)
// @route   GET /api/trips/my-joined-trips
// @access  Private
exports.getMyJoinedTrips = async (req, res) => {
	try {
		// Build query based on filters
		const query = {
			'passengers.user': req.user._id,
		};

		// Filter by status
		if (req.query.status) {
			query.status = req.query.status;
		}

		// Filter by date range
		if (req.query.fromDate) {
			query.departureTime = { $gte: new Date(req.query.fromDate) };
		}

		if (req.query.toDate) {
			query.departureTime = {
				...query.departureTime,
				$lte: new Date(req.query.toDate),
			};
		}

		// Only get future trips by default
		if (!req.query.includePast && !req.query.fromDate) {
			query.departureTime = { $gte: new Date() };
		}

		// Sort options
		let sort = {};
		if (req.query.sort) {
			switch (req.query.sort) {
				case 'date_asc':
					sort = { departureTime: 1 };
					break;
				case 'date_desc':
					sort = { departureTime: -1 };
					break;
				default:
					sort = { departureTime: 1 };
			}
		} else {
			sort = { departureTime: 1 }; // Default sort by departure time ascending
		}

		// Pagination
		const page = parseInt(req.query.page, 10) || 1;
		const limit = parseInt(req.query.limit, 10) || 10;
		const startIndex = (page - 1) * limit;

		const trips = await Trip.find(query)
			.populate({
				path: 'driver',
				select: 'fullName avatar rating phone',
			})
			.sort(sort)
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
		res.status(500).json({
			success: false,
			error: error.message,
		});
	}
};

/**
 * @swagger
 * /trips/{id}/leave:
 *   post:
 *     summary: Leave a trip
 *     description: Leave a trip as a passenger
 *     tags: [Trips]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Trip ID
 *     responses:
 *       200:
 *         description: Successfully left the trip
 *       404:
 *         description: Trip not found or not a passenger
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
// @desc    Leave a trip
// @route   POST /api/trips/:id/leave
// @access  Private
exports.leaveTrip = async (req, res) => {
	try {
		const trip = await Trip.findById(req.params.id);

		if (!trip) {
			return res.status(404).json({
				success: false,
				error: 'Trip not found',
			});
		}

		// Find passenger request
		const passengerIndex = trip.passengers.findIndex((p) => p.user.toString() === req.user._id.toString());

		if (passengerIndex === -1) {
			return res.status(404).json({
				success: false,
				error: 'You have not requested to join this trip',
			});
		}

		const passenger = trip.passengers[passengerIndex];

		// Can only cancel pending requests or leave accepted trips before departure
		if (!['pending', 'accepted'].includes(passenger.status)) {
			return res.status(400).json({
				success: false,
				error: `Cannot cancel request with status: ${passenger.status}`,
			});
		}

		// Don't allow leaving a trip that's already in progress
		if (passenger.status === 'accepted' && trip.status === 'in_progress') {
			return res.status(400).json({
				success: false,
				error: 'Cannot leave a trip that is already in progress',
			});
		}

		// Update request status to cancelled
		trip.passengers[passengerIndex].status = 'cancelled';
		trip.passengers[passengerIndex].updatedAt = new Date();

		await trip.save();

		// Notify the driver
		await Notification.create({
			recipient: trip.driver,
			title: passenger.status === 'pending' ? 'Join Request Cancelled' : 'Passenger Left Trip',
			message:
				passenger.status === 'pending'
					? `A passenger has cancelled their request to join your trip.`
					: `A passenger has left your trip.`,
			type: 'trip_updated',
			relatedId: trip._id,
			relatedModel: 'Trip',
		});

		res.status(200).json({
			success: true,
			data: {
				message:
					passenger.status === 'pending'
						? 'Join request cancelled successfully'
						: 'You have left the trip successfully',
				trip,
			},
		});
	} catch (error) {
		res.status(500).json({
			success: false,
			error: error.message,
		});
	}
};

/**
 * @swagger
 * /trips/{id}/complete:
 *   post:
 *     summary: Mark a trip as completed
 *     description: Mark a trip as completed (driver only)
 *     tags: [Trips]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Trip ID
 *     responses:
 *       200:
 *         description: Trip marked as completed
 *       404:
 *         description: Trip not found
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
// @desc    Complete a trip
// @route   POST /api/trips/:id/complete
// @access  Private (Driver only)
exports.completeTrip = async (req, res) => {
	try {
		const trip = await Trip.findById(req.params.id);

		if (!trip) {
			return res.status(404).json({
				success: false,
				error: 'Trip not found',
			});
		}

		// Check if user is the trip driver
		if (trip.driver.toString() !== req.user._id.toString()) {
			return res.status(403).json({
				success: false,
				error: 'Not authorized to complete this trip',
			});
		}

		// Check if trip is in progress
		if (trip.status !== 'in_progress') {
			return res.status(400).json({
				success: false,
				error: 'Trip must be in progress to complete',
			});
		}

		trip.status = 'completed';
		trip.actualArrivalTime = new Date();
		await trip.save();

		// Notify all passengers about the completion
		if (trip.passengers && trip.passengers.length > 0) {
			const acceptedPassengers = trip.passengers.filter((p) => p.status === 'accepted');

			for (const passenger of acceptedPassengers) {
				await Notification.create({
					recipient: passenger.user,
					title: 'Trip Completed',
					message: 'Your trip has been completed.',
					type: 'trip_completed',
					relatedId: trip._id,
					relatedModel: 'Trip',
				});
			}
		}

		res.status(200).json({
			success: true,
			data: trip,
		});
	} catch (error) {
		res.status(500).json({
			success: false,
			error: error.message,
		});
	}
};

/**
 * @swagger
 * /trips/{id}/status:
 *   patch:
 *     summary: Update trip status
 *     description: Update the status of a trip (driver only)
 *     tags: [Trips]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Trip ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [scheduled, in_progress, completed, cancelled]
 *     responses:
 *       200:
 *         description: Trip status updated
 *       404:
 *         description: Trip not found
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
// @desc    Update trip status
// @route   PATCH /api/trips/:id/status
// @access  Private (Driver only)
exports.updateTripStatus = async (req, res) => {
	try {
		const { status } = req.body;

		if (!status || !['scheduled', 'in_progress', 'completed', 'cancelled'].includes(status)) {
			return res.status(400).json({
				success: false,
				error: 'Please provide a valid status (scheduled, in_progress, completed, cancelled)',
			});
		}

		const trip = await Trip.findById(req.params.id);

		if (!trip) {
			return res.status(404).json({
				success: false,
				error: 'Trip not found',
			});
		}

		// Check if user is the trip driver
		if (trip.driver.toString() !== req.user._id.toString()) {
			return res.status(403).json({
				success: false,
				error: 'Not authorized to update this trip status',
			});
		}

		// Status-specific validations
		if (status === 'in_progress') {
			if (trip.status !== 'scheduled') {
				return res.status(400).json({
					success: false,
					error: 'Only scheduled trips can be started',
				});
			}
			trip.actualDepartureTime = new Date();
		} else if (status === 'completed') {
			if (trip.status !== 'in_progress') {
				return res.status(400).json({
					success: false,
					error: 'Only in-progress trips can be completed',
				});
			}
			trip.actualArrivalTime = new Date();
		} else if (status === 'cancelled') {
			if (['completed', 'cancelled'].includes(trip.status)) {
				return res.status(400).json({
					success: false,
					error: `Cannot cancel a ${trip.status} trip`,
				});
			}
		}

		trip.status = status;
		await trip.save();

		// Notify all passengers about the status change
		if (trip.passengers && trip.passengers.length > 0) {
			const acceptedPassengers = trip.passengers.filter((p) => p.status === 'accepted');

			for (const passenger of acceptedPassengers) {
				await Notification.create({
					recipient: passenger.user,
					title: `Trip ${status.charAt(0).toUpperCase() + status.slice(1)}`,
					message: `Your trip has been updated to ${status} status.`,
					type: `trip_${status}`,
					relatedId: trip._id,
					relatedModel: 'Trip',
				});
			}
		}

		res.status(200).json({
			success: true,
			message: `Trip status updated to ${status}`,
			data: trip,
		});
	} catch (error) {
		console.error('❌ Update trip status error:', error);
		res.status(500).json({
			success: false,
			error: error.message || 'Failed to update trip status',
		});
	}
};

// @desc    Estimate trip price
// @route   POST /api/trips/estimate-price
// @access  Private
exports.estimatePrice = async (req, res) => {
	try {
		const { startLocation, endLocation, departureTime, vehicleType } = req.body;

		// Lấy thông tin về xe từ người dùng
		const user = await User.findById(req.user._id);
		const vehicle = user.vehicle || {};

		// Xác định loại phương tiện từ thông tin xe hoặc từ request
		let finalVehicleType = vehicleType;

		// Nếu không có vehicleType trong request, xác định từ thông tin xe
		if (!finalVehicleType) {
			if (vehicle.brand) {
				// Logic phân loại xe dựa trên thông tin
				if (vehicle.seats <= 2) finalVehicleType = 'motorcycle';
				else if (vehicle.seats > 5) finalVehicleType = 'suv';
				else finalVehicleType = 'car';

				// Logic xác định xe sang dựa vào brand (có thể mở rộng)
				const luxuryBrands = ['mercedes', 'bmw', 'audi', 'lexus'];
				if (luxuryBrands.some((brand) => vehicle.brand.toLowerCase().includes(brand))) {
					finalVehicleType = 'luxury';
				}
			} else {
				finalVehicleType = 'car'; // Mặc định
			}
		}

		// Tính giá
		const priceData = calculatePrice(
			startLocation.coordinates,
			endLocation.coordinates,
			{
				type: finalVehicleType,
				year: vehicle.year || new Date().getFullYear() - 3,
			},
			departureTime
		);

		res.status(200).json({
			success: true,
			data: {
				estimatedPrice: priceData.price,
				currency: 'VND',
				breakdown: priceData.breakdown,
				distance: priceData.breakdown.distanceInKm,
				vehicleType: finalVehicleType,
			},
		});
	} catch (error) {
		console.error('Price estimation error:', error);
		res.status(500).json({
			success: false,
			error: error.message,
		});
	}
};

// @desc    Get available vehicle types for price calculation
// @route   GET /api/trips/vehicle-types
// @access  Public
exports.getVehicleTypes = async (req, res) => {
	try {
		res.status(200).json({
			success: true,
			data: VEHICLE_TYPES,
		});
	} catch (error) {
		console.error('Get vehicle types error:', error);
		res.status(500).json({
			success: false,
			error: error.message,
		});
	}
};

/**
 * @swagger
 * /trips/{id}/driver-request:
 *   post:
 *     summary: Driver request to accept a booking
 *     description: Driver submits a request to accept a passenger's booking with proposed price
 *     tags: [Trips]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Trip/Booking ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [proposedPrice]
 *             properties:
 *               proposedPrice:
 *                 type: number
 *                 minimum: 0
 *                 description: Price proposed by driver (in VND)
 *                 example: 95000
 *               message:
 *                 type: string
 *                 description: Optional message from driver to passenger
 *                 example: "Tôi có thể đón bạn đúng giờ, xe Honda City mới"
 *     responses:
 *       200:
 *         description: Driver request submitted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Driver request submitted successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     tripId:
 *                       type: string
 *                     request:
 *                       type: object
 *                       properties:
 *                         driver:
 *                           type: object
 *                           properties:
 *                             fullName:
 *                               type: string
 *                             vehicle:
 *                               type: object
 *                             rating:
 *                               type: number
 *                         proposedPrice:
 *                           type: number
 *                         message:
 *                           type: string
 *                         status:
 *                           type: string
 *                           example: "pending"
 *       400:
 *         description: Bad request (already requested, price too high, etc.)
 *       403:
 *         description: Not authorized (not a driver or vehicle info incomplete)
 *       404:
 *         description: Booking request not found
 *       500:
 *         description: Server error
 */
// @desc    Driver request to accept a booking
// @route   POST /api/trips/:id/driver-request
// @access  Private (Driver only)
exports.driverRequestBooking = async (req, res) => {
	try {
		const { proposedPrice, message } = req.body;
		const tripId = req.params.id;
		const driverId = req.user._id;

		// Find the trip
		const trip = await Trip.findById(tripId);
		if (!trip) {
			return res.status(404).json({
				success: false,
				error: 'Booking request not found',
			});
		}

		// Check if trip is still pending driver
		if (trip.status !== 'pending_driver') {
			return res.status(400).json({
				success: false,
				error: 'This booking request is no longer available',
			});
		}

		// Check if driver already requested this booking
		const existingRequest = trip.driverRequests.find((req) => req.driver.toString() === driverId.toString());

		if (existingRequest) {
			return res.status(400).json({
				success: false,
				error: 'You have already requested this booking',
			});
		}

		// Check if driver has vehicle info
		const driver = await User.findById(driverId);
		if (!['driver', 'both'].includes(driver.role)) {
			return res.status(403).json({
				success: false,
				error: 'Only registered drivers can request bookings',
			});
		}

		if (!driver.vehicle || !driver.vehicle.licensePlate) {
			return res.status(400).json({
				success: false,
				error: 'Please complete your vehicle information first',
			});
		}

		// Check if proposed price is within passenger's budget
		if (trip.maxPrice && proposedPrice > trip.maxPrice) {
			return res.status(400).json({
				success: false,
				error: `Proposed price exceeds passenger's maximum budget of ${trip.maxPrice} VND`,
			});
		}

		// Add driver request
		trip.driverRequests.push({
			driver: driverId,
			proposedPrice,
			message,
			status: 'pending',
		});

		await trip.save();

		// Populate the new request for response
		await trip.populate('driverRequests.driver', 'fullName avatar rating vehicle');

		// Get the newly added request
		const newRequest = trip.driverRequests[trip.driverRequests.length - 1];

		res.status(200).json({
			success: true,
			message: 'Driver request submitted successfully',
			data: {
				tripId: trip._id.toString(), // ← Convert ObjectId to string
				request: newRequest,
			},
		});
	} catch (error) {
		console.error('Driver request booking error:', error);
		res.status(500).json({
			success: false,
			error: error.message,
		});
	}
};

/**
 * @swagger
 * /trips/{id}/driver-requests/{requestId}:
 *   patch:
 *     summary: Passenger respond to driver request
 *     description: Passenger accepts or declines a driver's request to take their booking
 *     tags: [Trips]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Trip/Booking ID
 *       - in: path
 *         name: requestId
 *         required: true
 *         schema:
 *           type: string
 *         description: Driver request ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [action]
 *             properties:
 *               action:
 *                 type: string
 *                 enum: [accept, decline]
 *                 description: Action to take on the driver request
 *                 example: "accept"
 *     responses:
 *       200:
 *         description: Driver request response processed successfully
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - type: object
 *                   description: Accept response
 *                   properties:
 *                     success:
 *                       type: boolean
 *                       example: true
 *                     message:
 *                       type: string
 *                       example: "Driver request accepted! Please proceed to payment."
 *                     data:
 *                       type: object
 *                       properties:
 *                         trip:
 *                           type: object
 *                           description: Updated trip with confirmed status
 *                         needsPayment:
 *                           type: boolean
 *                           example: true
 *                         acceptedDriver:
 *                           type: object
 *                           description: Driver information
 *                         finalPrice:
 *                           type: number
 *                           example: 95000
 *                 - type: object
 *                   description: Decline response
 *                   properties:
 *                     success:
 *                       type: boolean
 *                       example: true
 *                     message:
 *                       type: string
 *                       example: "Driver request declined"
 *                     data:
 *                       type: object
 *                       description: Updated trip
 *       400:
 *         description: Bad request (invalid action, already responded, etc.)
 *       403:
 *         description: Not authorized (not the trip requester)
 *       404:
 *         description: Trip or driver request not found
 *       500:
 *         description: Server error
 */
// @desc    Passenger accept/decline driver request
// @route   PATCH /api/trips/:id/driver-requests/:requestId
// @access  Private (Trip requester only)
exports.respondToDriverRequest = async (req, res) => {
	try {
		const { action } = req.body; // 'accept' or 'decline'
		const { id: tripId, requestId } = req.params;

		// Find the trip
		const trip = await Trip.findById(tripId).populate('driverRequests.driver', 'fullName vehicle');
		if (!trip) {
			return res.status(404).json({
				success: false,
				error: 'Booking request not found',
			});
		}

		// Check if user is the trip requester
		if (trip.requestedBy.toString() !== req.user._id.toString()) {
			return res.status(403).json({
				success: false,
				error: 'Only the trip requester can respond to driver requests',
			});
		}

		// Check if trip is still pending driver
		if (trip.status !== 'pending_driver') {
			return res.status(400).json({
				success: false,
				error: 'This booking request is no longer pending',
			});
		}

		// Find the driver request
		const driverRequest = trip.driverRequests.id(requestId);
		if (!driverRequest) {
			return res.status(404).json({
				success: false,
				error: 'Driver request not found',
			});
		}

		if (driverRequest.status !== 'pending') {
			return res.status(400).json({
				success: false,
				error: 'This driver request has already been responded to',
			});
		}

		if (action === 'accept') {
			// Accept the driver
			driverRequest.status = 'accepted';
			driverRequest.respondedAt = new Date();

			// Update trip status and assign driver
			trip.status = 'confirmed';
			trip.driver = driverRequest.driver._id;
			trip.price = driverRequest.proposedPrice;
			trip.confirmedAt = new Date();

			// Get driver's vehicle type
			const driver = await User.findById(driverRequest.driver._id);
			if (driver.vehicle) {
				// Determine vehicle type based on vehicle info
				let vehicleType = 'car'; // default
				if (driver.vehicle.seats <= 2) vehicleType = 'motorcycle';
				else if (driver.vehicle.seats > 5) vehicleType = 'suv';

				// Check for luxury brands
				const luxuryBrands = ['mercedes', 'bmw', 'audi', 'lexus'];
				if (
					driver.vehicle.brand &&
					luxuryBrands.some((brand) => driver.vehicle.brand.toLowerCase().includes(brand))
				) {
					vehicleType = 'luxury';
				}

				trip.vehicleTypeUsed = vehicleType;
			}

			// Decline all other pending requests
			trip.driverRequests.forEach((req) => {
				if (req._id.toString() !== requestId && req.status === 'pending') {
					req.status = 'declined';
					req.respondedAt = new Date();
				}
			});

			await trip.save();

			res.status(200).json({
				success: true,
				message: 'Driver request accepted! Please proceed to payment.',
				data: {
					trip,
					needsPayment: true,
					acceptedDriver: driverRequest.driver,
					finalPrice: driverRequest.proposedPrice,
				},
			});
		} else if (action === 'decline') {
			// Decline the driver request
			driverRequest.status = 'declined';
			driverRequest.respondedAt = new Date();

			await trip.save();

			res.status(200).json({
				success: true,
				message: 'Driver request declined',
				data: trip,
			});
		} else {
			return res.status(400).json({
				success: false,
				error: 'Invalid action. Use "accept" or "decline"',
			});
		}
	} catch (error) {
		console.error('Respond to driver request error:', error);
		res.status(500).json({
			success: false,
			error: error.message,
		});
	}
};
