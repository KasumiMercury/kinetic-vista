import type { GeographicCoordinates } from './solarPosition';

const DEFAULT_COORDINATES: GeographicCoordinates = {
	latitude: 35.6762,
	longitude: 139.6503,
};

export function getLocationFromEnvironment(): GeographicCoordinates {
	const latitude = import.meta.env.VITE_LATITUDE;
	const longitude = import.meta.env.VITE_LONGITUDE;

	if (latitude && longitude) {
		const lat = parseFloat(latitude);
		const lng = parseFloat(longitude);
		
		if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
			console.log(`Using environment coordinates: ${lat}, ${lng}`);
			return { latitude: lat, longitude: lng };
		} else {
			console.warn('Invalid environment coordinates. Using default coordinates (Tokyo).');
		}
	} else {
		console.log('No environment coordinates set. Using default coordinates (Tokyo).');
	}

	return DEFAULT_COORDINATES;
}