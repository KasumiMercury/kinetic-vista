import { useEffect, useId, useMemo, useState, type JSX } from "react";
import type { CalibrationResult } from "../hooks/useNavigationState";

type CalibrationModalProps = {
	isOpen: boolean;
	onClose: () => void;
	options: Array<{ key: string; label: string }>;
	defaultSelectionKey: string | null;
	onCalibrate: (landmarkKey: string) => CalibrationResult | Promise<CalibrationResult>;
};

type Status = "idle" | "pending" | "success" | "error";
type CalibrationFailure = Extract<CalibrationResult, { success: false }>;

const failureMessages: Record<CalibrationFailure["reason"], string> = {
	"sensor-unavailable":
		"センサーの値が取得できませんでした。デバイスのセンサーが有効か確認してください。",
	"landmark-not-found":
		"ランドマーク情報が見つかりませんでした。選択肢を確認してください。",
};

export function CalibrationModal({
	isOpen,
	onClose,
	options,
	defaultSelectionKey,
	onCalibrate,
}: CalibrationModalProps): JSX.Element | null {
	const [selectedKey, setSelectedKey] = useState<string>("");
	const [status, setStatus] = useState<Status>("idle");
	const [result, setResult] = useState<CalibrationResult | null>(null);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const selectId = useId();

	useEffect(() => {
		if (!isOpen) return;
		const fallback = defaultSelectionKey ?? options[0]?.key ?? "";
		setSelectedKey(fallback);
		setStatus("idle");
		setResult(null);
		setErrorMessage(null);
	}, [isOpen, defaultSelectionKey, options]);

	const offsetLabel = useMemo(() => {
		if (!result || !result.success) return null;
		const sign = result.offset >= 0 ? "+" : "";
		return `${sign}${result.offset.toFixed(1)}°`;
	}, [result]);

	if (!isOpen) return null;

	const handleCalibrate = async () => {
		if (!selectedKey) {
			setStatus("error");
			setErrorMessage("ランドマークを選択してください。");
			return;
		}

		setStatus("pending");
		setErrorMessage(null);

		try {
			const response = await onCalibrate(selectedKey);
			setResult(response);
			if (response.success) {
				setStatus("success");
			} else {
				setStatus("error");
				setErrorMessage(failureMessages[response.reason]);
			}
		} catch (error) {
			console.error("[Calibration] failed:", error);
			setStatus("error");
			setErrorMessage("キャリブレーションに失敗しました。");
		}
	};

	return (
		<div className="fixed inset-0 z-[11000] flex items-center justify-center bg-black/70 px-4">
			<div className="w-full max-w-md rounded-lg bg-neutral-900 p-5 text-white shadow-2xl">
				<div className="flex items-center justify-between">
					<h2 className="text-lg font-semibold">キャリブレーション</h2>
					<button
						type="button"
						onClick={onClose}
						className="rounded px-2 py-1 text-sm text-white/70 hover:bg-white/10 hover:text-white"
					>
						閉じる
					</button>
				</div>
				<p className="mt-2 text-sm leading-relaxed text-white/70">
					選択したランドマークを正面に合わせた状態で「オフセット算出」を押すと、現在のセンサー値との差から補正値を計算します。
				</p>
				<div className="mt-4 space-y-2 text-sm">
					<label className="block text-white/80" htmlFor={selectId}>
						ランドマークを選択
					</label>
					<select
						id={selectId}
						value={selectedKey}
						onChange={(event) => setSelectedKey(event.target.value)}
						className="w-full rounded-md border border-white/30 bg-black/40 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
					>
						{options.map(({ key, label }) => (
							<option key={key} value={key} className="bg-neutral-900">
								{label}
							</option>
						))}
					</select>
				</div>
				<div className="mt-4 flex items-center gap-2">
					<button
						type="button"
						onClick={handleCalibrate}
						disabled={status === "pending"}
						className="flex-1 rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
					>
						{status === "pending" ? "計算中..." : "オフセット算出"}
					</button>
					<button
						type="button"
						onClick={onClose}
						className="rounded-md border border-white/30 px-3 py-2 text-sm text-white transition-colors hover:bg-white/10"
					>
						キャンセル
					</button>
				</div>
				{status === "success" && result?.success && (
					<div className="mt-4 space-y-1 rounded-md border border-emerald-400/40 bg-emerald-500/10 p-3 text-xs text-emerald-100">
						<div>センサー値: {result.sensorHeading.toFixed(1)}°</div>
						<div>ランドマーク角度: {result.actualAngle.toFixed(1)}°</div>
						<div>算出オフセット: {offsetLabel}</div>
						<div>補正後の向き: {result.calibratedHeading.toFixed(1)}°</div>
					</div>
				)}
				{status === "pending" && (
					<div className="mt-4 text-xs text-white/60">オフセットを計算しています...</div>
				)}
				{status === "error" && (
					<div className="mt-4 rounded-md border border-red-500/60 bg-red-500/10 p-3 text-xs text-red-200">
						{errorMessage ?? "キャリブレーションに失敗しました。"}
					</div>
				)}
			</div>
		</div>
	);
}
