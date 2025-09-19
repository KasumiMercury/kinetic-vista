import { LandmarkPanel } from "./components/LandmarkPanel";
import { OptionPanel } from "./components/OptionPanel";
import LandmarkDirectionFullScreen from "./components/LandmarkDirectionFullScreen";
import { useMediaQuery } from "./hooks/useMediaQuery";
import { useNavigationState } from "./hooks/useNavigationState";

export type SimpleNavigationAppProps = {
	onBack?: () => void;
};

export function SimpleNavigationApp({ onBack }: SimpleNavigationAppProps) {
	const {
		rotation,
		setRotation,
		useCameraControls,
		setUseCameraControls,
		useManualRotation,
		setUseManualRotation,
		selectedLandmarks,
		handleLandmarkChange,
		sensorInfo,
		requestPermission,
		smoothRotation,
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
	const effectiveRotation = useManualRotation ? rotation : smoothRotation;

	return (
		<div className="relative h-screen w-screen overflow-hidden bg-neutral-950 text-white">
			{onBack && (
				<button
					type="button"
					onClick={onBack}
					className="fixed left-4 top-4 z-[12000] rounded-md bg-black/70 px-3 py-1.5 text-sm text-white shadow hover:bg-black/80 transition-colors"
				>
					戻る
				</button>
			)}

			<LandmarkDirectionFullScreen
				cameraRotation={effectiveRotation}
				selectedLandmarks={displaySelectedKeys}
				mySelectedKeys={selectedLandmarks}
				color={color}
				colorsByKey={colorsByKey}
				coordMap={{ xKey: "x", zKey: "y", invertZ: true }}
				interactive={!useCameraControls}
				onRotationChange={setRotation}
			/>

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
						await requestPermission();
						setUseManualRotation(false);
					} else {
						setUseCameraControls(false);
						setUseManualRotation(true);
					}
				}}
			/>

			<LandmarkPanel
				selectedKeys={selectedLandmarks}
				onChange={handleLandmarkChange}
				color={color}
				remoteColorsByKey={colorsByKey}
			/>
		</div>
	);
}

export default SimpleNavigationApp;
