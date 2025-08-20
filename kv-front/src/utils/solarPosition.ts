export interface SolarPosition {
	azimuth: number;
	elevation: number;
}

export interface GeographicCoordinates {
	latitude: number;
	longitude: number;
}

export function calculateSolarPosition(
	date: Date,
	coordinates: GeographicCoordinates,
): SolarPosition {
	const { latitude, longitude } = coordinates;
	
	// Use the provided date directly (already in local time)
	const dayOfYear = getDayOfYear(date);
	
	// Calculate decimal hours in local time
	const localHours = date.getHours() + date.getMinutes() / 60 + date.getSeconds() / 3600;
	
	// Solar declination
	const declination = calculateSolarDeclination(dayOfYear);
	
	// Convert local time to solar time (account for longitude and time zone)
	// For Japan (JST = UTC+9), longitude ~140°E
	// Standard meridian for JST is 135°E, so we need to adjust for the difference
	const longitudeDifference = longitude - 135; // Difference from JST standard meridian
	const solarTimeAdjustment = longitudeDifference / 15; // Convert degrees to hours
	const solarTime = localHours + solarTimeAdjustment;
	
	// Hour angle from solar noon (15 degrees per hour)
	const hourAngle = 15 * (solarTime - 12);
	
	// Convert to radians
	const latRad = (latitude * Math.PI) / 180;
	const decRad = (declination * Math.PI) / 180;
	const hourRad = (hourAngle * Math.PI) / 180;
	
	// Solar elevation calculation
	const elevation = Math.asin(
		Math.sin(latRad) * Math.sin(decRad) +
		Math.cos(latRad) * Math.cos(decRad) * Math.cos(hourRad),
	);
	
	// Solar azimuth calculation
	const azimuth = Math.atan2(
		Math.sin(hourRad),
		Math.cos(hourRad) * Math.sin(latRad) - Math.tan(decRad) * Math.cos(latRad),
	);
	
	const elevationDeg = (elevation * 180) / Math.PI;
	const azimuthDeg = ((azimuth * 180) / Math.PI + 180) % 360;
	
	
	return {
		elevation: elevationDeg,
		azimuth: azimuthDeg,
	};
}

export interface SkyParameters {
	sunPosition: [number, number, number];
	turbidity: number;
	rayleigh: number;
	mieCoefficient: number;
	mieDirectionalG: number;
	exposure: number;
}

export function solarPositionToThreeJS(solarPosition: SolarPosition): [number, number, number] {
	const { azimuth, elevation } = solarPosition;
	
	const elevationRad = Math.max(0, (elevation * Math.PI) / 180);
	const azimuthRad = ((azimuth - 180) * Math.PI) / 180;
	
	const distance = 1;
	
	const x = distance * Math.cos(elevationRad) * Math.sin(azimuthRad);
	const y = distance * Math.sin(elevationRad);
	const z = distance * Math.cos(elevationRad) * Math.cos(azimuthRad);
	
	return [x, y, z];
}

export function calculateSkyParameters(solarPosition: SolarPosition): SkyParameters {
	const { elevation } = solarPosition;
	const sunPosition = solarPositionToThreeJS(solarPosition);
	
	// Normalize elevation (-90 to 90 degrees to 0 to 1) - reserved for future use
	// const _normalizedElevation = Math.max(0, (elevation + 90) / 180);

	// Day/night detection
	const isDaytime = elevation > 0;
	const isTwilight = elevation > -18 && elevation <= 0;
	
	// Calculate smooth transitions
	const dayIntensity = Math.max(0, Math.min(1, (elevation + 6) / 12));
	const twilightIntensity = isTwilight ? Math.max(0, (elevation + 18) / 18) : 0;
	
	// Atmospheric parameters based on sun elevation
	let turbidity: number;
	let rayleigh: number;
	let mieCoefficient: number;
	let mieDirectionalG: number;
	let exposure: number;
	
	if (isDaytime) {
		// Daytime values
		turbidity = 2 + (8 * (1 - dayIntensity)); // 2-10, higher when sun is lower
		rayleigh = 1 + (2 * dayIntensity); // 1-3, higher when sun is higher
		mieCoefficient = 0.005 + (0.015 * (1 - dayIntensity)); // 0.005-0.02
		mieDirectionalG = 0.7 + (0.2 * (1 - dayIntensity)); // 0.7-0.9
		exposure = 0.4 + (0.6 * dayIntensity); // 0.4-1.0
	} else if (isTwilight) {
		// Twilight values (smooth transition to night)
		turbidity = 10 + (5 * (1 - twilightIntensity)); // 10-15
		rayleigh = 0.5 + (0.5 * twilightIntensity); // 0.5-1.0
		mieCoefficient = 0.02 + (0.03 * (1 - twilightIntensity)); // 0.02-0.05
		mieDirectionalG = 0.9 + (0.05 * (1 - twilightIntensity)); // 0.9-0.95
		exposure = 0.1 + (0.3 * twilightIntensity); // 0.1-0.4
	} else {
		// Nighttime values
		turbidity = 15; // High atmospheric haze
		rayleigh = 0.5; // Low blue scattering
		mieCoefficient = 0.05; // High particle scattering
		mieDirectionalG = 0.95; // Strong directional scattering
		exposure = 0; // No exposure (complete darkness)
	}
	
	return {
		sunPosition,
		turbidity,
		rayleigh,
		mieCoefficient,
		mieDirectionalG,
		exposure,
	};
}

function getDayOfYear(date: Date): number {
	const start = new Date(date.getFullYear(), 0, 0);
	const diff = date.getTime() - start.getTime();
	return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function calculateSolarDeclination(dayOfYear: number): number {
	return 23.45 * Math.sin((360 * (284 + dayOfYear)) / 365 * Math.PI / 180);
}

