import { useMemo } from "react";
import { getLandmarkAngles, type CoordMap } from "../utils/landmarkAngles";
import { hexToRgba, lightenHex } from "../utils/userColor";

type LandmarkDirectionPanelProps = {
    cameraRotation: number;
    selectedLandmarks: string[];
    mySelectedKeys?: string[];
    coordMap?: CoordMap;
    scale?: { sx: number; sz: number };
    yawRad?: number;
    color?: string;
    colorsByKey?: Record<string, string>;
};

const PANEL_HEIGHT = 60;
const MARKER_SIZE_NORMAL = 8;
const MARKER_SIZE_SELECTED = Math.round(MARKER_SIZE_NORMAL * 1.2);
const DEFAULT_COLOR = "#ff3366";
const VIEW_ANGLE_RANGE = 90; // 左右90度ずつ（計180度）の範囲を表示

export function LandmarkDirectionPanel({
    cameraRotation,
    selectedLandmarks,
    mySelectedKeys = [],
    coordMap = {},
    scale = { sx: 1, sz: 1 },
    yawRad = 0,
    color,
    colorsByKey,
}: LandmarkDirectionPanelProps) {
    const markerColor = color ?? DEFAULT_COLOR;
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

	// 表示範囲外の選択中landmarkを検出
	const outOfRangeLandmarks = useMemo(() => {
		return landmarkAngles.filter(
			(landmark) => landmark.isSelected && Math.abs(landmark.relativeAngle) > VIEW_ANGLE_RANGE
		);
	}, [landmarkAngles]);

	// 左端・右端インジケーター表示判定
	const showLeftIndicator = outOfRangeLandmarks.some(
		(landmark) => landmark.relativeAngle < -VIEW_ANGLE_RANGE
	);
	const showRightIndicator = outOfRangeLandmarks.some(
		(landmark) => landmark.relativeAngle > VIEW_ANGLE_RANGE
	);

	return (
		<div className="fixed left-1/2 top-0 z-50 w-full max-w-[800px] -translate-x-1/2 px-4">
			<div
				className="relative h-[60px] rounded-b-lg border border-gray-300 bg-white shadow"
				style={{ height: `${PANEL_HEIGHT}px` }}
			>
				{/* カメラ方向の中央線 */}
				<div className="absolute left-1/2 top-0 h-full w-[2px] -translate-x-1/2 bg-neutral-800" />

				{/* 左端方向インジケーター */}
                {showLeftIndicator && (
                    <div 
                        className="absolute left-0 top-0 h-full w-1 rounded-bl-lg"
                        style={{ backgroundColor: markerColor, boxShadow: `0 0 8px ${hexToRgba(markerColor, 0.5)}` }}
                    />
                )}

				{/* 右端方向インジケーター */}
                {showRightIndicator && (
                    <div 
                        className="absolute right-0 top-0 h-full w-1 rounded-br-lg"
                        style={{ backgroundColor: markerColor, boxShadow: `0 0 8px ${hexToRgba(markerColor, 0.5)}` }}
                    />
                )}

				{/* Landmarkマーカー */}
                {visibleLandmarks.map((landmark) => {
                    const key = landmark.key;
                    const isMine = mySelectedKeys.includes(key);
                    const c = colorsByKey?.[key] ?? markerColor;
                    return (
                    <div
                        key={key}
                        className={`absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full ${
                            landmark.isSelected
                                ? "border-2"
                                : "border bg-transparent shadow-[0_1px_3px_rgba(0,0,0,0.2)]"
                        }`}
                        style={{
                            left: `${landmark.positionPercent}%`,
                            width: `${landmark.isSelected ? MARKER_SIZE_SELECTED : MARKER_SIZE_NORMAL}px`,
                            height: `${landmark.isSelected ? MARKER_SIZE_SELECTED : MARKER_SIZE_NORMAL}px`,
                            backgroundColor: landmark.isSelected ? (isMine ? c : "transparent") : "transparent",
                            borderColor: landmark.isSelected ? c : "black",
                            boxShadow: landmark.isSelected ? `0 0 8px ${hexToRgba(c, 0.45)}` : undefined,
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
                )})}
            </div>
        </div>
    );
}
