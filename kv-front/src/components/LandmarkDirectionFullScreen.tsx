import {
	useCallback,
	useMemo,
	useRef,
	useState,
	type PointerEvent as ReactPointerEvent,
} from "react";
import { useLandmarkDirection } from "../hooks/useLandmarkDirection";
import type { CoordMap } from "../utils/landmarkAngles";
import { hexToRgba } from "../utils/userColor";

const DEFAULT_COLOR = "#ff3366";
const MARKER_SIZE_NORMAL = 10;
const MARKER_SIZE_SELECTED = Math.round(MARKER_SIZE_NORMAL * 1.3);
const CARDINALS = [
	{ short: "N", label: "北" },
	{ short: "NE", label: "北東" },
	{ short: "E", label: "東" },
	{ short: "SE", label: "南東" },
	{ short: "S", label: "南" },
	{ short: "SW", label: "南西" },
	{ short: "W", label: "西" },
	{ short: "NW", label: "北西" },
];

const normalizeDegrees = (deg: number) => {
	let value = deg % 360;
	if (value < 0) value += 360;
	return value;
};

export type LandmarkDirectionFullScreenProps = {
	cameraRotation: number;
	selectedLandmarks: string[];
	mySelectedKeys?: string[];
	coordMap?: CoordMap;
	scale?: { sx: number; sz: number };
	yawRad?: number;
	color?: string;
	colorsByKey?: Record<string, string>;
	interactive?: boolean;
	onRotationChange?: (next: number) => void;
};

