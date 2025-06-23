const express = require('express');
const router = express.Router();
const {
	createPayment,
	vnpayReturn,
	getPayment,
	getPaymentHistory,
	cancelPayment,
} = require('../controllers/paymentController');

const { protect } = require('../middleware/auth');

// VNPay return URL (public - không cần auth)
router.get('/vnpay/return', vnpayReturn);

// All other routes require authentication
router.use(protect);

// @route   POST /api/payments/create
// @desc    Create payment for trip
// @access  Private
router.post('/create', createPayment);

// @route   GET /api/payments
// @desc    Get user's payment history
// @access  Private
router.get('/', getPaymentHistory);

// @route   GET /api/payments/:id
// @desc    Get payment details
// @access  Private
router.get('/:id', getPayment);

// @route   PATCH /api/payments/:id/cancel
// @desc    Cancel pending payment
// @access  Private
router.patch('/:id/cancel', cancelPayment);

module.exports = router;
