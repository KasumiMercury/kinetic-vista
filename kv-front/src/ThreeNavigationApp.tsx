import { Canvas } from "@react-three/fiber";
import { lazy, Suspense } from "react";
import { Scene } from "./Scene.tsx";
import { LandmarkPanel } from "./components/LandmarkPanel";
import { PermissionRequestOverlay } from "./components/PermissionRequestOverlay";
import { PermissionDeniedOverlay } from "./components/PermissionDeniedOverlay";
import { OptionPanel } from "./components/OptionPanel";
import { LandmarkDirectionPanel } from "./components/LandmarkDirectionPanel";
import { useMediaQuery } from "./hooks/useMediaQuery";
import { useNavigationState } from "./hooks/useNavigationState";

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

type ThreeNavigationAppProps = {
	onBack?: () => void;
};

function ThreeNavigationApp({ onBack }: ThreeNavigationAppProps) {
	const {
		rotation,
		setRotation,
		useCameraControls,
		setUseCameraControls,
		timeOverride,
		setTimeOverride,
		useManualRotation,
		setUseManualRotation,
		selectedLandmarks,
		handleLandmarkChange,
		sensorInfo,
		requestPermission,
		smoothRotation,
		debug,
		currentHour,
		color,
		displaySelectedKeys,
		colorsByKey,
		calibrationOffset,
		calibratedLandmarkKey,
		calibrationTimestamp,
		calibrateWithLandmark,
		resetCalibration,
	} = useNavigationState();
	const isCompactLayout = useMediaQuery("(max-width: 768px)");

	return (
		<div className="relative w-screen h-screen">
			{onBack && (
				<button
					type="button"
					onClick={onBack}
					className="fixed left-4 top-4 z-[12000] rounded-md bg-black/70 px-3 py-1.5 text-sm text-white shadow hover:bg-black/80 transition-colors"
				>
					戻る
				</button>
			)}
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

			{/* オプション設定パネル（通常は右下、狭い画面では上部右側） */}
			<OptionPanel
				isCompact={isCompactLayout}
				mode={useCameraControls ? "sensor" : "drag"}
				permissionState={sensorInfo.permissionState}
				selectedLandmarkKey={selectedLandmarks[0] ?? null}
				onCalibrate={calibrateWithLandmark}
				calibrationOffset={calibrationOffset}
				calibratedLandmarkKey={calibratedLandmarkKey}
				calibrationTimestamp={calibrationTimestamp}
				onResetCalibration={resetCalibration}
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

			{/* Landmark方向表示パネル（画面上部・最前面） */}
			<LandmarkDirectionPanel
				cameraRotation={useManualRotation ? rotation : smoothRotation}
				selectedLandmarks={displaySelectedKeys}
				mySelectedKeys={selectedLandmarks}
				color={color}
				colorsByKey={colorsByKey}
				coordMap={{ xKey: "x", zKey: "y", invertZ: true }}
			/>

			{/* Landmark 選択パネル（左下・最前面） */}
			<LandmarkPanel
				selectedKeys={selectedLandmarks}
				onChange={handleLandmarkChange}
				color={color}
				remoteColorsByKey={colorsByKey}
			/>

			<Canvas shadows>
				<Scene
					rotation={useManualRotation ? rotation : smoothRotation}
					useCameraControls={useCameraControls}
					onRotationChange={setRotation}
					timeOverride={timeOverride}
					selectedLandmarks={displaySelectedKeys}
					markerColor={color}
					colorsByKey={colorsByKey}
				/>
			</Canvas>
		</div>
	);
}

export default ThreeNavigationApp;
