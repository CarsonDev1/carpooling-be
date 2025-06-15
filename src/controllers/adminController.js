const User = require('../models/User');
const Trip = require('../models/Trip');
const Feedback = require('../models/Feedback');
const Rating = require('../models/Rating');
const Notification = require('../models/Notification');

// @desc    Get admin dashboard statistics
// @route   GET /api/admin/stats
// @access  Private (Admin only)
exports.getDashboardStats = async (req, res) => {
	try {
		// Check if user is admin
		if (req.user.role !== 'admin') {
			return res.status(403).json({
				success: false,
				error: 'Only admins can access this resource',
			});
		}

		// User statistics
		const totalUsers = await User.countDocuments();
		const activeUsers = await User.countDocuments({ isActive: true });
		const drivers = await User.countDocuments({ role: { $in: ['driver', 'both'] } });
		const passengers = await User.countDocuments({ role: { $in: ['passenger', 'both'] } });
		const admins = await User.countDocuments({ role: 'admin' });

		// Trip statistics
		const totalTrips = await Trip.countDocuments();
		const scheduledTrips = await Trip.countDocuments({ status: 'scheduled' });
		const inProgressTrips = await Trip.countDocuments({ status: 'in_progress' });
		const completedTrips = await Trip.countDocuments({ status: 'completed' });
		const cancelledTrips = await Trip.countDocuments({ status: 'cancelled' });

		// Calculate total seats offered and occupied
		const tripsWithPassengers = await Trip.aggregate([
			{
				$match: { status: { $in: ['scheduled', 'in_progress', 'completed'] } },
			},
			{
				$project: {
					availableSeats: 1,
					acceptedPassengers: {
						$size: {
							$filter: {
								input: '$passengers',
								as: 'passenger',
								cond: { $eq: ['$$passenger.status', 'accepted'] },
							},
						},
					},
				},
			},
			{
				$group: {
					_id: null,
					totalSeatsOffered: { $sum: '$availableSeats' },
					totalSeatsOccupied: { $sum: '$acceptedPassengers' },
				},
			},
		]);

		const seatsStats =
			tripsWithPassengers.length > 0
				? tripsWithPassengers[0]
				: {
						totalSeatsOffered: 0,
						totalSeatsOccupied: 0,
					};

		// Feedback statistics
		const totalFeedback = await Feedback.countDocuments();
		const pendingFeedback = await Feedback.countDocuments({ status: 'pending' });
		const resolvedFeedback = await Feedback.countDocuments({ status: 'resolved' });

		// Get recent registrations (last 7 days)
		const lastWeek = new Date();
		lastWeek.setDate(lastWeek.getDate() - 7);

		const recentUsers = await User.find({
			createdAt: { $gte: lastWeek },
		})
			.select('fullName phone email createdAt role')
			.sort({ createdAt: -1 })
			.limit(5);

		// Get recent trips (last 7 days)
		const recentTrips = await Trip.find({
			createdAt: { $gte: lastWeek },
		})
			.populate({
				path: 'driver',
				select: 'fullName',
			})
			.select('startLocation endLocation departureTime status createdAt')
			.sort({ createdAt: -1 })
			.limit(5);

		res.status(200).json({
			success: true,
			data: {
				users: {
					total: totalUsers,
					active: activeUsers,
					drivers,
					passengers,
					admins,
				},
				trips: {
					total: totalTrips,
					scheduled: scheduledTrips,
					inProgress: inProgressTrips,
					completed: completedTrips,
					cancelled: cancelledTrips,
					seatsOffered: seatsStats.totalSeatsOffered,
					seatsOccupied: seatsStats.totalSeatsOccupied,
					occupancyRate:
						seatsStats.totalSeatsOffered > 0
							? Math.round((seatsStats.totalSeatsOccupied / seatsStats.totalSeatsOffered) * 100)
							: 0,
				},
				feedback: {
					total: totalFeedback,
					pending: pendingFeedback,
					resolved: resolvedFeedback,
				},
				recent: {
					users: recentUsers,
					trips: recentTrips,
				},
			},
		});
	} catch (error) {
		res.status(500).json({
			success: false,
			error: error.message,
		});
	}
};

