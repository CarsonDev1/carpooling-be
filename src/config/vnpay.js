const crypto = require('crypto');
const qs = require('qs');

// VNPay Configuration
const vnpayConfig = {
	vnp_TmnCode: process.env.VNP_TMN_CODE || '4680X3ZG',
	vnp_HashSecret: process.env.VNP_HASH_SECRET || 'J5RKHN2SW0YUS4L6MYSYQRXIA6W9NZ6I',
	vnp_Url: process.env.VNP_PAYMENT_URL || 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html',
	vnp_Api: process.env.VNP_API_URL || 'https://sandbox.vnpayment.vn/merchant_webapi/api/transaction',
	vnp_ReturnUrl: process.env.VNP_RETURN_URL || 'http://localhost:5000/api/payments/vnpay/return',
	vnp_FrontendReturnUrl: process.env.VNP_FRONTEND_RETURN_URL || 'http://localhost:3000/vnpay-return',
	vnp_Version: process.env.VNP_VERSION || '2.1.0',
	vnp_Command: process.env.VNP_COMMAND || 'pay',
	vnp_CurrCode: process.env.VNP_CURR_CODE || 'VND',
	vnp_Locale: process.env.VNP_LOCALE || 'vn',
};

// Helper functions
class VNPayHelper {
	/**
	 * Tạo secure hash cho VNPay
	 */
	static createSecureHash(params, secretKey) {
		// Sắp xếp parameters theo thứ tự alphabet
		const sortedParams = {};
		Object.keys(params)
			.sort()
			.forEach((key) => {
				if (params[key] !== null && params[key] !== undefined && params[key] !== '') {
					sortedParams[key] = params[key];
				}
			});

		// Tạo query string
		const queryString = qs.stringify(sortedParams, { encode: false });

		// Tạo HMAC SHA512 hash
		const hmac = crypto.createHmac('sha512', secretKey);
		hmac.update(Buffer.from(queryString, 'utf-8'));
		return hmac.digest('hex');
	}

	/**
	 * Verify secure hash từ VNPay response
	 */
	static verifySecureHash(params, secretKey) {
		const { vnp_SecureHash, ...otherParams } = params;
		const calculatedHash = this.createSecureHash(otherParams, secretKey);
		return calculatedHash === vnp_SecureHash;
	}

	/**
	 * Format datetime cho VNPay (YYYYMMDDHHmmss)
	 */
	static formatDateTime(date = new Date()) {
		const year = date.getFullYear();
		const month = String(date.getMonth() + 1).padStart(2, '0');
		const day = String(date.getDate()).padStart(2, '0');
		const hours = String(date.getHours()).padStart(2, '0');
		const minutes = String(date.getMinutes()).padStart(2, '0');
		const seconds = String(date.getSeconds()).padStart(2, '0');

		return `${year}${month}${day}${hours}${minutes}${seconds}`;
	}

	/**
	 * Generate unique transaction reference
	 */
	static generateTxnRef() {
		const timestamp = Date.now();
		const random = Math.floor(Math.random() * 1000);
		return `TXN${timestamp}${random}`;
	}

	/**
	 * Tạo payment URL cho VNPay
	 */
	static createPaymentUrl(paymentData) {
		const { amount, orderInfo, txnRef, returnUrl, ipAddr = '127.0.0.1' } = paymentData;

		// Tạo expire time (15 phút từ bây giờ)
		const expireDate = new Date(Date.now() + 15 * 60 * 1000);

		const vnpParams = {
			vnp_Version: vnpayConfig.vnp_Version,
			vnp_Command: vnpayConfig.vnp_Command,
			vnp_TmnCode: vnpayConfig.vnp_TmnCode,
			vnp_Locale: vnpayConfig.vnp_Locale,
			vnp_CurrCode: vnpayConfig.vnp_CurrCode,
			vnp_TxnRef: txnRef,
			vnp_OrderInfo: orderInfo,
			vnp_OrderType: 'other',
			vnp_Amount: amount * 100, // VNPay yêu cầu amount * 100
			vnp_ReturnUrl: returnUrl || vnpayConfig.vnp_ReturnUrl,
			vnp_IpAddr: ipAddr,
			vnp_CreateDate: this.formatDateTime(),
			vnp_ExpireDate: this.formatDateTime(expireDate),
		};

		// Tạo secure hash
		vnpParams.vnp_SecureHash = this.createSecureHash(vnpParams, vnpayConfig.vnp_HashSecret);

		// Tạo URL
		const queryString = qs.stringify(vnpParams, { encode: false });
		return `${vnpayConfig.vnp_Url}?${queryString}`;
	}

	/**
	 * Verify và parse VNPay return data
	 */
	static verifyReturnData(vnpParams) {
		const isValid = this.verifySecureHash(vnpParams, vnpayConfig.vnp_HashSecret);

		return {
			isValid,
			responseCode: vnpParams.vnp_ResponseCode,
			transactionStatus: vnpParams.vnp_TransactionStatus,
			txnRef: vnpParams.vnp_TxnRef,
			amount: parseInt(vnpParams.vnp_Amount) / 100, // Convert back from VNPay format
			orderInfo: vnpParams.vnp_OrderInfo,
			payDate: vnpParams.vnp_PayDate,
			transactionNo: vnpParams.vnp_TransactionNo,
			bankCode: vnpParams.vnp_BankCode,
			bankTranNo: vnpParams.vnp_BankTranNo,
			cardType: vnpParams.vnp_CardType,
			rawData: vnpParams,
		};
	}

	/**
	 * Get payment status message
	 */
	static getStatusMessage(responseCode) {
		const statusMessages = {
			'00': 'Giao dịch thành công',
			'07': 'Trừ tiền thành công. Giao dịch bị nghi ngờ (liên quan tới lừa đảo, giao dịch bất thường).',
			'09': 'Giao dịch không thành công do: Thẻ/Tài khoản của khách hàng chưa đăng ký dịch vụ InternetBanking tại ngân hàng.',
			10: 'Giao dịch không thành công do: Khách hàng xác thực thông tin thẻ/tài khoản không đúng quá 3 lần',
			11: 'Giao dịch không thành công do: Đã hết hạn chờ thanh toán. Xin quý khách vui lòng thực hiện lại giao dịch.',
			12: 'Giao dịch không thành công do: Thẻ/Tài khoản của khách hàng bị khóa.',
			13: 'Giao dịch không thành công do Quý khách nhập sai mật khẩu xác thực giao dịch (OTP).',
			24: 'Giao dịch không thành công do: Khách hàng hủy giao dịch',
			51: 'Giao dịch không thành công do: Tài khoản của quý khách không đủ số dư để thực hiện giao dịch.',
			65: 'Giao dịch không thành công do: Tài khoản của Quý khách đã vượt quá hạn mức giao dịch trong ngày.',
			75: 'Ngân hàng thanh toán đang bảo trì.',
			79: 'Giao dịch không thành công do: KH nhập sai mật khẩu thanh toán quá số lần quy định.',
			99: 'Các lỗi khác (lỗi còn lại, không có trong danh sách mã lỗi đã liệt kê)',
		};

		return statusMessages[responseCode] || 'Lỗi không xác định';
	}

	/**
	 * Check if transaction is successful
	 */
	static isSuccessTransaction(responseCode, transactionStatus) {
		return responseCode === '00' && transactionStatus === '00';
	}
}

module.exports = {
	vnpayConfig,
	VNPayHelper,
};
