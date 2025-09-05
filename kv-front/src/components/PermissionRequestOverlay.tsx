interface PermissionRequestOverlayProps {
	sensorTypeLabel: string;
	onRequestPermission: () => void | Promise<void>;
}

export function PermissionRequestOverlay({
	sensorTypeLabel,
	onRequestPermission,
}: PermissionRequestOverlayProps) {
	return (
		<div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/80">
			<div className="max-w-[400px] rounded-xl bg-white p-8 text-center text-black shadow-xl">
				<h2 className="mt-0 text-xl font-semibold">Enable Orientation Sensing</h2>
				<p className="mt-2 text-sm text-gray-700">
					This app uses device orientation to control the camera direction.
					Please grant permission to access motion sensors.
				</p>
				<p className="mt-3 text-[14px] text-gray-500">Sensor Type: {sensorTypeLabel}</p>
				<button
					type="button"
					onClick={onRequestPermission}
					className="mt-5 inline-flex cursor-pointer items-center rounded-md bg-blue-600 px-6 py-3 text-[16px] font-medium text-white hover:bg-blue-700"
				>
					Enable Sensors
				</button>
			</div>
		</div>
	);
}
