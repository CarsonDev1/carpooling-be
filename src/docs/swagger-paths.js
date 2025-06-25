// src/docs/swagger-paths.js
// Tạo file này để đảm bảo Swagger có documentation

/**
 * @swagger
 * /auth/test:
 *   get:
 *     summary: Test authentication endpoint
 *     description: Simple test endpoint to verify API is working
 *     tags: [Authentication]
 *     responses:
 *       200:
 *         description: Test successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 message:
 *                   type: string
 *                   example: Auth controller test working
 */

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Step 1 - Register with phone number and name
 *     description: Register account with phone number and full name, automatically sends OTP
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegisterRequest'
 *     responses:
 *       201:
 *         description: Account created and OTP sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 message:
 *                   type: string
 *                   example: Account created and OTP sent to your phone number
 *                 data:
 *                   type: object
 *                   properties:
 *                     userId:
 *                       type: string
 *                       example: "64f7b3b3b3b3b3b3b3b3b3b3"
 *                     phone:
 *                       type: string
 *                       example: "0987654321"
 *                     fullName:
 *                       type: string
 *                       example: "Nguyen Van A"
 *                     otpSent:
 *                       type: boolean
 *                       example: true
 *                     nextStep:
 *                       type: string
 *                       example: otp_verification
 *                     developmentOTP:
 *                       type: string
 *                       description: OTP for development testing
 *       400:
 *         description: Bad request - missing fields or phone already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

/**
 * @swagger
 * /auth/verify-otp:
 *   post:
 *     summary: Step 2 - Verify OTP code
 *     description: Verify the OTP code sent to phone number
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/VerifyOTPRequest'
 *     responses:
 *       200:
 *         description: OTP verified successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 message:
 *                   type: string
 *                   example: Phone number verified successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     userId:
 *                       type: string
 *                     phoneVerified:
 *                       type: boolean
 *                     nextStep:
 *                       type: string
 *                       example: set_password
 *       400:
 *         description: Invalid or expired OTP
 */

/**
 * @swagger
 * /auth/resend-otp:
 *   post:
 *     summary: Step 2.5 - Resend OTP code
 *     description: Resend verification code to phone number (rate limited)
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [userId]
 *             properties:
 *               userId:
 *                 type: string
 *                 example: "64f7b3b3b3b3b3b3b3b3b3b3"
 *     responses:
 *       200:
 *         description: New OTP sent successfully
 *       429:
 *         description: Too many requests - rate limited
 */

/**
 * @swagger
 * /auth/set-password:
 *   post:
 *     summary: Step 3 - Set password and complete registration
 *     description: Final step - set password and activate account
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SetPasswordRequest'
 *     responses:
 *       201:
 *         description: Registration completed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 message:
 *                   type: string
 *                   example: Registration completed successfully! Welcome to Carpooling!
 *                 data:
 *                   type: object
 *                   properties:
 *                     token:
 *                       type: string
 *                       description: JWT access token
 *                     user:
 *                       $ref: '#/components/schemas/User'
 */

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Login user with phone and password
 *     description: Authenticate user with phone number and password
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 message:
 *                   type: string
 *                   example: Login successful
 *                 data:
 *                   type: object
 *                   properties:
 *                     token:
 *                       type: string
 *                     user:
 *                       $ref: '#/components/schemas/User'
 *       401:
 *         description: Invalid credentials or incomplete registration
 */

/**
 * @swagger
 * /auth/me:
 *   get:
 *     summary: Get current user profile
 *     description: Get the profile of the currently authenticated user
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       $ref: '#/components/schemas/User'
 *       401:
 *         description: Unauthorized - invalid or missing token
 */

/**
 * @swagger
 * /auth/forgot-password:
 *   post:
 *     summary: Request password reset via SMS
 *     description: Send password reset OTP to user's phone number
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [phone]
 *             properties:
 *               phone:
 *                 type: string
 *                 pattern: '^[0-9]{10,11}$'
 *                 description: Phone number
 *                 example: "0987654321"
 *     responses:
 *       200:
 *         description: Password reset OTP sent (if account exists)
 */

/**
 * @swagger
 * /auth/reset-password:
 *   post:
 *     summary: Reset password with OTP
 *     description: Reset password using OTP received via SMS
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [phone, otp, password, confirmPassword]
 *             properties:
 *               phone:
 *                 type: string
 *                 pattern: '^[0-9]{10,11}$'
 *                 example: "0987654321"
 *               otp:
 *                 type: string
 *                 pattern: '^[0-9]{6}$'
 *                 description: OTP received via SMS
 *                 example: "123456"
 *               password:
 *                 type: string
 *                 minLength: 6
 *                 example: "newPassword123"
 *               confirmPassword:
 *                 type: string
 *                 example: "newPassword123"
 *     responses:
 *       200:
 *         description: Password reset successful
 */

