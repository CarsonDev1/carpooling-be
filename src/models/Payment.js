const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
	{
		// Thông tin cơ bản
		user: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'User',
			required: true,
		},
		trip: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Trip',
			required: true,
		},

		// Thông tin thanh toán
		amount: {
			type: Number,
			required: true,
			min: 0,
		},
		currency: {
			type: String,
			default: 'VND',
			uppercase: true,
		},

		// VNPay thông tin
		vnpTxnRef: {
			type: String,
			required: true,
			unique: true, // Mã giao dịch unique
		},
		vnpOrderInfo: {
			type: String,
			required: true,
		},
		vnpTransactionNo: String, // Mã giao dịch VNPay trả về
		vnpBankCode: String,
		vnpBankTranNo: String,
		vnpCardType: String,
		vnpPayDate: String,
		vnpSecureHash: String,

		// Trạng thái thanh toán
		status: {
			type: String,
			enum: ['pending', 'completed', 'failed', 'cancelled', 'refunded'],
			default: 'pending',
		},

		// URL và redirect
		returnUrl: String,
		cancelUrl: String,

		// Thông tin phản hồi từ VNPay
		vnpResponse: {
			type: mongoose.Schema.Types.Mixed,
			default: {},
		},

		// Thời gian
		createdAt: {
			type: Date,
			default: Date.now,
		},
		completedAt: Date,
		expiredAt: {
			type: Date,
			default: function () {
				// Payment sẽ hết hạn sau 15 phút
				return new Date(Date.now() + 15 * 60 * 1000);
			},
		},

		// Ghi chú
		note: String,

		// Metadata
		metadata: {
			type: mongoose.Schema.Types.Mixed,
			default: {},
		},
	},
	{
		timestamps: true,
		toJSON: { virtuals: true },
		toObject: { virtuals: true },
	}
);

// Indexes
paymentSchema.index({ user: 1 });
paymentSchema.index({ trip: 1 });
paymentSchema.index({ vnpTxnRef: 1 });
paymentSchema.index({ status: 1 });
paymentSchema.index({ createdAt: -1 });
paymentSchema.index({ expiredAt: 1 });

// Virtual để check payment đã hết hạn chưa
paymentSchema.virtual('isExpired').get(function () {
	return this.expiredAt && this.expiredAt < new Date();
});

// Virtual để format amount với currency
paymentSchema.virtual('formattedAmount').get(function () {
	return new Intl.NumberFormat('vi-VN', {
		style: 'currency',
		currency: this.currency || 'VND',
	}).format(this.amount);
});

// Method để cập nhật trạng thái thành công
paymentSchema.methods.markAsCompleted = function (vnpResponse) {
	this.status = 'completed';
	this.completedAt = new Date();
	this.vnpResponse = vnpResponse;

	// Extract VNPay fields
	if (vnpResponse.vnp_TransactionNo) {
		this.vnpTransactionNo = vnpResponse.vnp_TransactionNo;
	}
	if (vnpResponse.vnp_BankCode) {
		this.vnpBankCode = vnpResponse.vnp_BankCode;
	}
	if (vnpResponse.vnp_BankTranNo) {
		this.vnpBankTranNo = vnpResponse.vnp_BankTranNo;
	}
	if (vnpResponse.vnp_CardType) {
		this.vnpCardType = vnpResponse.vnp_CardType;
	}
	if (vnpResponse.vnp_PayDate) {
		this.vnpPayDate = vnpResponse.vnp_PayDate;
	}

	return this.save();
};

// Method để cập nhật trạng thái thất bại
paymentSchema.methods.markAsFailed = function (vnpResponse, reason) {
	this.status = 'failed';
	this.vnpResponse = vnpResponse;
	this.note = reason || 'Payment failed';
	return this.save();
};

module.exports = mongoose.model('Payment', paymentSchema);