// @desc    Get all users (admin)
// @route   GET /api/admin/users
// @access  Private (Admin only)
exports.getAllUsers = async (req, res) => {
	try {
		// Check if user is admin
		if (req.user.role !== 'admin') {
			return res.status(403).json({
				success: false,
				error: 'Only admins can access this resource',
			});
		}

		// Query parameters
		const query = {};

		// Filter by role
		if (req.query.role) {
			query.role = req.query.role;
		}

		// Filter by active status
		if (req.query.isActive !== undefined) {
			query.isActive = req.query.isActive === 'true';
		}

		// Filter by phone, email or name (search)
		if (req.query.search) {
			query.$or = [
				{ fullName: { $regex: req.query.search, $options: 'i' } },
				{ email: { $regex: req.query.search, $options: 'i' } },
				{ phone: { $regex: req.query.search, $options: 'i' } },
			];
		}

		// Pagination
		const page = parseInt(req.query.page, 10) || 1;
		const limit = parseInt(req.query.limit, 10) || 20;
		const startIndex = (page - 1) * limit;

		// Sorting
		let sort = {};
		if (req.query.sort) {
			switch (req.query.sort) {
				case 'name_asc':
					sort = { fullName: 1 };
					break;
				case 'name_desc':
					sort = { fullName: -1 };
					break;
				case 'date_asc':
					sort = { createdAt: 1 };
					break;
				case 'date_desc':
					sort = { createdAt: -1 };
					break;
				default:
					sort = { createdAt: -1 };
			}
		} else {
			sort = { createdAt: -1 };
		}

		const users = await User.find(query)
			.select('fullName phone email role isActive createdAt lastLogin')
			.sort(sort)
			.skip(startIndex)
			.limit(limit);

		const totalUsers = await User.countDocuments(query);

		res.status(200).json({
			success: true,
			count: users.length,
			total: totalUsers,
			pagination: {
				currentPage: page,
				totalPages: Math.ceil(totalUsers / limit),
				limit,
			},
			data: users,
		});
	} catch (error) {
		res.status(500).json({
			success: false,
			error: error.message,
		});
	}
};

// @desc    Get user details (admin)
// @route   GET /api/admin/users/:id
// @access  Private (Admin only)
exports.getUserDetails = async (req, res) => {
	try {
		// Check if user is admin
		if (req.user.role !== 'admin') {
			return res.status(403).json({
				success: false,
				error: 'Only admins can access this resource',
			});
		}

		const user = await User.findById(req.params.id);

		if (!user) {
			return res.status(404).json({
				success: false,
				error: 'User not found',
			});
		}

		// Get user's trip history
		const driverTrips = await Trip.find({ driver: user._id })
			.sort({ departureTime: -1 })
			.limit(5)
			.select('startLocation endLocation departureTime status');

		const passengerTrips = await Trip.find({
			'passengers.user': user._id,
			'passengers.status': 'accepted',
		})
			.sort({ departureTime: -1 })
			.limit(5)
			.populate({
				path: 'driver',
				select: 'fullName',
			})
			.select('startLocation endLocation departureTime status');

		// Get user ratings
		const driverRatings = await Rating.find({
			rated: user._id,
			ratedUserRole: 'driver',
		})
			.sort({ createdAt: -1 })
			.limit(5)
			.populate({
				path: 'rater',
				select: 'fullName avatar',
			});

		const passengerRatings = await Rating.find({
			rated: user._id,
			ratedUserRole: 'passenger',
		})
			.sort({ createdAt: -1 })
			.limit(5)
			.populate({
				path: 'rater',
				select: 'fullName avatar',
			});

		res.status(200).json({
			success: true,
			data: {
				user,
				trips: {
					asDriver: driverTrips,
					asPassenger: passengerTrips,
				},
				ratings: {
					asDriver: driverRatings,
					asPassenger: passengerRatings,
				},
			},
		});
	} catch (error) {
		res.status(500).json({
			success: false,
			error: error.message,
		});
	}
};

