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
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /trips:
 *   post:
 *     summary: Create a new trip
 *     description: Create a new trip as a driver. If price is not provided, it will be calculated automatically based on distance, vehicle information and time.
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
 *                     example: "227 Nguyen Van Cu, Q5, TP HCM"
 *                   coordinates:
 *                     type: object
 *                     properties:
 *                       lat:
 *                         type: number
 *                         example: 10.7631
 *                       lng:
 *                         type: number
 *                         example: 106.6814
 *               endLocation:
 *                 type: object
 *                 properties:
 *                   address:
 *                     type: string
 *                     example: "Landmark 81, Vinhomes Central Park, TP HCM"
 *                   coordinates:
 *                     type: object
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
 *               estimatedArrivalTime:
 *                 type: string
 *                 format: date-time
 *                 example: "2024-07-20T09:00:00Z"
 *               availableSeats:
 *                 type: number
 *                 minimum: 1
 *                 example: 3
 *               price:
 *                 type: number
 *                 description: Optional. If not provided, price will be calculated automatically
 *                 example: 50000
 *               currency:
 *                 type: string
 *                 default: "VND"
 *                 example: "VND"
 *               notes:
 *                 type: string
 *                 example: "Đi làm hàng ngày, có điều hòa"
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
 *                     example: false
 *                   pattern:
 *                     type: string
 *                     enum: [daily, weekdays, weekends, weekly]
 *                     example: "daily"
 *     responses:
 *       201:
 *         description: Trip created successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */

module.exports = {}; // Export empty object since this is just for documentation
