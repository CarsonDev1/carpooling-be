const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { localStorage } = require('../config/cloudinary');

// Ensure uploads directory exists
const ensureUploadsDirectoryExists = () => {
	const uploadsDir = path.join(process.cwd(), 'uploads');
	const avatarsDir = path.join(uploadsDir, 'avatars');

	if (!fs.existsSync(uploadsDir)) {
		console.log('📁 Creating uploads directory');
		fs.mkdirSync(uploadsDir);
	}

	if (!fs.existsSync(avatarsDir)) {
		console.log('📁 Creating avatars directory');
		fs.mkdirSync(avatarsDir);
	}
};

// Call this function when the server starts
ensureUploadsDirectoryExists();

// File filter function
const fileFilter = (req, file, cb) => {
	console.log('📁 File upload attempt:', {
		originalname: file.originalname,
		mimetype: file.mimetype,
		size: file.size,
	});

	if (file.mimetype.startsWith('image/')) {
		const allowedFormats = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
		if (allowedFormats.includes(file.mimetype)) {
			cb(null, true);
		} else {
			cb(new Error('Unsupported image format. Please use JPG, PNG, GIF, or WEBP.'), false);
		}
	} else {
		cb(new Error('Please upload only image files'), false);
	}
};

// Upload configuration (local storage only)
const upload = multer({
	storage: multer.diskStorage({
		destination: function (req, file, cb) {
			const uploadDir = path.join(process.cwd(), 'uploads/avatars');
			// Double-check directory exists before attempting upload
			if (!fs.existsSync(uploadDir)) {
				fs.mkdirSync(uploadDir, { recursive: true });
			}
			cb(null, uploadDir);
		},
		filename: function (req, file, cb) {
			const timestamp = Date.now();
			const userId = req.user ? req.user._id : 'anonymous';
			const randomSuffix = Math.round(Math.random() * 1e9);
			const extension = file.originalname.split('.').pop();
			cb(null, `avatar_${userId}_${timestamp}_${randomSuffix}.${extension}`);
		},
	}),
	limits: {
		fileSize: 5 * 1024 * 1024, // 5MB limit
		files: 1,
	},
	fileFilter: fileFilter,
});

// Middleware for single file upload
exports.uploadAvatar = upload.single('avatar');

// Error handling middleware
exports.handleUploadError = (error, req, res, next) => {
	console.error('💥 Upload error:', error);

	if (error instanceof multer.MulterError) {
		if (error.code === 'LIMIT_FILE_SIZE') {
			return res.status(400).json({
				status: 'error',
				message: 'File too large. Maximum size is 5MB.',
				code: 'FILE_TOO_LARGE',
			});
		}

		if (error.code === 'LIMIT_FILE_COUNT') {
			return res.status(400).json({
				status: 'error',
				message: 'Too many files. Please upload only one image.',
				code: 'TOO_MANY_FILES',
			});
		}

		if (error.code === 'LIMIT_UNEXPECTED_FILE') {
			return res.status(400).json({
				status: 'error',
				message: 'Unexpected field name. Please use "avatar" as the field name.',
				code: 'UNEXPECTED_FIELD',
			});
		}
	}

	if (error.message && error.message.includes('image')) {
		return res.status(400).json({
			status: 'error',
			message: error.message,
			code: 'INVALID_FILE_TYPE',
		});
	}

	// If we reached this point, it's an unhandled error
	return res.status(400).json({
		status: 'error',
		message: 'File upload failed. Please try again.',
		code: 'UPLOAD_FAILED',
		details: process.env.NODE_ENV === 'development' ? error.message : undefined,
	});
};

// Export the directory check function for use in server startup
exports.ensureUploadsDirectoryExists = ensureUploadsDirectoryExists;
