import type { JSX } from "react";
import { useState } from "react";
import { ControlModeToggle } from "./ControlModeToggle";

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
}

export function OptionPanel({
	mode,
	permissionState,
	onChange,
	isCompact = false,
}: OptionPanelProps): JSX.Element {
	const [isCollapsed, setIsCollapsed] = useState(true);
	const positionClassName = isCompact ? "right-4 top-20" : "right-4 bottom-4";
	const containerClassName = `fixed ${positionClassName} z-[10000] rounded-lg bg-black/70 text-white shadow-xl`;

	return (
		<div className={containerClassName}>
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
					</div>
				</div>
			)}
		</div>
	);
}
