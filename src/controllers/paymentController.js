const Payment = require('../models/Payment');
const Trip = require('../models/Trip');
const User = require('../models/User');
const { VNPayHelper, vnpayConfig } = require('../config/vnpay');

/**
 * @swagger
 * /payments/create:
 *   post:
 *     summary: Create payment for trip
 *     description: Create a payment request for joining a trip
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [tripId]
 *             properties:
 *               tripId:
 *                 type: string
 *                 description: ID of the trip to pay for
 *               returnUrl:
 *                 type: string
 *                 description: URL to return after payment
 *               cancelUrl:
 *                 type: string
 *                 description: URL to redirect if payment is cancelled
 *     responses:
 *       200:
 *         description: Payment URL created successfully
 *       404:
 *         description: Trip not found
 *       400:
 *         description: Invalid request
 *       500:
 *         description: Server error
 */
// @desc    Create payment for trip
// @route   POST /api/payments/create
// @access  Private
exports.createPayment = async (req, res) => {
	try {
		const { tripId, returnUrl, cancelUrl } = req.body;
		const userId = req.user._id;

		// Tìm trip
		const trip = await Trip.findById(tripId).populate('driver', 'fullName');
		if (!trip) {
			return res.status(404).json({
				success: false,
				error: 'Trip not found',
			});
		}

		// Kiểm tra user không phải là driver của trip này
		if (trip.driver._id.toString() === userId.toString()) {
			return res.status(400).json({
				success: false,
				error: 'Driver cannot pay for their own trip',
			});
		}

		// Kiểm tra user chưa thanh toán cho trip này
		const existingPayment = await Payment.findOne({
			user: userId,
			trip: tripId,
			status: { $in: ['pending', 'completed'] },
		});

		if (existingPayment) {
			if (existingPayment.status === 'completed') {
				return res.status(400).json({
					success: false,
					error: 'You have already paid for this trip',
				});
			}
			if (existingPayment.status === 'pending' && !existingPayment.isExpired) {
				return res.status(400).json({
					success: false,
					error: 'You have a pending payment for this trip',
				});
			}
		}

		// Kiểm tra trip còn chỗ không
		const acceptedPassengers = trip.passengers.filter((p) => p.status === 'accepted').length;
		if (acceptedPassengers >= trip.availableSeats) {
			return res.status(400).json({
				success: false,
				error: 'Trip is full',
			});
		}

		// Tạo payment record
		const txnRef = VNPayHelper.generateTxnRef();
		const amount = trip.price;
		const orderInfo = `Thanh toan chuyen di ${trip.startLocation.address} den ${trip.endLocation.address}`;

		const payment = await Payment.create({
			user: userId,
			trip: tripId,
			amount,
			vnpTxnRef: txnRef,
			vnpOrderInfo: orderInfo,
			returnUrl,
			cancelUrl,
			status: 'pending',
		});

		// Tạo VNPay payment URL
		const paymentUrl = VNPayHelper.createPaymentUrl({
			amount,
			orderInfo,
			txnRef,
			returnUrl: returnUrl || `${req.protocol}://${req.get('host')}/api/payments/vnpay/return`,
			ipAddr: req.ip || req.connection.remoteAddress || '127.0.0.1',
		});

		res.status(200).json({
			success: true,
			message: 'Payment URL created successfully',
			data: {
				paymentId: payment._id,
				paymentUrl,
				amount: payment.formattedAmount,
				tripInfo: {
					from: trip.startLocation.address,
					to: trip.endLocation.address,
					departureTime: trip.departureTime,
					driver: trip.driver.fullName,
				},
				expiresAt: payment.expiredAt,
			},
		});
	} catch (error) {
		console.error('Create payment error:', error);
		res.status(500).json({
			success: false,
			error: error.message,
		});
	}
};

/**
 * @swagger
 * /payments/vnpay/return:
 *   get:
 *     summary: VNPay return URL handler
 *     description: Handle VNPay return after payment
 *     tags: [Payments]
 *     parameters:
 *       - in: query
 *         name: vnp_TxnRef
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: vnp_ResponseCode
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Payment processed
 *       400:
 *         description: Invalid payment data
 *       500:
 *         description: Server error
 */
