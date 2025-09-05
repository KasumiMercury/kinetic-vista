import type { SensorInfo } from "../hooks/useOrientationSensor";

interface SensorStatusPanelProps {
	sensorInfo: SensorInfo;
}

export function SensorStatusPanel({ sensorInfo }: SensorStatusPanelProps) {
	return (
		<div className="absolute bottom-5 right-5 z-[100] min-w-[200px] rounded-md bg-black/70 p-3 text-[12px] text-white">
			<div className="mb-1.5 font-bold">
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
			{sensorInfo.sensorType === "absolute-orientation" && sensorInfo.quaternion && (
					<div className="mt-1.5">
						<div>Quaternion:</div>
						<div>X: {sensorInfo.quaternion[0].toFixed(3)}</div>
						<div>Y: {sensorInfo.quaternion[1].toFixed(3)}</div>
						<div>Z: {sensorInfo.quaternion[2].toFixed(3)}</div>
						<div>W: {sensorInfo.quaternion[3].toFixed(3)}</div>
					</div>
				)}
			{sensorInfo.sensorType === "device-orientation" && (
				<div className="mt-1.5">
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
	);
}
