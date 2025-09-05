interface PermissionDeniedOverlayProps {
	onTryAgain: () => void | Promise<void>;
	onUseManualControl: () => void;
}

export function PermissionDeniedOverlay({
	onTryAgain,
	onUseManualControl,
}: PermissionDeniedOverlayProps) {
	return (
		<div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/80">
			<div className="max-w-[400px] rounded-xl bg-white p-8 text-center text-black shadow-xl">
				<h2 className="mt-0 text-xl font-semibold text-red-600">
					Permission Denied
				</h2>
				<p className="mt-2">
					Motion sensor access was denied. You can still use manual rotation
					controls.
				</p>
				<div className="mt-5 flex items-center justify-center gap-3">
					<button
						type="button"
						onClick={onTryAgain}
						className="inline-flex cursor-pointer items-center rounded-md bg-red-600 px-6 py-3 text-[16px] font-medium text-white hover:bg-red-700"
					>
						Try Again
					</button>
					<button
						type="button"
						onClick={onUseManualControl}
						className="inline-flex cursor-pointer items-center rounded-md bg-gray-600 px-6 py-3 text-[16px] font-medium text-white hover:bg-gray-700"
					>
						Use Manual Control
					</button>
				</div>
			</div>
		</div>
	);
}
