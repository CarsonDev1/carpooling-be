const Trip = require('../models/Trip');
const User = require('../models/User');
const Notification = require('../models/Notification');
const mongoose = require('mongoose');

/**
 * @swagger
 * /trips:
 *   post:
 *     summary: Create a new trip
 *     description: Create a new trip as a driver
 *     tags: [Trips]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [startLocation, endLocation, departureTime, availableSeats]
 *             properties:
 *               startLocation:
 *                 type: object
 *                 properties:
 *                   address:
 *                     type: string
 *                   coordinates:
 *                     type: array
 *                     items:
 *                       type: number
 *               endLocation:
 *                 type: object
 *                 properties:
 *                   address:
 *                     type: string
 *                   coordinates:
 *                     type: array
 *                     items:
 *                       type: number
 *               departureTime:
 *                 type: string
 *                 format: date-time
 *               estimatedArrivalTime:
 *                 type: string
 *                 format: date-time
 *               availableSeats:
 *                 type: number
 *               price:
 *                 type: number
 *               currency:
 *                 type: string
 *                 default: VND
 *               notes:
 *                 type: string
 *               stops:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     address:
 *                       type: string
 *                     coordinates:
 *                       type: array
 *                       items:
 *                         type: number
 *               recurring:
 *                 type: object
 *                 properties:
 *                   isRecurring:
 *                     type: boolean
 *                   days:
 *                     type: array
 *                     items:
 *                       type: string
 *                       enum: [monday, tuesday, wednesday, thursday, friday, saturday, sunday]
 *     responses:
 *       201:
 *         description: Trip created successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
// @desc    Create a new trip
// @route   POST /api/trips
// @access  Private (Driver)
exports.createTrip = async (req, res) => {
	try {
		const {
			startLocation,
			endLocation,
			departureTime,
			availableSeats,
			notes,
			stops,
			price,
			currency,
			recurring,
			estimatedArrivalTime,
		} = req.body;

		// Create trip with driver as current user
		const trip = await Trip.create({
			driver: req.user._id,
			startLocation,
			endLocation,
			departureTime,
			availableSeats,
			notes,
			stops: stops || [],
			price: price || 0,
			currency: currency || 'VND',
			recurring: recurring || { isRecurring: false },
			estimatedArrivalTime,
		});

		res.status(201).json({
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
 * /trips:
 *   get:
 *     summary: Get all trips
 *     description: Get all trips with filtering options
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
// @desc    Get all trips
// @route   GET /api/trips
// @access  Private
exports.getTrips = async (req, res) => {
	try {
		// Build query based on filters
		const query = {};

		// Filter by status
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

		// Only get future trips by default
		if (!req.query.includePast) {
			finalQuery.departureTime = { $gte: new Date() };
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
				path: 'driver',
				select: 'fullName avatar rating phone',
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
				path: 'driver',
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

		// Check if user is the trip driver
		if (trip.driver.toString() !== req.user._id.toString()) {
			return res.status(403).json({
				success: false,
				error: 'Not authorized to update this trip',
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

		// Check if user is the trip driver
		if (trip.driver.toString() !== req.user._id.toString()) {
			return res.status(403).json({
				success: false,
				error: 'Not authorized to delete this trip',
			});
		}

		// Only allow deletion if no passengers have been accepted
		const hasAcceptedPassengers = trip.passengers.some((p) => p.status === 'accepted');

		if (hasAcceptedPassengers) {
			return res.status(400).json({
				success: false,
				error: 'Cannot delete trip with accepted passengers. Cancel it instead.',
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