// @desc    Update user status (active/inactive)
// @route   PATCH /api/admin/users/:id/status
// @access  Private (Admin only)
exports.updateUserStatus = async (req, res) => {
	try {
		// Check if user is admin
		if (req.user.role !== 'admin') {
			return res.status(403).json({
				success: false,
				error: 'Only admins can access this resource',
			});
		}

		const { isActive } = req.body;

		if (isActive === undefined) {
			return res.status(400).json({
				success: false,
				error: 'isActive field is required',
			});
		}

		const user = await User.findById(req.params.id);

		if (!user) {
			return res.status(404).json({
				success: false,
				error: 'User not found',
			});
		}

		// Don't allow deactivating self
		if (user._id.toString() === req.user._id.toString()) {
			return res.status(400).json({
				success: false,
				error: 'You cannot deactivate your own account',
			});
		}

		user.isActive = isActive;
		await user.save();

		// Notify the user about account status change
		await Notification.create({
			recipient: user._id,
			title: isActive ? 'Account Activated' : 'Account Deactivated',
			message: isActive
				? 'Your account has been activated by an administrator.'
				: 'Your account has been deactivated by an administrator. Please contact support for assistance.',
			type: 'system',
		});

		res.status(200).json({
			success: true,
			data: {
				user: {
					_id: user._id,
					fullName: user.fullName,
					isActive: user.isActive,
				},
			},
		});
	} catch (error) {
		res.status(500).json({
			success: false,
			error: error.message,
		});
	}
};

// @desc    Update user role
// @route   PATCH /api/admin/users/:id/role
// @access  Private (Admin only)
exports.updateUserRole = async (req, res) => {
	try {
		// Check if user is admin
		if (req.user.role !== 'admin') {
			return res.status(403).json({
				success: false,
				error: 'Only admins can access this resource',
			});
		}

		const { role } = req.body;

		if (!role || !['driver', 'passenger', 'both', 'admin'].includes(role)) {
			return res.status(400).json({
				success: false,
				error: 'Valid role is required (driver, passenger, both, or admin)',
			});
		}

		const user = await User.findById(req.params.id);

		if (!user) {
			return res.status(404).json({
				success: false,
				error: 'User not found',
			});
		}

		// Don't allow changing own role
		if (user._id.toString() === req.user._id.toString()) {
			return res.status(400).json({
				success: false,
				error: 'You cannot change your own role',
			});
		}

		user.role = role;
		await user.save();

		// Notify the user about role change
		await Notification.create({
			recipient: user._id,
			title: 'Account Role Updated',
			message: `Your account role has been updated to ${role}.`,
			type: 'system',
		});

		res.status(200).json({
			success: true,
			data: {
				user: {
					_id: user._id,
					fullName: user.fullName,
					role: user.role,
				},
			},
		});
	} catch (error) {
		res.status(500).json({
			success: false,
			error: error.message,
		});
	}
};

// @desc    Get all trips (admin)
// @route   GET /api/admin/trips
// @access  Private (Admin only)
exports.getAllTrips = async (req, res) => {
	try {
		// Check if user is admin
		if (req.user.role !== 'admin') {
			return res.status(403).json({
				success: false,
				error: 'Only admins can access this resource',
			});
		}

		// Query parameters
		const query = {};

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

		// Filter by driver
		if (req.query.driverId) {
			query.driver = req.query.driverId;
		}

		// Pagination
		const page = parseInt(req.query.page, 10) || 1;
		const limit = parseInt(req.query.limit, 10) || 20;
		const startIndex = (page - 1) * limit;

		// Sorting
		let sort = {};
		if (req.query.sort) {
			switch (req.query.sort) {
				case 'date_asc':
					sort = { departureTime: 1 };
					break;
				case 'date_desc':
					sort = { departureTime: -1 };
					break;
				case 'created_asc':
					sort = { createdAt: 1 };
					break;
				case 'created_desc':
					sort = { createdAt: -1 };
					break;
				default:
					sort = { departureTime: 1 };
			}
		} else {
			sort = { departureTime: 1 };
		}

		const trips = await Trip.find(query)
			.populate({
				path: 'driver',
				select: 'fullName phone',
			})
			.select('startLocation endLocation departureTime status availableSeats passengers createdAt')
			.sort(sort)
			.skip(startIndex)
			.limit(limit);

		const totalTrips = await Trip.countDocuments(query);

		// Format the response to include passenger count
		const formattedTrips = trips.map((trip) => {
			const tripObj = trip.toObject();

			// Count accepted passengers
			const acceptedPassengerCount = tripObj.passengers.filter((p) => p.status === 'accepted').length;

			tripObj.passengerCount = acceptedPassengerCount;

			// Don't send full passenger details in list view
			delete tripObj.passengers;

			return tripObj;
		});

		res.status(200).json({
			success: true,
			count: formattedTrips.length,
			total: totalTrips,
			pagination: {
				currentPage: page,
				totalPages: Math.ceil(totalTrips / limit),
				limit,
			},
			data: formattedTrips,
		});
	} catch (error) {
		res.status(500).json({
			success: false,
			error: error.message,
		});
	}
};

