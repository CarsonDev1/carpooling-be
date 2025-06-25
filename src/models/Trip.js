const mongoose = require('mongoose');

const tripSchema = new mongoose.Schema(
	{
		// Người tạo yêu cầu đặt xe (passenger)
		requestedBy: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'User',
			required: true,
		},
		// Tài xế (sẽ được assign sau khi accept)
		driver: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'User',
			default: null,
		},
		startLocation: {
			address: {
				type: String,
				required: true,
				trim: true,
			},
			coordinates: {
				type: {
					type: String,
					enum: ['Point'],
					default: 'Point',
					required: true,
				},
				coordinates: {
					type: [Number],
					required: true,
					validate: {
						validator: function (val) {
							return val.length === 2 && val[0] >= -180 && val[0] <= 180 && val[1] >= -90 && val[1] <= 90;
						},
						message: 'Coordinates must be [longitude, latitude] with valid ranges',
					},
				},
			},
		},
		endLocation: {
			address: {
				type: String,
				required: true,
				trim: true,
			},
			coordinates: {
				type: {
					type: String,
					enum: ['Point'],
					default: 'Point',
					required: true,
				},
				coordinates: {
					type: [Number],
					required: true,
					validate: {
						validator: function (val) {
							return val.length === 2 && val[0] >= -180 && val[0] <= 180 && val[1] >= -90 && val[1] <= 90;
						},
						message: 'Coordinates must be [longitude, latitude] with valid ranges',
					},
				},
			},
		},
		departureTime: {
			type: Date,
			required: true,
		},
		estimatedArrivalTime: {
			type: Date,
		},
		availableSeats: {
			type: Number,
			required: true,
			min: 1,
		},
		// Any note or description for the trip
		notes: {
			type: String,
			trim: true,
		},
		// Intermediate stops if any
		stops: [
			{
				address: {
					type: String,
					required: true,
					trim: true,
				},
				coordinates: {
					type: {
						type: String,
						enum: ['Point'],
						default: 'Point',
						required: true,
					},
					coordinates: {
						type: [Number],
						required: true,
						validate: {
							validator: function (val) {
								return (
									val.length === 2 && val[0] >= -180 && val[0] <= 180 && val[1] >= -90 && val[1] <= 90
								);
							},
							message: 'Coordinates must be [longitude, latitude] with valid ranges',
						},
					},
				},
				estimatedArrivalTime: {
					type: Date,
				},
			},
		],
		price: {
			type: Number,
			default: 0,
			min: 0,
		},
		// Loại xe passenger mong muốn
		preferredVehicleType: {
			type: String,
			enum: ['motorcycle', 'car', 'suv', 'luxury'],
			default: 'car',
		},
		// Loại xe thực tế của driver (sau khi accept)
		vehicleTypeUsed: {
			type: String,
			enum: ['motorcycle', 'car', 'suv', 'luxury'],
		},
		// Giá tối đa passenger chấp nhận
		maxPrice: {
			type: Number,
			min: 0,
		},
		// Ghi chú từ passenger
		requestNote: {
			type: String,
			trim: true,
		},
		currency: {
			type: String,
			default: 'VND',
			uppercase: true,
		},
		// Danh sách drivers request accept booking này
		driverRequests: [
			{
				driver: {
					type: mongoose.Schema.Types.ObjectId,
					ref: 'User',
					required: true,
				},
				status: {
					type: String,
					enum: ['pending', 'accepted', 'declined'],
					default: 'pending',
				},
				proposedPrice: {
					type: Number,
					min: 0,
				},
				message: {
					type: String,
					trim: true,
				},
				requestedAt: {
					type: Date,
					default: Date.now,
				},
				respondedAt: {
					type: Date,
				},
			},
		],
		// List of passengers (giữ lại cho tương lai nếu muốn multi-passenger)
		passengers: [
			{
				user: {
					type: mongoose.Schema.Types.ObjectId,
					ref: 'User',
					required: true,
				},
				status: {
					type: String,
					enum: ['pending', 'accepted', 'declined', 'cancelled'],
					default: 'pending',
				},
				paymentStatus: {
					type: String,
					enum: ['not_required', 'pending', 'completed', 'failed'],
					default: 'not_required',
				},
				paymentId: {
					type: mongoose.Schema.Types.ObjectId,
					ref: 'Payment',
				},
				pickupLocation: {
					address: {
						type: String,
						trim: true,
					},
					coordinates: {
						type: {
							type: String,
							enum: ['Point'],
							default: 'Point',
						},
						coordinates: {
							type: [Number],
							validate: {
								validator: function (val) {
									return (
										val.length === 2 &&
										val[0] >= -180 &&
										val[0] <= 180 &&
										val[1] >= -90 &&
										val[1] <= 90
									);
								},
								message: 'Coordinates must be [longitude, latitude] with valid ranges',
							},
						},
					},
				},
				dropoffLocation: {
					address: {
						type: String,
						trim: true,
					},
					coordinates: {
						type: {
							type: String,
							enum: ['Point'],
							default: 'Point',
						},
						coordinates: {
							type: [Number],
							validate: {
								validator: function (val) {
									return (
										val.length === 2 &&
										val[0] >= -180 &&
										val[0] <= 180 &&
										val[1] >= -90 &&
										val[1] <= 90
									);
								},
								message: 'Coordinates must be [longitude, latitude] with valid ranges',
							},
						},
					},
				},
				requestedAt: {
					type: Date,
					default: Date.now,
				},
				updatedAt: {
					type: Date,
				},
			},
		],
		status: {
			type: String,
			enum: ['pending_driver', 'confirmed', 'paid', 'in_progress', 'completed', 'cancelled'],
			default: 'pending_driver',
		},
		// For recurring trips
		recurring: {
			isRecurring: {
				type: Boolean,
				default: false,
			},
			pattern: {
				type: String,
				enum: ['daily', 'weekdays', 'weekends', 'weekly'],
				default: 'daily',
			},
			endDate: {
				type: Date,
			},
		},
		cancellationReason: {
			type: String,
		},
		// Timestamps quan trọng
		confirmedAt: {
			type: Date, // Khi driver accept
		},
		paidAt: {
			type: Date, // Khi payment hoàn thành
		},
		// To track trip progress
		actualDepartureTime: {
			type: Date,
		},
		actualArrivalTime: {
			type: Date,
		},
	},
	{
		timestamps: true,
		toJSON: { virtuals: true },
		toObject: { virtuals: true },
	}
);

