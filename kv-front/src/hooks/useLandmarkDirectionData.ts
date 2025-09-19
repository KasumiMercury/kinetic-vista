import { useMemo } from "react";
import { getLandmarkAngles, type CoordMap } from "../utils/landmarkAngles";

type RawLandmarkAngle = ReturnType<typeof getLandmarkAngles>[number];

export type VisibleLandmark = RawLandmarkAngle & {
	positionPercent: number;
};

type UseLandmarkDirectionDataOptions = {
	cameraRotation: number;
	selectedLandmarks: string[];
	mySelectedKeys?: string[];
	coordMap?: CoordMap;
	scale?: { sx: number; sz: number };
	yawRad?: number;
	viewAngleRange?: number;
};

export function useLandmarkDirectionData({
	cameraRotation,
	selectedLandmarks,
	mySelectedKeys = [],
	coordMap = {},
	scale = { sx: 1, sz: 1 },
	yawRad = 0,
	viewAngleRange = 90,
}: UseLandmarkDirectionDataOptions) {
	const landmarkAngles = useMemo(
		() =>
			getLandmarkAngles(
				cameraRotation,
				selectedLandmarks,
				coordMap,
				scale,
				yawRad,
			),
		[cameraRotation, selectedLandmarks, coordMap, scale, yawRad],
	);

	const visibleLandmarks = useMemo<VisibleLandmark[]>(() => {
		return landmarkAngles
			.filter((landmark) => Math.abs(landmark.relativeAngle) <= viewAngleRange)
			.map((landmark) => ({
				...landmark,
				positionPercent:
					((landmark.relativeAngle + viewAngleRange) / (viewAngleRange * 2)) * 100,
			}));
	}, [landmarkAngles, viewAngleRange]);

	const nearestLandmark = useMemo(() => {
		if (mySelectedKeys.length > 0) return null;
		return visibleLandmarks.reduce<VisibleLandmark | null>((nearest, current) => {
			if (!nearest) return current;
			return Math.abs(current.relativeAngle) < Math.abs(nearest.relativeAngle)
				? current
				: nearest;
		}, null);
	}, [visibleLandmarks, mySelectedKeys]);

	const outOfRangeLandmarks = useMemo(() => {
		return landmarkAngles.filter(
			(landmark) =>
				landmark.isSelected &&
				Math.abs(landmark.relativeAngle) > viewAngleRange,
		);
	}, [landmarkAngles, viewAngleRange]);

	const showLeftIndicator = outOfRangeLandmarks.some(
		(landmark) => landmark.relativeAngle < -viewAngleRange,
	);
	const showRightIndicator = outOfRangeLandmarks.some(
		(landmark) => landmark.relativeAngle > viewAngleRange,
	);

	return {
		landmarkAngles,
		visibleLandmarks,
		nearestLandmark,
		outOfRangeLandmarks,
		showLeftIndicator,
		showRightIndicator,
		viewAngleRange,
	};
}
