import "./App.css";
import { Canvas } from "@react-three/fiber";
import { useId, useState, useEffect } from "react";
import { Scene } from "./Scene.tsx";
import { useOrientationSensor } from "./hooks/useOrientationSensor";
import { useSmoothRotation } from "./hooks/useSmoothRotation";

function App() {
	const [rotation, setRotation] = useState(0); // 度数で管理 (0-360°)
	const [useCameraControls, setUseCameraControls] = useState(true);
	const [timeOverride, setTimeOverride] = useState<number | null>(null); // 時刻オーバーライド (0-23時間)
	const [useManualRotation, setUseManualRotation] = useState(false); // 手動制御モード
	const sliderId = useId();
	const timeId = useId();

	// 現在時刻を取得
	const currentHour = new Date().getHours();

	// センサー機能
	const [sensorInfo, requestPermission] = useOrientationSensor();

	// センサー値をrotationに反映
	useEffect(() => {
		if (
			!useManualRotation &&
			sensorInfo.compassHeading !== null &&
			sensorInfo.permissionState === "granted"
		) {
			setRotation(sensorInfo.compassHeading);
		}
	}, [
		sensorInfo.compassHeading,
		useManualRotation,
		sensorInfo.permissionState,
	]);

	// 滑らかな補間を適用
	const smoothRotation = useSmoothRotation(rotation, {
		interpolationSpeed: 0.15, // 少し早めの補間速度
		threshold: 0.05, // 小さな変化も検出
	});

	return (
		<div style={{ width: "100vw", height: "100vh" }}>
			{/* Camera Controls */}
			<div
				style={{
					position: "absolute",
					top: "20px",
					left: "20px",
					zIndex: 100,
					color: "white",
					background: "rgba(0, 0, 0, 0.5)",
					padding: "10px",
					borderRadius: "5px",
				}}
			>
				<label>
					<input
						type="checkbox"
						checked={useCameraControls}
						onChange={(e) => setUseCameraControls(e.target.checked)}
					/>
					Use CameraControls (with slider)
				</label>
				<br />
				<br />
				<label>
					<input
						type="checkbox"
						checked={useManualRotation}
						onChange={(e) => setUseManualRotation(e.target.checked)}
					/>
					Manual Rotation Control
				</label>
				<br />
				<label htmlFor={sliderId}>
					Camera Rotation: {Math.round(smoothRotation)}°{" "}
					{!useManualRotation && sensorInfo.compassHeading !== null
						? "(Sensor)"
						: "(Manual)"}
				</label>
				<br />
				<input
					id={sliderId}
					type="range"
					min={0}
					max={360}
					step={10}
					value={rotation}
					disabled={!useManualRotation}
					onChange={(e) => setRotation(parseFloat(e.target.value))}
					style={{ width: "200px", opacity: useManualRotation ? 1 : 0.5 }}
				/>
				<br />
				<br />
				<label>
					<input
						type="checkbox"
						checked={timeOverride !== null}
						onChange={(e) => setTimeOverride(e.target.checked ? 16 : null)}
					/>
					Override Time (Debug)
				</label>
				<br />
				<label htmlFor={timeId}>
					Time:{" "}
					{timeOverride !== null
						? `${timeOverride}:00`
						: `${currentHour}:00 (Real-time)`}
				</label>
				<br />
				<input
					id={timeId}
					type="range"
					min={0}
					max={23}
					step={1}
					value={timeOverride ?? currentHour}
					disabled={timeOverride === null}
					onChange={(e) => setTimeOverride(parseInt(e.target.value, 10))}
					style={{ width: "200px" }}
				/>
			</div>

			{/* センサー情報表示UI（右下） */}
			<div
				style={{
					position: "absolute",
					bottom: "20px",
					right: "20px",
					zIndex: 100,
					color: "white",
					background: "rgba(0, 0, 0, 0.7)",
					padding: "10px",
					borderRadius: "5px",
					fontSize: "12px",
					minWidth: "200px",
				}}
			>
				<div style={{ fontWeight: "bold", marginBottom: "5px" }}>
					Sensor Status
				</div>
				<div>
					API:{" "}
					{sensorInfo.sensorType === "absolute-orientation"
						? "AbsoluteOrientationSensor"
						: sensorInfo.sensorType === "device-orientation"
							? "DeviceOrientationEvent"
							: "Unsupported"}
				</div>
				<div>Status: {sensorInfo.permissionState}</div>
				<div>
					Heading:{" "}
					{sensorInfo.compassHeading !== null
						? `${sensorInfo.compassHeading}°`
						: "N/A"}
				</div>
				<div>Listening: {sensorInfo.isListening ? "Yes" : "No"}</div>
				{sensorInfo.sensorType === "absolute-orientation" &&
					sensorInfo.quaternion && (
						<div style={{ marginTop: "5px" }}>
							<div>Quaternion:</div>
							<div>X: {sensorInfo.quaternion[0].toFixed(3)}</div>
							<div>Y: {sensorInfo.quaternion[1].toFixed(3)}</div>
							<div>Z: {sensorInfo.quaternion[2].toFixed(3)}</div>
							<div>W: {sensorInfo.quaternion[3].toFixed(3)}</div>
						</div>
					)}
				{sensorInfo.sensorType === "device-orientation" && (
					<div style={{ marginTop: "5px" }}>
						<div>Orientation:</div>
						<div>
							α:{" "}
							{sensorInfo.orientation.alpha !== null
								? `${sensorInfo.orientation.alpha.toFixed(1)}°`
								: "N/A"}
						</div>
						<div>
							β:{" "}
							{sensorInfo.orientation.beta !== null
								? `${sensorInfo.orientation.beta.toFixed(1)}°`
								: "N/A"}
						</div>
						<div>
							γ:{" "}
							{sensorInfo.orientation.gamma !== null
								? `${sensorInfo.orientation.gamma.toFixed(1)}°`
								: "N/A"}
						</div>
					</div>
				)}
			</div>

			{/* 権限取得ボタン（画面中央・最前面） */}
			{sensorInfo.permissionState === "needs-permission" && (
				<div
					style={{
						position: "fixed",
						top: 0,
						left: 0,
						width: "100vw",
						height: "100vh",
						backgroundColor: "rgba(0, 0, 0, 0.8)",
						zIndex: 1000,
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
					}}
				>
					<div
						style={{
							background: "white",
							padding: "30px",
							borderRadius: "10px",
							textAlign: "center",
							color: "black",
							maxWidth: "400px",
						}}
					>
						<h2 style={{ marginTop: 0 }}>Enable Orientation Sensing</h2>
						<p>
							This app uses device orientation to control the camera direction.
							Please grant permission to access motion sensors.
						</p>
						<p style={{ fontSize: "14px", color: "#666" }}>
							Sensor Type:{" "}
							{sensorInfo.sensorType === "absolute-orientation"
								? "AbsoluteOrientationSensor"
								: "DeviceOrientationEvent"}
						</p>
						<button
							type="button"
							onClick={requestPermission}
							style={{
								padding: "12px 24px",
								backgroundColor: "#007bff",
								color: "white",
								border: "none",
								borderRadius: "5px",
								fontSize: "16px",
								cursor: "pointer",
							}}
						>
							Enable Sensors
						</button>
					</div>
				</div>
			)}

			{sensorInfo.permissionState === "denied" && (
				<div
					style={{
						position: "fixed",
						top: 0,
						left: 0,
						width: "100vw",
						height: "100vh",
						backgroundColor: "rgba(0, 0, 0, 0.8)",
						zIndex: 1000,
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
					}}
				>
					<div
						style={{
							background: "white",
							padding: "30px",
							borderRadius: "10px",
							textAlign: "center",
							color: "black",
							maxWidth: "400px",
						}}
					>
						<h2 style={{ marginTop: 0, color: "#dc3545" }}>
							Permission Denied
						</h2>
						<p>
							Motion sensor access was denied. You can still use manual rotation
							controls.
						</p>
						<button
							type="button"
							onClick={requestPermission}
							style={{
								padding: "12px 24px",
								backgroundColor: "#dc3545",
								color: "white",
								border: "none",
								borderRadius: "5px",
								fontSize: "16px",
								cursor: "pointer",
								marginRight: "10px",
							}}
						>
							Try Again
						</button>
						<button
							type="button"
							onClick={() => setUseManualRotation(true)}
							style={{
								padding: "12px 24px",
								backgroundColor: "#6c757d",
								color: "white",
								border: "none",
								borderRadius: "5px",
								fontSize: "16px",
								cursor: "pointer",
							}}
						>
							Use Manual Control
						</button>
					</div>
				</div>
			)}

			<Canvas shadows>
				<Scene
					rotation={useManualRotation ? rotation : smoothRotation}
					useCameraControls={useCameraControls}
					timeOverride={timeOverride}
				/>
			</Canvas>
		</div>
	);
}

export default App;
