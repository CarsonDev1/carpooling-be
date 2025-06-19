// Tạo file mới: src/utils/priceCalculator.js

const calculateDistance = (start, end) => {
	// Tính khoảng cách giữa 2 tọa độ sử dụng công thức Haversine
	const R = 6371; // Bán kính trái đất (km)
	const dLat = ((end.lat - start.lat) * Math.PI) / 180;
	const dLon = ((end.lng - start.lng) * Math.PI) / 180;
	const a =
		Math.sin(dLat / 2) * Math.sin(dLat / 2) +
		Math.cos((start.lat * Math.PI) / 180) *
			Math.cos((end.lat * Math.PI) / 180) *
			Math.sin(dLon / 2) *
			Math.sin(dLon / 2);
	const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
	const distance = R * c;
	return distance; // Trả về khoảng cách bằng km
};

// Xác định giá cơ bản theo loại xe
const getBaseRateByVehicleType = (vehicleType) => {
	const rates = {
		motorcycle: 5000, // 5,000 VND/km cho xe máy
		car: 10000, // 10,000 VND/km cho xe hơi thông thường
		suv: 12000, // 12,000 VND/km cho SUV
		luxury: 15000, // 15,000 VND/km cho xe sang
	};
	return rates[vehicleType] || rates.car; // Mặc định là xe hơi nếu không xác định
};

// Hệ số cho giờ cao điểm
const getPeakHourMultiplier = (departureTime) => {
	const hour = new Date(departureTime).getHours();
	// Giờ cao điểm: 7-9h sáng và 16-19h chiều
	if ((hour >= 7 && hour <= 9) || (hour >= 16 && hour <= 19)) {
		return 1.2; // Tăng 20% cho giờ cao điểm
	}
	return 1.0;
};

// Hệ số chất lượng xe
const getVehicleQualityMultiplier = (vehicleYear) => {
	const currentYear = new Date().getFullYear();
	const age = currentYear - vehicleYear;

	if (age <= 2)
		return 1.1; // Xe mới (0-2 năm): +10%
	else if (age <= 5)
		return 1.0; // Xe trung bình (3-5 năm): giá chuẩn
	else return 0.9; // Xe cũ (>5 năm): -10%
};

// Hàm tính giá chính
const calculatePrice = (startCoords, endCoords, vehicle, departureTime) => {
	// Tính khoảng cách
	const distanceInKm = calculateDistance(startCoords, endCoords);

	// Xác định loại phương tiện và năm sản xuất
	const vehicleType = vehicle?.type || 'car';
	const vehicleYear = vehicle?.year || new Date().getFullYear() - 3; // Mặc định 3 năm tuổi

	// Tính các yếu tố ảnh hưởng đến giá
	const baseRate = getBaseRateByVehicleType(vehicleType);
	const peakMultiplier = getPeakHourMultiplier(departureTime);
	const qualityMultiplier = getVehicleQualityMultiplier(vehicleYear);

	// Tính giá cuối cùng
	let finalPrice = distanceInKm * baseRate * peakMultiplier * qualityMultiplier;

	// Làm tròn đến 1000 VND
	finalPrice = Math.ceil(finalPrice / 1000) * 1000;

	return {
		price: finalPrice,
		breakdown: {
			distanceInKm: Math.round(distanceInKm * 10) / 10,
			baseRate,
			peakHourMultiplier: peakMultiplier,
			qualityMultiplier,
		},
	};
};

module.exports = {
	calculatePrice,
	calculateDistance,
};
