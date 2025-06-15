const Rating = require('../models/Rating');
const Trip = require('../models/Trip');
const User = require('../models/User');
const Notification = require('../models/Notification');

/**
 * @swagger
 * components:
 *   schemas:
 *     Rating:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         rater:
 *           type: string
 *           description: User who gave the rating
 *         recipient:
 *           type: string
 *           description: User who received the rating
 *         trip:
 *           type: string
 *           description: Trip ID related to this rating
 *         score:
 *           type: number
 *           minimum: 1
 *           maximum: 5
 *           description: Rating score (1-5)
 *         comment:
 *           type: string
 *           description: Rating comment (optional)
 *         createdAt:
 *           type: string
 *           format: date-time
 *       required:
 *         - rater
 *         - recipient
 *         - trip
 *         - score
 */

/**
 * @swagger
 * /ratings:
 *   post:
 *     summary: Create a new rating
 *     description: Rate another user after completing a trip together
 *     tags: [Ratings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - recipientId
 *               - tripId
 *               - score
 *             properties:
 *               recipientId:
 *                 type: string
 *                 description: User ID of the person being rated
 *               tripId:
 *                 type: string
 *                 description: ID of the completed trip
 *               score:
 *                 type: number
 *                 minimum: 1
 *                 maximum: 5
 *                 description: Rating score (1-5)
 *               comment:
 *                 type: string
 *                 description: Optional comment with the rating
 *     responses:
 *       201:
 *         description: Rating created successfully
 *       400:
 *         description: Invalid rating data
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: User or trip not found
 *       409:
 *         description: You have already rated this user for this trip
 */
