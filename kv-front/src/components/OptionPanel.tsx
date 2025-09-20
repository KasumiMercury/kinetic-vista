import type { JSX } from "react";
import { useCallback, useMemo, useRef, useState } from "react";
import { ControlModeToggle } from "./ControlModeToggle";
import { CalibrationModal } from "./CalibrationModal";
import type { CalibrationResult } from "../hooks/useNavigationState";
import loc from "../assets/landmark.json";
import { useOutsideClick } from "../hooks/useOutsideClick";

const LANDMARKS = loc as Record<string, { displayJP?: string }>;

interface OptionPanelProps {
	mode: "sensor" | "drag";
	permissionState?:
		| "checking"
		| "granted"
		| "denied"
		| "not-supported"
		| "needs-permission"
		| "no-sensor";
	onChange: (mode: "sensor" | "drag") => void;
	isCompact?: boolean;
	selectedLandmarkKey?: string | null;
	onCalibrate: (
		landmarkKey: string,
	) => CalibrationResult | Promise<CalibrationResult>;
	calibrationOffset: number;
	calibratedLandmarkKey: string | null;
	calibrationTimestamp: number | null;
	onResetCalibration: () => void;
}

export function OptionPanel({
	mode,
	permissionState,
	onChange,
	isCompact = false,
	selectedLandmarkKey,
	onCalibrate,
	calibrationOffset,
	calibratedLandmarkKey,
	calibrationTimestamp,
	onResetCalibration,
}: OptionPanelProps): JSX.Element {
	const [isCollapsed, setIsCollapsed] = useState(true);
	const [isModalOpen, setIsModalOpen] = useState(false);
	const containerRef = useRef<HTMLDivElement>(null);
	const collapse = useCallback(() => {
		setIsCollapsed(true);
	}, []);

	useOutsideClick(containerRef, collapse, !isCollapsed);
	const positionClassName = isCompact ? "right-4 top-20" : "right-4 bottom-4";
	const containerClassName = `fixed ${positionClassName} z-[10000] rounded-lg bg-black/70 text-white shadow-xl`;

	const landmarkOptions = useMemo(
		() =>
			Object.entries(LANDMARKS).map(([key, entry]) => ({
				key,
				label: entry.displayJP ?? key,
			})),
		[],
	);

	const currentLandmarkLabel = useMemo(() => {
		if (!calibratedLandmarkKey) return null;
		const entry = LANDMARKS[calibratedLandmarkKey];
		return entry?.displayJP ?? calibratedLandmarkKey;
	}, [calibratedLandmarkKey]);

	const formattedOffset = useMemo(() => {
		if (!calibratedLandmarkKey) return null;
		const sign = calibrationOffset >= 0 ? "+" : "";
		return `${sign}${calibrationOffset.toFixed(1)}°`;
	}, [calibratedLandmarkKey, calibrationOffset]);

	const formattedTimestamp = useMemo(() => {
		if (!calibrationTimestamp) return null;
		const date = new Date(calibrationTimestamp);
		const hh = date.getHours().toString().padStart(2, "0");
		const mm = date.getMinutes().toString().padStart(2, "0");
		return `${hh}:${mm}`;
	}, [calibrationTimestamp]);

	const defaultModalSelection = useMemo(() => {
		return (
			selectedLandmarkKey ??
			calibratedLandmarkKey ??
			landmarkOptions[0]?.key ??
			null
		);
	}, [selectedLandmarkKey, calibratedLandmarkKey, landmarkOptions]);

	return (
		<div ref={containerRef} className={containerClassName}>
			{/* 設定ボタン（折りたたみ時） */}
			{isCollapsed ? (
				<button
					type="button"
					onClick={() => setIsCollapsed(false)}
					className="flex h-12 w-16 items-center justify-center rounded-lg bg-black/70 text-white hover:bg-black/80 transition-colors text-[13px] font-medium"
					title="設定を開く"
				>
					設定
				</button>
			) : (
				<div className="min-w-[200px]">
					{/* ヘッダー */}
					<button
						type="button"
						className="flex w-full cursor-pointer items-center justify-between p-3 text-left"
						onClick={() => setIsCollapsed(true)}
					>
						<div className="font-semibold">設定</div>
						<div className="text-white/70">×</div>
					</button>

					{/* コンテンツ */}
					<div className="p-3 pt-0">
						<ControlModeToggle
							mode={mode}
							permissionState={permissionState}
							onChange={onChange}
						/>
						<div className="mt-4 rounded-md border border-white/20 bg-white/5 p-3">
							<div className="text-[13px] font-semibold">
								キャリブレーション
							</div>
							{calibratedLandmarkKey ? (
								<div className="mt-1 space-y-1 text-[12px] text-white/70">
									<div>ランドマーク: {currentLandmarkLabel}</div>
									<div>オフセット: {formattedOffset}</div>
									{formattedTimestamp && (
										<div>最終更新: {formattedTimestamp}</div>
									)}
								</div>
							) : (
								<div className="mt-1 text-[12px] text-white/60">
									まだキャリブレーションが実行されていません
								</div>
							)}
							<div className="mt-3 flex gap-2">
								<button
									type="button"
									onClick={() => setIsModalOpen(true)}
									className="flex-1 rounded-md bg-blue-600 px-3 py-2 text-[13px] font-medium text-white hover:bg-blue-500 transition-colors"
								>
									開始
								</button>
								<button
									type="button"
									onClick={onResetCalibration}
									disabled={!calibratedLandmarkKey}
									className="flex-1 rounded-md border border-white/40 px-3 py-2 text-[13px] font-medium text-white transition-colors disabled:cursor-not-allowed disabled:opacity-50 hover:bg-white/10"
								>
									リセット
								</button>
							</div>
						</div>
					</div>
				</div>
			)}

			<CalibrationModal
				isOpen={isModalOpen}
				onClose={() => setIsModalOpen(false)}
				options={landmarkOptions}
				defaultSelectionKey={defaultModalSelection}
				onCalibrate={onCalibrate}
			/>
		</div>
	);
}