export function LandmarkDirectionFullScreen({
	cameraRotation,
	selectedLandmarks,
	mySelectedKeys = [],
	coordMap = {},
	scale = { sx: 1, sz: 1 },
	yawRad = 0,
	color,
	colorsByKey,
	interactive = false,
	onRotationChange,
}: LandmarkDirectionFullScreenProps) {
	const markerColor = color ?? DEFAULT_COLOR;
	const {
		visibleLandmarks,
		nearestLandmark,
		showLeftIndicator,
		showRightIndicator,
	} = useLandmarkDirection({
		cameraRotation,
		selectedLandmarks,
		mySelectedKeys,
		coordMap,
		scale,
		yawRad,
	});

	const headingDegrees = normalizeDegrees(cameraRotation);
	const headingInfo = useMemo(() => {
		const index = Math.round(headingDegrees / 45) % CARDINALS.length;
		return CARDINALS[index];
	}, [headingDegrees]);

	const containerRef = useRef<HTMLDivElement | null>(null);
	const dragState = useRef<{ startX: number; startRotation: number } | null>(
		null,
	);
	const [isDragging, setIsDragging] = useState(false);

	const handlePointerDown = useCallback(
		(event: ReactPointerEvent<HTMLDivElement>) => {
			if (!interactive || !onRotationChange || !containerRef.current) return;
			event.preventDefault();
			containerRef.current.setPointerCapture(event.pointerId);
			dragState.current = {
				startX: event.clientX,
				startRotation: cameraRotation,
			};
			setIsDragging(true);
		},
		[cameraRotation, interactive, onRotationChange],
	);

	const handlePointerMove = useCallback(
		(event: ReactPointerEvent<HTMLDivElement>) => {
			if (!interactive || !onRotationChange || !dragState.current) return;
			const dx = event.clientX - dragState.current.startX;
			const sensitivity = 0.25;
			const next = normalizeDegrees(
				dragState.current.startRotation - dx * sensitivity,
			);
			onRotationChange(next);
		},
		[interactive, onRotationChange],
	);

	const handlePointerUp = useCallback(
		(event: ReactPointerEvent<HTMLDivElement>) => {
			if (!interactive || !containerRef.current) return;
			try {
				containerRef.current.releasePointerCapture(event.pointerId);
			} catch (releaseError) {
				void releaseError;
			}
			dragState.current = null;
			setIsDragging(false);
		},
		[interactive],
	);

	return (
		<div className="absolute inset-0 flex flex-col items-center justify-center bg-white px-6 py-16 text-neutral-900">
			<div className="flex w-full max-w-[1024px] flex-col gap-8">
				<header className="text-center">
					<div className="mt-4 inline-flex items-center gap-2 rounded-full bg-neutral-900 px-4 py-2 text-sm font-medium text-white shadow">
						<span className="text-xs uppercase tracking-[0.35em] text-white/80">
							{headingInfo.short}
						</span>
						<span>{headingInfo.label}</span>
						<span className="text-white/70">{Math.round(headingDegrees)}°</span>
					</div>
				</header>

				<div className={`relative rounded-3xl border border-neutral-200 bg-white shadow-[0_25px_70px_rgba(15,23,42,0.12)] ${interactive ? (isDragging ? "cursor-grabbing" : "cursor-grab") : ""}`}>
					<div
						ref={containerRef}
						onPointerDown={handlePointerDown}
						onPointerMove={handlePointerMove}
						onPointerUp={handlePointerUp}
						onPointerCancel={handlePointerUp}
						className="relative h-[320px] overflow-hidden rounded-3xl"
					>
						<div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(15,23,42,0.06)_0,rgba(15,23,42,0)_65%)]" />
						<div className="absolute left-1/2 top-0 h-full w-[2px] -translate-x-1/2 bg-neutral-800/80" />

						{showLeftIndicator && (
							<div
								className="absolute left-0 top-0 h-full w-1 rounded-l-3xl"
								style={{
									backgroundColor: markerColor,
									boxShadow: `0 0 12px ${hexToRgba(markerColor, 0.45)}`,
								}}
							/>
						)}

						{showRightIndicator && (
							<div
								className="absolute right-0 top-0 h-full w-1 rounded-r-3xl"
								style={{
									backgroundColor: markerColor,
									boxShadow: `0 0 12px ${hexToRgba(markerColor, 0.45)}`,
								}}
							/>
						)}

						{visibleLandmarks.map((landmark) => {
							const key = landmark.key;
							const isMine = mySelectedKeys.includes(key);
							const c = colorsByKey?.[key] ?? markerColor;
							return (
								<div
									key={key}
									className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border bg-white shadow-[0_4px_10px_rgba(15,23,42,0.18)] transition-transform"
									style={{
										left: `${landmark.positionPercent}%`,
										width: `${landmark.isSelected ? MARKER_SIZE_SELECTED : MARKER_SIZE_NORMAL}px`,
										height: `${landmark.isSelected ? MARKER_SIZE_SELECTED : MARKER_SIZE_NORMAL}px`,
										backgroundColor: landmark.isSelected
											? isMine
												? c
												: "transparent"
											: "transparent",
										borderColor: landmark.isSelected ? c : "rgba(15,23,42,0.4)",
										boxShadow: landmark.isSelected
											? `0 0 10px ${hexToRgba(c, 0.45)}`
											: "0 4px 10px rgba(15,23,42,0.18)",
									}}
									title={`${landmark.displayJP} (${Math.round(landmark.relativeAngle)}°)`}
								>
									{((landmark.isSelected && isMine) ||
										(nearestLandmark && landmark.key === nearestLandmark.key)) && (
										<div className="absolute left-1/2 top-full mt-3 w-max -translate-x-1/2 text-center">
											<div className="rounded-full bg-neutral-900/85 px-3 py-1 text-xs font-medium text-white shadow">
												{landmark.displayJP}
											</div>
											<div className="mt-1 text-[11px] font-semibold uppercase tracking-[0.3em] text-neutral-500">
												{Math.round(landmark.relativeAngle)}°
											</div>
										</div>
									)}
								</div>
							);
						})}
					</div>
				</div>

				<div className="flex items-center gap-4 text-sm text-neutral-500">
					<div className="flex items-center gap-2">
						<div
							className="h-2 w-2 rounded-full"
							style={{ backgroundColor: markerColor }}
						/>
						<span>選択中ランドマーク</span>
					</div>
				</div>
			</div>
		</div>
	);
}

export default LandmarkDirectionFullScreen;
