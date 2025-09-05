import landmarkData from "../assets/landmark.json";

export type LandmarkEntry = {
	displayJP: string;
	x: number;
	y: number;
	z: number;
	radius?: number;
	heightOffset?: number;
};

export type LandmarkAngleInfo = {
	key: string;
	displayJP: string;
	absoluteAngle: number; // 0-360 degrees from positive X axis
	relativeAngle: number; // -180 to 180 degrees relative to camera
	isSelected: boolean;
};

/**
 * Calculate the angle from origin to a landmark position in degrees
 * @param x - X coordinate
 * @param z - Z coordinate (using Y from landmark.json as Z in 3D space)
 * @returns Angle in degrees (0-360), where 0 is positive X axis, 90 is positive Z axis
 */
export function calculateLandmarkAngle(x: number, z: number): number {
	const angleRadians = Math.atan2(z, x);
	const angleDegrees = angleRadians * (180 / Math.PI);
	// Normalize to 0-360 range
	return angleDegrees < 0 ? angleDegrees + 360 : angleDegrees;
}

/**
 * Calculate relative angle difference between landmark and camera rotation
 * @param landmarkAngle - Absolute angle of landmark (0-360)
 * @param cameraRotation - Camera rotation in degrees (0-360)
 * @returns Relative angle (-180 to 180), negative is left, positive is right
 */
export function calculateRelativeAngle(
	landmarkAngle: number,
	cameraRotation: number,
): number {
	let diff = landmarkAngle - cameraRotation;
	
	// Normalize to -180 to 180 range for left/right positioning
	while (diff > 180) diff -= 360;
	while (diff < -180) diff += 360;
	
	return diff;
}

/**
 * Get all landmark angle information relative to current camera rotation
 * @param cameraRotation - Current camera rotation in degrees (0-360)
 * @param selectedLandmarks - Array of selected landmark keys
 * @returns Array of landmark angle information
 */
export function getLandmarkAngles(
	cameraRotation: number,
	selectedLandmarks: string[] = [],
): LandmarkAngleInfo[] {
	const landmarks = landmarkData as Record<string, LandmarkEntry>;
	
	return Object.entries(landmarks).map(([key, landmark]) => {
		// Use landmark.y as Z coordinate in 3D space (as seen in OctahedronMarkers coordMap)
		const absoluteAngle = calculateLandmarkAngle(landmark.x, landmark.y);
		const relativeAngle = calculateRelativeAngle(absoluteAngle, cameraRotation);
		
		return {
			key,
			displayJP: landmark.displayJP,
			absoluteAngle,
			relativeAngle,
			isSelected: selectedLandmarks.includes(key),
		};
	});
}