// @desc    Handle VNPay return
// @route   GET /api/payments/vnpay/return
// @access  Public
exports.vnpayReturn = async (req, res) => {
	try {
		console.log('VNPay return params:', req.query);

		// Verify và parse VNPay response
		const vnpayData = VNPayHelper.verifyReturnData(req.query);

		if (!vnpayData.isValid) {
			// Redirect về frontend với lỗi signature
			const redirectUrl = new URL(vnpayConfig.vnp_FrontendReturnUrl);
			redirectUrl.searchParams.append('status', 'error');
			redirectUrl.searchParams.append('message', 'Invalid VNPay response signature');
			return res.redirect(redirectUrl.toString());
		}

		// Tìm payment record
		const payment = await Payment.findOne({ vnpTxnRef: vnpayData.txnRef })
			.populate('trip')
			.populate('user', 'fullName phone');

		if (!payment) {
			// Redirect về frontend với lỗi payment not found
			const redirectUrl = new URL(vnpayConfig.vnp_FrontendReturnUrl);
			redirectUrl.searchParams.append('status', 'error');
			redirectUrl.searchParams.append('message', 'Payment not found');
			return res.redirect(redirectUrl.toString());
		}

		// Kiểm tra trạng thái giao dịch
		if (VNPayHelper.isSuccessTransaction(vnpayData.responseCode, vnpayData.transactionStatus)) {
			// Payment thành công
			await payment.markAsCompleted(vnpayData.rawData);

			// Tự động thêm user vào trip như một passenger được accept
			const trip = payment.trip;
			const existingPassenger = trip.passengers.find((p) => p.user.toString() === payment.user._id.toString());

			if (!existingPassenger) {
				trip.passengers.push({
					user: payment.user._id,
					status: 'accepted', // Tự động accept sau khi thanh toán thành công
					paymentStatus: 'completed',
					paymentId: payment._id,
					requestedAt: new Date(),
					updatedAt: new Date(),
				});
				await trip.save();
			} else {
				// Cập nhật payment status cho passenger đã tồn tại
				existingPassenger.status = 'accepted';
				existingPassenger.paymentStatus = 'completed';
				existingPassenger.paymentId = payment._id;
				existingPassenger.updatedAt = new Date();
				await trip.save();
			}

			// Redirect về frontend với thông tin thành công
			const redirectUrl = new URL(vnpayConfig.vnp_FrontendReturnUrl);
			redirectUrl.searchParams.append('status', 'success');
			redirectUrl.searchParams.append('paymentId', payment._id.toString());
			redirectUrl.searchParams.append('amount', payment.amount.toString());
			redirectUrl.searchParams.append('transactionNo', vnpayData.transactionNo || '');
			redirectUrl.searchParams.append('tripId', trip._id.toString());
			redirectUrl.searchParams.append('message', 'Payment completed successfully');

			res.redirect(redirectUrl.toString());
		} else {
			// Payment thất bại
			const errorMessage = VNPayHelper.getStatusMessage(vnpayData.responseCode);
			await payment.markAsFailed(vnpayData.rawData, errorMessage);

			// Redirect về frontend với thông tin lỗi
			const redirectUrl = new URL(vnpayConfig.vnp_FrontendReturnUrl);
			redirectUrl.searchParams.append('status', 'failed');
			redirectUrl.searchParams.append('paymentId', payment._id.toString());
			redirectUrl.searchParams.append('responseCode', vnpayData.responseCode);
			redirectUrl.searchParams.append('message', errorMessage);

			res.redirect(redirectUrl.toString());
		}
	} catch (error) {
		console.error('VNPay return error:', error);

		// Redirect về frontend với lỗi server
		const redirectUrl = new URL(vnpayConfig.vnp_FrontendReturnUrl);
		redirectUrl.searchParams.append('status', 'error');
		redirectUrl.searchParams.append('message', 'Server error occurred');
		res.redirect(redirectUrl.toString());
	}
};