// Indexes for faster querying
tripSchema.index({ requestedBy: 1, departureTime: 1 });
tripSchema.index({ driver: 1, departureTime: 1 });
tripSchema.index({ 'startLocation.coordinates': '2dsphere' });
tripSchema.index({ 'endLocation.coordinates': '2dsphere' });
tripSchema.index({ status: 1 });
tripSchema.index({ departureTime: 1 });
tripSchema.index({ 'driverRequests.driver': 1 });
tripSchema.index({ 'passengers.user': 1 });
tripSchema.index({ status: 1, departureTime: 1 }); // For driver finding trips

// Virtual for total passenger count
tripSchema.virtual('passengerCount').get(function () {
	return this.passengers.filter((p) => p.status === 'accepted').length;
});

// Virtual to check if the trip is full
tripSchema.virtual('isFull').get(function () {
	const acceptedPassengers = this.passengers.filter((p) => p.status === 'accepted').length;
	return acceptedPassengers >= this.availableSeats;
});

// Virtual để check xem có driver requests pending không
tripSchema.virtual('hasPendingDriverRequests').get(function () {
	return this.driverRequests.some((req) => req.status === 'pending');
});

// Virtual để lấy accepted driver request
tripSchema.virtual('acceptedDriverRequest').get(function () {
	return this.driverRequests.find((req) => req.status === 'accepted');
});

module.exports = mongoose.model('Trip', tripSchema);