/**
 * @swagger
 * /trips/estimate-price:
 *   post:
 *     summary: Estimate trip price
 *     description: Estimate the price of a trip based on distance, vehicle information, and time
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
 *                     example: "227 Nguyen Van Cu, Q5, TP HCM"
 *                   coordinates:
 *                     type: object
 *                     required: [lat, lng]
 *                     properties:
 *                       lat:
 *                         type: number
 *                         example: 10.7631
 *                       lng:
 *                         type: number
 *                         example: 106.6814
 *               endLocation:
 *                 type: object
 *                 required: [address, coordinates]
 *                 properties:
 *                   address:
 *                     type: string
 *                     example: "Landmark 81, Vinhomes Central Park, TP HCM"
 *                   coordinates:
 *                     type: object
 *                     required: [lat, lng]
 *                     properties:
 *                       lat:
 *                         type: number
 *                         example: 10.7951
 *                       lng:
 *                         type: number
 *                         example: 106.7218
 *               departureTime:
 *                 type: string
 *                 format: date-time
 *                 example: "2024-07-20T08:00:00Z"
 *               vehicleType:
 *                 type: string
 *                 enum: [motorcycle, car, suv, luxury]
 *                 description: Optional. Type of vehicle to use for price calculation. Will override user's vehicle information.
 *                 example: "car"
 *     responses:
 *       200:
 *         description: Price estimate calculated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     estimatedPrice:
 *                       type: number
 *                       example: 42000
 *                     currency:
 *                       type: string
 *                       example: "VND"
 *                     breakdown:
 *                       type: object
 *                       properties:
 *                         distanceInKm:
 *                           type: number
 *                           example: 8.2
 *                         baseRate:
 *                           type: number
 *                           example: 10000
 *                         peakHourMultiplier:
 *                           type: number
 *                           example: 1.2
 *                         qualityMultiplier:
 *                           type: number
 *                           example: 1.1
 *                     distance:
 *                       type: number
 *                       example: 8.2
 *                     vehicleType:
 *                       type: string
 *                       example: "car"
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /trips:
 *   post:
 *     summary: Create a booking request
 *     description: Create a new booking request as a passenger. Drivers can then respond to accept the booking. Price is estimated for reference only.
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
 *                     example: "227 Nguyen Van Cu, Q5, TP HCM"
 *                   coordinates:
 *                     type: object
 *                     required: [lat, lng]
 *                     properties:
 *                       lat:
 *                         type: number
 *                         example: 10.7631
 *                       lng:
 *                         type: number
 *                         example: 106.6814
 *               endLocation:
 *                 type: object
 *                 required: [address, coordinates]
 *                 properties:
 *                   address:
 *                     type: string
 *                     example: "Landmark 81, Vinhomes Central Park, TP HCM"
 *                   coordinates:
 *                     type: object
 *                     required: [lat, lng]
 *                     properties:
 *                       lat:
 *                         type: number
 *                         example: 10.7951
 *                       lng:
 *                         type: number
 *                         example: 106.7218
 *               departureTime:
 *                 type: string
 *                 format: date-time
 *                 example: "2024-07-20T08:00:00Z"
 *               preferredVehicleType:
 *                 type: string
 *                 enum: [motorcycle, car, suv, luxury]
 *                 default: car
 *                 description: Preferred vehicle type for the trip
 *                 example: "car"
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
 *                 example: 1
 *               requestNote:
 *                 type: string
 *                 description: Special note or request from passenger
 *                 example: "Cần đi gấp, tôi sẽ chờ ở tầng 1"
 *               estimatedArrivalTime:
 *                 type: string
 *                 format: date-time
 *                 example: "2024-07-20T09:00:00Z"
 *               currency:
 *                 type: string
 *                 default: "VND"
 *                 example: "VND"
 *               notes:
 *                 type: string
 *                 description: General notes about the trip
 *                 example: "Cần xe có điều hòa"
 *               stops:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     address:
 *                       type: string
 *                       example: "Đại học Sài Gòn, Q5, TP HCM"
 *                     coordinates:
 *                       type: object
 *                       properties:
 *                         lat:
 *                           type: number
 *                           example: 10.7595
 *                         lng:
 *                           type: number
 *                           example: 106.6782
 *                     estimatedArrivalTime:
 *                       type: string
 *                       format: date-time
 *               recurring:
 *                 type: object
 *                 properties:
 *                   isRecurring:
 *                     type: boolean
 *                     default: false
 *                     example: false
 *                   pattern:
 *                     type: string
 *                     enum: [daily, weekdays, weekends, weekly]
 *                     example: "daily"
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
 *                   description: Created booking request
 *                 pricing:
 *                   type: object
 *                   properties:
 *                     estimatedPrice:
 *                       type: number
 *                       example: 85000
 *                     maxPrice:
 *                       type: number
 *                       example: 100000
 *                     breakdown:
 *                       type: object
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

/**
 * @swagger
 * /trips/vehicle-types:
 *   get:
 *     summary: Get available vehicle types
 *     description: Get a list of all available vehicle types with their details and pricing information
 *     tags: [Trips]
 *     responses:
 *       200:
 *         description: List of available vehicle types
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     motorcycle:
 *                       type: object
 *                       properties:
 *                         name:
 *                           type: string
 *                           example: "Xe máy"
 *                         baseRate:
 *                           type: number
 *                           example: 5000
 *                         description:
 *                           type: string
 *                           example: "Phù hợp cho 1-2 người, chi phí thấp"
 *                         maxPassengers:
 *                           type: number
 *                           example: 2
 *                         icon:
 *                           type: string
 *                           example: "motorcycle"
 *                     car:
 *                       type: object
 *                       properties:
 *                         name:
 *                           type: string
 *                           example: "Xe hơi"
 *                         baseRate:
 *                           type: number
 *                           example: 10000
 *                         description:
 *                           type: string
 *                           example: "Phù hợp cho gia đình nhỏ hoặc nhóm 3-4 người"
 *                         maxPassengers:
 *                           type: number
 *                           example: 4
 *                         icon:
 *                           type: string
 *                           example: "car"
 *       500:
 *         description: Server error
 */

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
 *       400:
 *         description: Bad request (already requested, price too high, etc.)
 *       403:
 *         description: Not authorized (not a driver or vehicle info incomplete)
 *       404:
 *         description: Booking request not found
 *       500:
 *         description: Server error
 */

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
 *       400:
 *         description: Bad request (invalid action, already responded, etc.)
 *       403:
 *         description: Not authorized (not the trip requester)
 *       404:
 *         description: Trip or driver request not found
 *       500:
 *         description: Server error
 */

module.exports = {}; // Export empty object since this is just for documentation
