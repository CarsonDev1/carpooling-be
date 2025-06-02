const cloudinary = require('cloudinary').v2;

// Configure cloudinary (for manual upload later)
cloudinary.config({
	cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
	api_key: process.env.CLOUDINARY_API_KEY,
	api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Test cloudinary connection
const testCloudinaryConnection = async () => {
	try {
		if (!process.env.CLOUDINARY_CLOUD_NAME) {
			console.log('⚠️ Cloudinary not configured (missing env variables)');
			return false;
		}

		const result = await cloudinary.api.ping();
		console.log('✅ Cloudinary connected successfully:', result);
		return true;
	} catch (error) {
		console.error('❌ Cloudinary connection failed:', error.message);
		return false;
	}
};

// Local storage configuration
const localStorage = require('multer').diskStorage({
	destination: function (req, file, cb) {
		const fs = require('fs');
		const uploadDir = 'uploads/avatars';
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
});

module.exports = {
	cloudinary,
	localStorage,
	testCloudinaryConnection,
};
