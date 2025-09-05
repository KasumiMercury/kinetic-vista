import { useMemo } from "react";
import { getLandmarkAngles, type CoordMap } from "../utils/landmarkAngles";

type LandmarkDirectionPanelProps = {
	cameraRotation: number;
	selectedLandmarks: string[];
	coordMap?: CoordMap;
	scale?: { sx: number; sz: number };
	yawRad?: number;
};

const PANEL_HEIGHT = 60;
const MARKER_SIZE_NORMAL = 8;
const MARKER_SIZE_SELECTED = Math.round(MARKER_SIZE_NORMAL * 1.2);
const MARKER_COLOR = "#ff3366";
const VIEW_ANGLE_RANGE = 90; // 左右90度ずつ（計180度）の範囲を表示

export function LandmarkDirectionPanel({
	cameraRotation,
	selectedLandmarks,
	coordMap = {},
	scale = { sx: 1, sz: 1 },
	yawRad = 0,
}: LandmarkDirectionPanelProps) {
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

	// 表示範囲内のlandmarkのみフィルタリングし、位置を計算
	const visibleLandmarks = useMemo(() => {
		return landmarkAngles
			.filter(
				(landmark) => Math.abs(landmark.relativeAngle) <= VIEW_ANGLE_RANGE,
			)
			.map((landmark) => ({
				...landmark,
				// 相対角度（-90〜90）を位置パーセント（0〜100）に変換
				positionPercent:
					((landmark.relativeAngle + VIEW_ANGLE_RANGE) /
						(VIEW_ANGLE_RANGE * 2)) *
					100,
			}));
	}, [landmarkAngles]);

	// 最も近いlandmarkを計算（選択されているものがない場合のみ）
	const nearestLandmark = useMemo(() => {
		if (selectedLandmarks.length > 0) return null;
		
		return visibleLandmarks.reduce((nearest, current) => {
			if (!nearest) return current;
			return Math.abs(current.relativeAngle) < Math.abs(nearest.relativeAngle) 
				? current 
				: nearest;
		}, null as typeof visibleLandmarks[0] | null);
	}, [visibleLandmarks, selectedLandmarks]);

	return (
		<div className="fixed left-1/2 top-0 z-50 w-full max-w-[800px] -translate-x-1/2 px-4">
			<div
				className="relative h-[60px] rounded-b-lg border border-gray-300 bg-white shadow"
				style={{ height: `${PANEL_HEIGHT}px` }}
			>
				{/* カメラ方向の中央線 */}
				<div className="absolute left-1/2 top-0 h-full w-[2px] -translate-x-1/2 bg-neutral-800" />

				{/* Landmarkマーカー */}
				{visibleLandmarks.map((landmark) => (
					<div
						key={landmark.key}
						className={`absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full ${
							landmark.isSelected
								? "border-2 border-pink-300 bg-pink-600 shadow-[0_0_8px_rgba(255,51,102,0.5)]"
								: "border border-black bg-transparent shadow-[0_1px_3px_rgba(0,0,0,0.2)]"
						}`}
						style={{
							left: `${landmark.positionPercent}%`,
							width: `${landmark.isSelected ? MARKER_SIZE_SELECTED : MARKER_SIZE_NORMAL}px`,
							height: `${landmark.isSelected ? MARKER_SIZE_SELECTED : MARKER_SIZE_NORMAL}px`,
							backgroundColor: landmark.isSelected
								? MARKER_COLOR
								: "transparent",
							cursor: "pointer",
						}}
						title={`${landmark.displayJP} (${Math.round(landmark.relativeAngle)}°)`}
					>
						{/* 選択中landmarkまたは最も近いlandmarkの名前表示 */}
						{(landmark.isSelected || 
						  (nearestLandmark && landmark.key === nearestLandmark.key)) && (
							<div className="absolute left-1/2 top-full -translate-x-1/2 whitespace-nowrap text-base font-medium text-neutral-800 [text-shadow:0_1px_2px_rgba(255,255,255,0.8)]">
								{landmark.displayJP}
							</div>
						)}
					</div>
				))}
			</div>
		</div>
	);
}
