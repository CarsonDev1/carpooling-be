const http = require('http');

// Test data
const testData = {
	startLocation: {
		address: '227 Nguyen Van Cu, Q5, TP HCM',
		coordinates: {
			lat: 10.7631,
			lng: 106.6814,
		},
	},
	endLocation: {
		address: 'Landmark 81, Vinhomes Central Park, TP HCM',
		coordinates: {
			lat: 10.7951,
			lng: 106.7218,
		},
	},
	departureTime: '2024-12-30T08:00:00.000Z',
	preferredVehicleType: 'car',
	maxPrice: 100000,
	availableSeats: 1,
	requestNote: 'Test trip from API',
};

// Use the same token from your previous request
const token =
	'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY3NGZkNTk4ODhmNWRiODA5ODFlMzAiLCJpYXQiOjE3MzUwMjczNjcsImV4cCI6MTczNzYxOTM2N30.n_2CTSLaW__D-KNJAeMsZqKsrTOgxIwCdpfhERa_PH4';

const postData = JSON.stringify(testData);

const options = {
	hostname: 'localhost',
	port: 5000,
	path: '/api/trips',
	method: 'POST',
	headers: {
		'Content-Type': 'application/json',
		'Content-Length': Buffer.byteLength(postData),
		Authorization: `Bearer ${token}`,
	},
};

console.log('🚀 Testing API endpoint...');
console.log('📋 Request data:', JSON.stringify(testData, null, 2));

const req = http.request(options, (res) => {
	console.log(`📊 Status Code: ${res.statusCode}`);
	console.log(`📋 Headers:`, res.headers);

	let data = '';
	res.on('data', (chunk) => {
		data += chunk;
	});

	res.on('end', () => {
		console.log('📝 Response Body:');
		try {
			const parsed = JSON.parse(data);
			console.log(JSON.stringify(parsed, null, 2));
		} catch (e) {
			console.log(data);
		}
	});
});

req.on('error', (e) => {
	console.error(`❌ Request error: ${e.message}`);
});

// Write data to request body
req.write(postData);
req.end();

console.log('⏳ Waiting for response...');
