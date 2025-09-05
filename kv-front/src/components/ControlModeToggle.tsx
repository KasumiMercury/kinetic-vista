import { useMemo } from "react";

interface ControlModeToggleProps {
	mode: "sensor" | "drag";
	permissionState?:
		| "checking"
		| "granted"
		| "denied"
		| "not-supported"
		| "needs-permission"
		| "no-sensor";
	onChange: (mode: "sensor" | "drag") => void;
}

export function ControlModeToggle({
	mode,
	permissionState,
	onChange,
}: ControlModeToggleProps) {
	const isSensor = mode === "sensor";

	const permissionBadge = useMemo(() => {
		if (!isSensor || !permissionState) return null;
		const base = "mt-2 rounded px-1.5 py-0.5 text-[12px] leading-none";
		switch (permissionState) {
			case "granted":
				return (
					<span className={`${base} bg-green-700 text-white`}>許可済み</span>
				);
			case "needs-permission":
				return (
					<span className={`${base} bg-amber-500 text-black`}>要許可</span>
				);
			case "denied":
				return <span className={`${base} bg-red-600 text-white`}>拒否</span>;
			case "no-sensor":
			case "not-supported":
				return <span className={`${base} bg-gray-500 text-white`}>未対応</span>;
			default:
				return <span className={`${base} bg-cyan-600 text-white`}>確認中</span>;
		}
	}, [isSensor, permissionState]);

	return (
		<div className="space-y-3">
			<div className="text-[13px] text-white/80">操作モード</div>
			<div className="space-y-2">
				<button
					type="button"
					onClick={() => onChange("drag")}
					className={`w-full cursor-pointer rounded-md border px-3 py-2 text-[13px] ${
						mode === "drag"
							? "border-blue-500 bg-blue-600 text-white"
							: "border-white/30 bg-transparent text-white"
					}`}
				>
					ドラッグ
				</button>
				<button
					type="button"
					onClick={() => onChange("sensor")}
					className={`w-full cursor-pointer rounded-md border px-3 py-2 text-[13px] ${
						mode === "sensor"
							? "border-blue-500 bg-blue-600 text-white"
							: "border-white/30 bg-transparent text-white"
					}`}
				>
					センサー
				</button>
				{permissionBadge}
			</div>
		</div>
	);
}
