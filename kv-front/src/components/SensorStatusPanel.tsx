import type { SensorInfo } from "../hooks/useOrientationSensor";

interface SensorStatusPanelProps {
	sensorInfo: SensorInfo;
}

export function SensorStatusPanel({ sensorInfo }: SensorStatusPanelProps) {
	return (
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
	);
}