// @desc    Get trip details (admin)
// @route   GET /api/admin/trips/:id
// @access  Private (Admin only)
exports.getTripDetails = async (req, res) => {
	try {
		// Check if user is admin
		if (req.user.role !== 'admin') {
			return res.status(403).json({
				success: false,
				error: 'Only admins can access this resource',
			});
		}

		const trip = await Trip.findById(req.params.id)
			.populate({
				path: 'driver',
				select: 'fullName phone email avatar vehicle',
			})
			.populate({
				path: 'passengers.user',
				select: 'fullName phone email avatar',
			});

		if (!trip) {
			return res.status(404).json({
				success: false,
				error: 'Trip not found',
			});
		}

		// Get ratings for this trip
		const ratings = await Rating.find({ trip: req.params.id })
			.populate({
				path: 'rater',
				select: 'fullName avatar',
			})
			.populate({
				path: 'rated',
				select: 'fullName avatar',
			});

		res.status(200).json({
			success: true,
			data: {
				trip,
				ratings,
			},
		});
	} catch (error) {
		res.status(500).json({
			success: false,
			error: error.message,
		});
	}
};

// @desc    Cancel trip (admin)
// @route   PATCH /api/admin/trips/:id/cancel
// @access  Private (Admin only)
exports.cancelTrip = async (req, res) => {
	try {
		// Check if user is admin
		if (req.user.role !== 'admin') {
			return res.status(403).json({
				success: false,
				error: 'Only admins can access this resource',
			});
		}

		const { reason } = req.body;

		if (!reason) {
			return res.status(400).json({
				success: false,
				error: 'Cancellation reason is required',
			});
		}

		const trip = await Trip.findById(req.params.id);

		if (!trip) {
			return res.status(404).json({
				success: false,
				error: 'Trip not found',
			});
		}

		if (trip.status === 'cancelled') {
			return res.status(400).json({
				success: false,
				error: 'Trip is already cancelled',
			});
		}

		if (trip.status === 'completed') {
			return res.status(400).json({
				success: false,
				error: 'Cannot cancel a completed trip',
			});
		}

		// Update trip status
		trip.status = 'cancelled';
		trip.cancellationReason = `[ADMIN] ${reason}`;
		await trip.save();

		// Notify the driver
		await Notification.create({
			recipient: trip.driver,
			title: 'Trip Cancelled by Admin',
			message: `Your trip has been cancelled by an administrator. Reason: ${reason}`,
			type: 'trip_cancelled',
			relatedId: trip._id,
			relatedModel: 'Trip',
		});

		// Notify all accepted passengers
		const acceptedPassengers = trip.passengers.filter((p) => p.status === 'accepted');
		for (const passenger of acceptedPassengers) {
			await Notification.create({
				recipient: passenger.user,
				title: 'Trip Cancelled by Admin',
				message: `A trip you were planning to join has been cancelled by an administrator. Reason: ${reason}`,
				type: 'trip_cancelled',
				relatedId: trip._id,
				relatedModel: 'Trip',
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
