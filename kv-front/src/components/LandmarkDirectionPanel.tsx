import { useMemo } from "react";
import { getLandmarkAngles } from "../utils/landmarkAngles";

type LandmarkDirectionPanelProps = {
	cameraRotation: number;
	selectedLandmarks: string[];
};

const PANEL_HEIGHT = 60;
const MARKER_SIZE_NORMAL = 8;
const MARKER_SIZE_SELECTED = Math.round(MARKER_SIZE_NORMAL * 1.2);
const MARKER_COLOR = "#ff3366";
const VIEW_ANGLE_RANGE = 90; // 左右90度ずつ（計180度）の範囲を表示

export function LandmarkDirectionPanel({
	cameraRotation,
	selectedLandmarks,
}: LandmarkDirectionPanelProps) {
	const landmarkAngles = useMemo(
		() => getLandmarkAngles(cameraRotation, selectedLandmarks),
		[cameraRotation, selectedLandmarks],
	);

	// 表示範囲内のlandmarkのみフィルタリングし、位置を計算
	const visibleLandmarks = useMemo(() => {
		return landmarkAngles
			.filter((landmark) => Math.abs(landmark.relativeAngle) <= VIEW_ANGLE_RANGE)
			.map((landmark) => ({
				...landmark,
				// 相対角度（-90〜90）を位置パーセント（0〜100）に変換
				positionPercent: ((landmark.relativeAngle + VIEW_ANGLE_RANGE) / (VIEW_ANGLE_RANGE * 2)) * 100,
			}));
	}, [landmarkAngles]);

	return (
		<div
			style={{
				position: "fixed",
				top: 0,
				left: "50%",
				transform: "translateX(-50%)",
				zIndex: 50,
				width: "100%",
				maxWidth: "800px",
				padding: "0 16px",
			}}
		>
			<div
				style={{
					height: `${PANEL_HEIGHT}px`,
					backgroundColor: "white",
					border: "1px solid #ccc",
					borderRadius: "0 0 8px 8px",
					boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
					position: "relative",
				}}
			>
				{/* カメラ方向の中央線 */}
				<div
					style={{
						position: "absolute",
						top: 0,
						left: "50%",
						transform: "translateX(-50%)",
						width: "2px",
						height: "100%",
						backgroundColor: "#333",
					}}
				/>

				{/* カメラ方向のラベル */}
				<div
					style={{
						position: "absolute",
						top: "4px",
						left: "50%",
						transform: "translateX(-50%)",
						fontSize: "12px",
						fontWeight: "600",
						color: "#333",
					}}
				>
					カメラ方向
				</div>

				{/* Landmarkマーカー */}
				{visibleLandmarks.map((landmark) => (
					<div
						key={landmark.key}
						style={{
							position: "absolute",
							top: "50%",
							left: `${landmark.positionPercent}%`,
							transform: "translate(-50%, -50%)",
							width: `${landmark.isSelected ? MARKER_SIZE_SELECTED : MARKER_SIZE_NORMAL}px`,
							height: `${landmark.isSelected ? MARKER_SIZE_SELECTED : MARKER_SIZE_NORMAL}px`,
							backgroundColor: MARKER_COLOR,
							borderRadius: "50%",
							border: landmark.isSelected ? "2px solid rgba(255, 51, 102, 0.3)" : "1px solid rgba(0, 0, 0, 0.1)",
							boxShadow: landmark.isSelected 
								? "0 0 8px rgba(255, 51, 102, 0.5)" 
								: "0 1px 3px rgba(0, 0, 0, 0.2)",
							cursor: "pointer",
						}}
						title={`${landmark.displayJP} (${Math.round(landmark.relativeAngle)}°)`}
					>
						{/* 選択中landmarkの名前表示 */}
						{landmark.isSelected && (
							<div
								style={{
									position: "absolute",
									top: "100%",
									left: "50%",
									transform: "translateX(-50%)",
									marginTop: "2px",
									fontSize: "10px",
									fontWeight: "500",
									color: "#333",
									whiteSpace: "nowrap",
									textShadow: "0 1px 2px rgba(255, 255, 255, 0.8)",
								}}
							>
								{landmark.displayJP}
							</div>
						)}
					</div>
				))}

				{/* 左右の角度表示 */}
				<div
					style={{
						position: "absolute",
						top: "50%",
						left: "8px",
						transform: "translateY(-50%)",
						fontSize: "10px",
						color: "#666",
					}}
				>
					左{VIEW_ANGLE_RANGE}°
				</div>
				<div
					style={{
						position: "absolute",
						top: "50%",
						right: "8px",
						transform: "translateY(-50%)",
						fontSize: "10px",
						color: "#666",
					}}
				>
					右{VIEW_ANGLE_RANGE}°
				</div>
			</div>
		</div>
	);
}