/**
 * @swagger
 * /payments/{id}:
 *   get:
 *     summary: Get payment details
 *     description: Get payment details by ID
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Payment details
 *       404:
 *         description: Payment not found
 *       500:
 *         description: Server error
 */
// @desc    Get payment details
// @route   GET /api/payments/:id
// @access  Private
exports.getPayment = async (req, res) => {
	try {
		const payment = await Payment.findById(req.params.id)
			.populate('trip', 'startLocation endLocation departureTime driver')
			.populate('user', 'fullName phone');

		if (!payment) {
			return res.status(404).json({
				success: false,
				error: 'Payment not found',
			});
		}

		// Kiểm tra quyền truy cập (chỉ user thanh toán hoặc driver của trip)
		if (
			payment.user._id.toString() !== req.user._id.toString() &&
			payment.trip.driver.toString() !== req.user._id.toString()
		) {
			return res.status(403).json({
				success: false,
				error: 'Access denied',
			});
		}

		res.status(200).json({
			success: true,
			data: payment,
		});
	} catch (error) {
		console.error('Get payment error:', error);
		res.status(500).json({
			success: false,
			error: error.message,
		});
	}
};

/**
 * @swagger
 * /payments:
 *   get:
 *     summary: Get user's payment history
 *     description: Get payment history for the authenticated user
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, completed, failed, cancelled]
 *         description: Filter by payment status
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
 *         description: Payment history
 *       500:
 *         description: Server error
 */
// @desc    Get user's payment history
// @route   GET /api/payments
// @access  Private
exports.getPaymentHistory = async (req, res) => {
	try {
		const query = { user: req.user._id };

		// Filter by status if provided
		if (req.query.status) {
			query.status = req.query.status;
		}

		// Pagination
		const page = parseInt(req.query.page, 10) || 1;
		const limit = parseInt(req.query.limit, 10) || 10;
		const startIndex = (page - 1) * limit;

		const payments = await Payment.find(query)
			.populate('trip', 'startLocation endLocation departureTime driver')
			.sort({ createdAt: -1 })
			.skip(startIndex)
			.limit(limit);

		const totalPayments = await Payment.countDocuments(query);

		res.status(200).json({
			success: true,
			count: payments.length,
			total: totalPayments,
			pagination: {
				currentPage: page,
				totalPages: Math.ceil(totalPayments / limit),
				limit,
			},
			data: payments,
		});
	} catch (error) {
		console.error('Get payment history error:', error);
		res.status(500).json({
			success: false,
			error: error.message,
		});
	}
};

/**
 * @swagger
 * /payments/{id}/cancel:
 *   patch:
 *     summary: Cancel pending payment
 *     description: Cancel a pending payment
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Payment cancelled
 *       404:
 *         description: Payment not found
 *       400:
 *         description: Cannot cancel payment
 *       500:
 *         description: Server error
 */
// @desc    Cancel pending payment
// @route   PATCH /api/payments/:id/cancel
// @access  Private
exports.cancelPayment = async (req, res) => {
	try {
		const payment = await Payment.findById(req.params.id);

		if (!payment) {
			return res.status(404).json({
				success: false,
				error: 'Payment not found',
			});
		}

		// Kiểm tra quyền (chỉ user tạo payment)
		if (payment.user.toString() !== req.user._id.toString()) {
			return res.status(403).json({
				success: false,
				error: 'Access denied',
			});
		}

		// Chỉ có thể cancel payment đang pending
		if (payment.status !== 'pending') {
			return res.status(400).json({
				success: false,
				error: 'Can only cancel pending payments',
			});
		}

		payment.status = 'cancelled';
		await payment.save();

		res.status(200).json({
			success: true,
			message: 'Payment cancelled successfully',
			data: payment,
		});
	} catch (error) {
		console.error('Cancel payment error:', error);
		res.status(500).json({
			success: false,
			error: error.message,
		});
	}
};
