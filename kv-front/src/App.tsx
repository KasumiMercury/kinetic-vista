import "./App.css";
import { Canvas } from "@react-three/fiber";
import { useState, useEffect, lazy, Suspense } from "react";
import { Scene } from "./Scene.tsx";
import { useOrientationSensor } from "./hooks/useOrientationSensor";
import { useSmoothRotation } from "./hooks/useSmoothRotation";
import { LandmarkPanel } from "./components/LandmarkPanel";
import { PermissionRequestOverlay } from "./components/PermissionRequestOverlay";
import { PermissionDeniedOverlay } from "./components/PermissionDeniedOverlay";
import { useDebug } from "./hooks/useDebug";
import { ControlModeToggle } from "./components/ControlModeToggle";

// Lazy-load debug-only panels so they are not bundled unless needed
const CameraControlsPanel = lazy(() =>
	import("./components/CameraControlsPanel").then((m) => ({
		default: m.CameraControlsPanel,
	})),
);
const SensorStatusPanel = lazy(() =>
	import("./components/SensorStatusPanel").then((m) => ({
		default: m.SensorStatusPanel,
	})),
);

function App() {
	const [rotation, setRotation] = useState(0); // 度数で管理 (0-360°)
	const [useCameraControls, setUseCameraControls] = useState(true);
	const [timeOverride, setTimeOverride] = useState<number | null>(null); // 時刻オーバーライド (0-23時間)
	const [useManualRotation, setUseManualRotation] = useState(false); // 手動制御モード
	const [selectedLandmarks, setSelectedLandmarks] = useState<string[]>([]); // 複数選択

	// Debug flag (enabled via ?debug, #debug, or localStorage)
	const debug = useDebug();

	// 現在時刻を取得
	const currentHour = new Date().getHours();

	// センサー機能
	const [sensorInfo, requestPermission] = useOrientationSensor();

	// 端末種別でデフォルト操作を切り替え（PC: ドラッグ / スマホ: センサー）
	useEffect(() => {
		const ua = navigator.userAgent.toLowerCase();
		const isMobile = /iphone|ipod|ipad|android/.test(ua);
		setUseCameraControls(isMobile); // true: センサー, false: ドラッグ
		// ドラッグ時は手動スライダーは使わない方針のため false に揃える
		setUseManualRotation(false);
	}, []);

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
			{debug && (
				<Suspense>
					<CameraControlsPanel
						useCameraControls={useCameraControls}
						onUseCameraControlsChange={setUseCameraControls}
						useManualRotation={useManualRotation}
						onUseManualRotationChange={setUseManualRotation}
						rotation={rotation}
						onRotationChange={setRotation}
						smoothRotation={smoothRotation}
						timeOverride={timeOverride}
						onTimeOverrideChange={setTimeOverride}
						currentHour={currentHour}
						isSensorActive={
							!useManualRotation && sensorInfo.compassHeading !== null
						}
					/>
				</Suspense>
			)}

			{debug && (
				<Suspense>
					<SensorStatusPanel sensorInfo={sensorInfo} />
				</Suspense>
			)}

			{/* 操作モード切替（画面右上・最前面） */}
			<ControlModeToggle
				mode={useCameraControls ? "sensor" : "drag"}
				permissionState={sensorInfo.permissionState}
				onChange={async (mode) => {
					if (mode === "sensor") {
						setUseCameraControls(true);
						// センサー有効化時に必要権限を取得
						await requestPermission();
						setUseManualRotation(false);
					} else {
						setUseCameraControls(false);
						setUseManualRotation(true);
					}
				}}
			/>

			{/* 権限取得ボタン（画面中央・最前面） */}
			{useCameraControls &&
				sensorInfo.permissionState === "needs-permission" && (
					<PermissionRequestOverlay
						sensorTypeLabel={
							sensorInfo.sensorType === "absolute-orientation"
								? "AbsoluteOrientationSensor"
								: "DeviceOrientationEvent"
						}
						onRequestPermission={requestPermission}
					/>
				)}

			{useCameraControls && sensorInfo.permissionState === "denied" && (
				<PermissionDeniedOverlay
					onTryAgain={requestPermission}
					onUseManualControl={() => setUseManualRotation(true)}
				/>
			)}

			{/* Landmark 選択パネル（左下・最前面） */}
			<LandmarkPanel
				selectedKeys={selectedLandmarks}
				onChange={setSelectedLandmarks}
			/>

			<Canvas shadows>
				<Scene
					rotation={useManualRotation ? rotation : smoothRotation}
					useCameraControls={useCameraControls}
					onRotationChange={setRotation}
					timeOverride={timeOverride}
					selectedLandmarks={selectedLandmarks}
				/>
			</Canvas>
		</div>
	);
}

export default App;
