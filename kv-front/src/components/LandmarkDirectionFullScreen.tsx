import {
	useCallback,
	useMemo,
	useRef,
	useState,
	type PointerEvent as ReactPointerEvent,
} from "react";
import { useLandmarkDirectionData } from "../hooks/useLandmarkDirectionData";
import type { CoordMap } from "../utils/landmarkAngles";
import { hexToRgba } from "../utils/userColor";

const DEFAULT_COLOR = "#ff3366";
const MARKER_SIZE_NORMAL = 18;
const MARKER_SIZE_SELECTED = Math.round(MARKER_SIZE_NORMAL * 1.25);

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

const normalizeDegrees = (deg: number) => {
	let value = deg % 360;
	if (value < 0) value += 360;
	return value;
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
		viewAngleRange,
	} = useLandmarkDirectionData({
		cameraRotation,
		selectedLandmarks,
		mySelectedKeys,
		coordMap,
		scale,
		yawRad,
	});

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

	const handlePointerUp = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
		if (!interactive || !containerRef.current) return;
	try {
		containerRef.current.releasePointerCapture(event.pointerId);
	} catch (releaseError) {
		void releaseError;
	}
		dragState.current = null;
		setIsDragging(false);
	}, [interactive]);

	const gridBackground = useMemo(() => {
		const baseColor = hexToRgba(markerColor, 0.12);
		return `linear-gradient(90deg, transparent 0, transparent 49%, ${hexToRgba(markerColor, 0.2)} 50%, transparent 51%, transparent 100%),
		linear-gradient(0deg, transparent 0, transparent 47%, ${baseColor} 50%, transparent 53%, transparent 100%)`;
	}, [markerColor]);

	return (
		<div className="relative h-full w-full overflow-hidden bg-gradient-to-b from-neutral-950 via-neutral-950 to-neutral-900 text-white">
			<div className="absolute inset-0 opacity-40" style={{ backgroundImage: gridBackground }} />
			<div className="relative flex h-full w-full flex-col items-center justify-center px-6 py-10">
				<div className="mb-8 text-center">
					<div className="text-sm uppercase tracking-[0.4em] text-white/60">
						Direction
					</div>
					<div className="mt-2 text-4xl font-semibold text-white">
						ランドマーク方角
					</div>
				</div>

				<div
					ref={containerRef}
					onPointerDown={handlePointerDown}
					onPointerMove={handlePointerMove}
					onPointerUp={handlePointerUp}
					onPointerCancel={handlePointerUp}
					className={`relative w-full max-w-[960px] select-none rounded-3xl border border-white/10 bg-black/40 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.4)] backdrop-blur ${
						interactive
							? `${isDragging ? "cursor-grabbing" : "cursor-grab"} touch-none`
							: ""
					}`}
			>
					<div className="relative h-[240px] w-full overflow-hidden rounded-2xl border border-white/10 bg-white/5">
						<div className="absolute left-1/2 top-0 h-full w-[2px] -translate-x-1/2 bg-white/80" />
						<div className="absolute left-1/2 top-4 -translate-x-1/2 text-xs font-semibold tracking-[0.4em] text-white/50">
							NORTH
						</div>

						{showLeftIndicator && (
							<div
								className="absolute left-0 top-0 h-full w-1 rounded-l-2xl"
								style={{
									backgroundColor: markerColor,
									boxShadow: `0 0 12px ${hexToRgba(markerColor, 0.55)}`,
								}}
							/>
						)}

						{showRightIndicator && (
							<div
								className="absolute right-0 top-0 h-full w-1 rounded-r-2xl"
								style={{
									backgroundColor: markerColor,
									boxShadow: `0 0 12px ${hexToRgba(markerColor, 0.55)}`,
								}}
							/>
						)}

						{visibleLandmarks.map((landmark) => {
							const key = landmark.key;
							const isMine = mySelectedKeys.includes(key);
							const c = colorsByKey?.[key] ?? markerColor;
							const size = landmark.isSelected
								? MARKER_SIZE_SELECTED
								: MARKER_SIZE_NORMAL;

							return (
								<div
									key={key}
									className={`group absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full transition-transform duration-150 ${
										isDragging ? "scale-95" : ""
									}`}
									style={{
										left: `${landmark.positionPercent}%`,
										width: `${size}px`,
										height: `${size}px`,
										backgroundColor:
											landmark.isSelected && isMine ? c : "transparent",
										border: "1px solid",
										borderColor: landmark.isSelected ? c : "rgba(0,0,0,0.6)",
										boxShadow: landmark.isSelected
											? `0 0 14px ${hexToRgba(c, 0.5)}`
											: "0 4px 12px rgba(0,0,0,0.3)",
										backdropFilter: "blur(2px)",
									}}
									title={`${landmark.displayJP} (${Math.round(landmark.relativeAngle)}°)`}
								>
									{((landmark.isSelected && isMine) ||
										(landmark.key === nearestLandmark?.key &&
											!mySelectedKeys.length)) && (
										<div className="absolute left-1/2 top-full mt-3 w-max -translate-x-1/2 text-center">
											<div className="rounded-full bg-black/60 px-3 py-1 text-xs font-medium text-white shadow">
												{landmark.displayJP}
											</div>
											<div className="mt-1 text-[11px] font-semibold uppercase tracking-[0.3em] text-white/50">
												{Math.round(landmark.relativeAngle)}°
											</div>
										</div>
									)}
								</div>
							);
						})}
					</div>
				</div>

				<div className="mt-8 flex items-center gap-4 text-sm text-white/60">
					<div className="flex items-center gap-2">
						<div
							className="h-2 w-2 rounded-full"
							style={{ backgroundColor: markerColor }}
						/>
						<span>選択中ランドマーク</span>
					</div>
					<div className="flex items-center gap-2">
						<div className="h-[1px] w-6 bg-white/40" />
						<span>表示範囲 ±{viewAngleRange}°</span>
					</div>
				</div>
			</div>
		</div>
	);
}

export default LandmarkDirectionFullScreen;
