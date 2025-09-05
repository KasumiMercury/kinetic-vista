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

export type CoordMap = {
	xKey?: "x" | "y" | "z";
	zKey?: "x" | "y" | "z";
	invertX?: boolean;
	invertZ?: boolean;
};

/**
 * Calculate the angle from origin to a landmark position in degrees
 * Uses the same coordinate transformation logic as OctahedronMarkers
 * @param entry - Landmark entry from landmark.json
 * @param coordMap - Coordinate mapping configuration
 * @param scale - Scale factors for x and z
 * @param yawRad - Yaw rotation in radians
 * @returns Angle in degrees (0-360), where 0 is positive X axis, 90 is positive Z axis
 */
export function calculateLandmarkAngle(
	entry: LandmarkEntry,
	coordMap: CoordMap = {},
	scale: { sx: number; sz: number } = { sx: 1, sz: 1 },
	yawRad: number = 0,
): number {
	const xKey = coordMap.xKey;
	const zKey = coordMap.zKey;
	const invertX = coordMap.invertX ?? false;
	const invertZ = coordMap.invertZ ?? false;

	// Apply the same coordinate transformation as OctahedronMarkers
	const baseX = (xKey ? (entry as never)[xKey] : entry.x) ?? 0;
	const baseZ = (zKey ? (entry as never)[zKey] : (entry.z ?? entry.y)) ?? 0;

	const vx = (invertX ? -baseX : baseX) * scale.sx;
	const vz = (invertZ ? -baseZ : baseZ) * scale.sz;

	// Apply yaw rotation
	const cosY = Math.cos(yawRad);
	const sinY = Math.sin(yawRad);
	const rx = vx * cosY + vz * sinY;
	const rz = -vx * sinY + vz * cosY;

	const angleRadians = Math.atan2(rz, rx);
	let angleDegrees = angleRadians * (180 / Math.PI);

	// Add 90-degree offset to match Three.js coordinate system
	angleDegrees += 90;

	// Normalize to 0-360 range
	return angleDegrees < 0 ? angleDegrees + 360 : angleDegrees % 360;
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
 * Uses the same coordinate transformation as OctahedronMarkers
 * @param cameraRotation - Current camera rotation in degrees (0-360)
 * @param selectedLandmarks - Array of selected landmark keys
 * @param coordMap - Coordinate mapping configuration (same as OctahedronMarkers)
 * @param scale - Scale factors for x and z
 * @param yawRad - Yaw rotation in radians
 * @returns Array of landmark angle information
 */
export function getLandmarkAngles(
	cameraRotation: number,
	selectedLandmarks: string[] = [],
	coordMap: CoordMap = {},
	scale: { sx: number; sz: number } = { sx: 1, sz: 1 },
	yawRad: number = 0,
): LandmarkAngleInfo[] {
	const landmarks = landmarkData as Record<string, LandmarkEntry>;

	return Object.entries(landmarks).map(([key, landmark]) => {
		const absoluteAngle = calculateLandmarkAngle(
			landmark,
			coordMap,
			scale,
			yawRad,
		);
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