// @desc    Create a rating for a user after a trip
// @route   POST /api/ratings
// @access  Private
exports.createRating = async (req, res) => {
	try {
		const { tripId, ratedUserId, rating, comment, ratedUserRole } = req.body;

		// Check if all required fields are provided
		if (!tripId || !ratedUserId || !rating || !ratedUserRole) {
			return res.status(400).json({
				success: false,
				error: 'Please provide tripId, ratedUserId, rating, and ratedUserRole',
			});
		}

		// Validate rating value
		if (rating < 1 || rating > 5) {
			return res.status(400).json({
				success: false,
				error: 'Rating must be between 1 and 5',
			});
		}

		// Find the trip
		const trip = await Trip.findById(tripId);
		if (!trip) {
			return res.status(404).json({
				success: false,
				error: 'Trip not found',
			});
		}

		// Check if trip is completed
		if (trip.status !== 'completed') {
			return res.status(400).json({
				success: false,
				error: 'Can only rate users for completed trips',
			});
		}

		// Check if user was part of the trip
		const userId = req.user._id;
		const isDriver = trip.driver.toString() === userId.toString();
		const isPassenger = trip.passengers.some(
			(p) => p.user.toString() === userId.toString() && p.status === 'accepted'
		);

		if (!isDriver && !isPassenger) {
			return res.status(403).json({
				success: false,
				error: 'You were not part of this trip',
			});
		}

		// Validate ratedUserId based on role
		if (ratedUserRole === 'driver') {
			if (trip.driver.toString() !== ratedUserId) {
				return res.status(400).json({
					success: false,
					error: 'The rated user was not the driver of this trip',
				});
			}
			// Check if the rater is a passenger
			if (!isPassenger) {
				return res.status(400).json({
					success: false,
					error: 'Only passengers can rate the driver',
				});
			}
		} else if (ratedUserRole === 'passenger') {
			// Check if the rated user was an accepted passenger
			const isRatedUserPassenger = trip.passengers.some(
				(p) => p.user.toString() === ratedUserId && p.status === 'accepted'
			);
			if (!isRatedUserPassenger) {
				return res.status(400).json({
					success: false,
					error: 'The rated user was not a passenger of this trip',
				});
			}
			// Check if the rater is the driver
			if (!isDriver) {
				return res.status(400).json({
					success: false,
					error: 'Only the driver can rate passengers',
				});
			}
		} else {
			return res.status(400).json({
				success: false,
				error: 'ratedUserRole must be either driver or passenger',
			});
		}

		// Check if the user has already rated this person for this trip
		const existingRating = await Rating.findOne({
			trip: tripId,
			rater: userId,
			rated: ratedUserId,
		});

		if (existingRating) {
			return res.status(400).json({
				success: false,
				error: 'You have already rated this user for this trip',
			});
		}

		// Create the rating
		const newRating = await Rating.create({
			trip: tripId,
			rater: userId,
			rated: ratedUserId,
			rating,
			comment,
			ratedUserRole,
		});

		// Notify the rated user
		await Notification.create({
			recipient: ratedUserId,
			title: 'New Rating',
			message: `Someone has rated you ${rating} stars for a recent trip.`,
			type: 'new_rating',
			relatedId: newRating._id,
			relatedModel: 'Rating',
		});

		res.status(201).json({
			success: true,
			data: newRating,
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
 * /ratings/received:
 *   get:
 *     summary: Get all ratings received by the current user
 *     description: Get all ratings given to the current user
 *     tags: [Ratings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Number of items per page
 *     responses:
 *       200:
 *         description: List of received ratings
 *       401:
 *         description: Unauthorized
 */
// @desc    Get all ratings received by the current user
// @route   GET /api/ratings/received
// @access  Private
exports.getMyReceivedRatings = async (req, res) => {
	try {
		const userId = req.user._id;

		// Get ratings received by the user
		const receivedRatings = await Rating.find({ rated: userId })
			.populate({
				path: 'rater',
				select: 'fullName avatar',
			})
			.populate({
				path: 'trip',
				select: 'startLocation endLocation departureTime status',
			})
			.sort({ createdAt: -1 });

		// Get ratings given by the user
		const givenRatings = await Rating.find({ rater: userId })
			.populate({
				path: 'rated',
				select: 'fullName avatar',
			})
			.populate({
				path: 'trip',
				select: 'startLocation endLocation departureTime status',
			})
			.sort({ createdAt: -1 });

		// Calculate average ratings received
		const driverRatings = receivedRatings.filter((r) => r.ratedUserRole === 'driver');
		const passengerRatings = receivedRatings.filter((r) => r.ratedUserRole === 'passenger');

		const avgDriverRating =
			driverRatings.length > 0
				? driverRatings.reduce((acc, curr) => acc + curr.rating, 0) / driverRatings.length
				: 0;

		const avgPassengerRating =
			passengerRatings.length > 0
				? passengerRatings.reduce((acc, curr) => acc + curr.rating, 0) / passengerRatings.length
				: 0;

		res.status(200).json({
			success: true,
			received: {
				count: receivedRatings.length,
				stats: {
					avgDriverRating: Math.round(avgDriverRating * 10) / 10,
					driverRatingCount: driverRatings.length,
					avgPassengerRating: Math.round(avgPassengerRating * 10) / 10,
					passengerRatingCount: passengerRatings.length,
				},
				data: receivedRatings,
			},
			given: {
				count: givenRatings.length,
				data: givenRatings,
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
 * /ratings/given:
 *   get:
 *     summary: Get all ratings given by the current user
 *     description: Get all ratings submitted by the current user
 *     tags: [Ratings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Number of items per page
 *     responses:
 *       200:
 *         description: List of given ratings
 *       401:
 *         description: Unauthorized
 */
// @desc    Get all ratings given by the current user
// @route   GET /api/ratings/given
// @access  Private
exports.getMyGivenRatings = async (req, res) => {
	try {
		const userId = req.user._id;

		// Get ratings given by the user
		const givenRatings = await Rating.find({ rater: userId })
			.populate({
				path: 'rated',
				select: 'fullName avatar',
			})
			.populate({
				path: 'trip',
				select: 'startLocation endLocation departureTime status',
			})
			.sort({ createdAt: -1 });

		res.status(200).json({
			success: true,
			count: givenRatings.length,
			data: givenRatings,
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
 * /ratings/user/{userId}:
 *   get:
 *     summary: Get ratings for a specific user
 *     description: Get all ratings received by a specific user
 *     tags: [Ratings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Number of items per page
 *     responses:
 *       200:
 *         description: List of user ratings
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: User not found
 */
// @desc    Get ratings for a specific user
// @route   GET /api/ratings/user/:userId
// @access  Private
exports.getUserRatings = async (req, res) => {
	try {
		const userId = req.params.userId;

		// Check if user exists
		const user = await User.findById(userId);
		if (!user) {
			return res.status(404).json({
				success: false,
				error: 'User not found',
			});
		}

		// Get all ratings received by the user
		const ratings = await Rating.find({ rated: userId })
			.populate({
				path: 'rater',
				select: 'fullName avatar',
			})
			.populate({
				path: 'trip',
				select: 'startLocation endLocation departureTime status',
			})
			.sort({ createdAt: -1 });

		// Calculate average ratings
		const driverRatings = ratings.filter((r) => r.ratedUserRole === 'driver');
		const passengerRatings = ratings.filter((r) => r.ratedUserRole === 'passenger');

		const avgDriverRating =
			driverRatings.length > 0
				? driverRatings.reduce((acc, curr) => acc + curr.rating, 0) / driverRatings.length
				: 0;

		const avgPassengerRating =
			passengerRatings.length > 0
				? passengerRatings.reduce((acc, curr) => acc + curr.rating, 0) / passengerRatings.length
				: 0;

		res.status(200).json({
			success: true,
			count: ratings.length,
			stats: {
				avgDriverRating: Math.round(avgDriverRating * 10) / 10,
				driverRatingCount: driverRatings.length,
				avgPassengerRating: Math.round(avgPassengerRating * 10) / 10,
				passengerRatingCount: passengerRatings.length,
			},
			data: ratings,
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
 * /ratings/pending:
 *   get:
 *     summary: Get pending ratings
 *     description: Get trips that the current user can rate but hasn't yet
 *     tags: [Ratings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of trips and users that can be rated
 *       401:
 *         description: Unauthorized
 */
// @desc    Get pending ratings (people the user can rate)
// @route   GET /api/ratings/pending
// @access  Private
exports.getPendingRatings = async (req, res) => {
	try {
		const userId = req.user._id;

		// Get all trips
		const trips = await Trip.find();

		// Filter trips that the user can rate
		const pendingRatings = trips.filter((trip) => {
			// Check if user was part of the trip
			const isDriver = trip.driver.toString() === userId.toString();
			const isPassenger = trip.passengers.some(
				(p) => p.user.toString() === userId.toString() && p.status === 'accepted'
			);

			return !isDriver && !isPassenger;
		});

		res.status(200).json({
			success: true,
			count: pendingRatings.length,
			data: pendingRatings,
		});
	} catch (error) {
		res.status(500).json({
			success: false,
			error: error.message,
		});
	}
};
