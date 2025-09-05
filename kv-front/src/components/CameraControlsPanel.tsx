import { useId } from "react";

interface CameraControlsPanelProps {
	useCameraControls: boolean;
	onUseCameraControlsChange: (value: boolean) => void;
	useManualRotation: boolean;
	onUseManualRotationChange: (value: boolean) => void;
	rotation: number;
	onRotationChange: (value: number) => void;
	smoothRotation: number;
	timeOverride: number | null;
	onTimeOverrideChange: (value: number | null) => void;
	currentHour: number;
	isSensorActive: boolean;
}

export function CameraControlsPanel({
	useCameraControls,
	onUseCameraControlsChange,
	useManualRotation,
	onUseManualRotationChange,
	rotation,
	onRotationChange,
	smoothRotation,
	timeOverride,
	onTimeOverrideChange,
	currentHour,
	isSensorActive,
}: CameraControlsPanelProps) {
	const sliderId = useId();
	const timeId = useId();

	return (
		<div className="absolute left-5 top-5 z-[100] rounded-md bg-black/50 p-3 text-white">
			<label>
				<input
					type="checkbox"
					checked={useCameraControls}
					onChange={(e) => onUseCameraControlsChange(e.target.checked)}
				/>
				Use CameraControls (with slider)
			</label>
			<br />
			<br />
			<label>
				<input
					type="checkbox"
					checked={useManualRotation}
					onChange={(e) => onUseManualRotationChange(e.target.checked)}
				/>
				Manual Rotation Control
			</label>
			<br />
			<label htmlFor={sliderId}>
				Camera Rotation: {Math.round(smoothRotation)}°{" "}
				{isSensorActive ? "(Sensor)" : "(Manual)"}
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
				onChange={(e) => onRotationChange(parseFloat(e.target.value))}
				className={`w-[200px] ${useManualRotation ? "opacity-100" : "opacity-50"}`}
			/>
			<br />
			<br />
			<label>
				<input
					type="checkbox"
					checked={timeOverride !== null}
					onChange={(e) => onTimeOverrideChange(e.target.checked ? 16 : null)}
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
				onChange={(e) => onTimeOverrideChange(parseInt(e.target.value, 10))}
				className="w-[200px]"
			/>
		</div>
	);
}
