const mongoose = require('mongoose');

const tripSchema = new mongoose.Schema(
	{
		driver: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'User',
			required: true,
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
		// Lưu loại xe được sử dụng cho chuyến đi (dùng cho tính giá)
		vehicleTypeUsed: {
			type: String,
			enum: ['motorcycle', 'car', 'suv', 'luxury'],
			default: 'car',
		},
		currency: {
			type: String,
			default: 'VND',
			uppercase: true,
		},
		// List of passengers
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
			enum: ['scheduled', 'in_progress', 'completed', 'cancelled'],
			default: 'scheduled',
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
tripSchema.index({ driver: 1, departureTime: 1 });
tripSchema.index({ 'startLocation.coordinates': '2dsphere' });
tripSchema.index({ 'endLocation.coordinates': '2dsphere' });
tripSchema.index({ status: 1 });
tripSchema.index({ departureTime: 1 });
tripSchema.index({ 'passengers.user': 1 });

// Virtual for total passenger count
tripSchema.virtual('passengerCount').get(function () {
	return this.passengers.filter((p) => p.status === 'accepted').length;
});

// Virtual to check if the trip is full
tripSchema.virtual('isFull').get(function () {
	const acceptedPassengers = this.passengers.filter((p) => p.status === 'accepted').length;
	return acceptedPassengers >= this.availableSeats;
});

module.exports = mongoose.model('Trip', tripSchema);
