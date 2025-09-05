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
		const styleBase = {
			marginLeft: 8,
			padding: "2px 6px",
			borderRadius: 4,
			fontSize: 12,
			lineHeight: 1,
		} as const;

		switch (permissionState) {
			case "granted":
				return (
					<span style={{ ...styleBase, background: "#1e7e34", color: "white" }}>
						許可済み
					</span>
				);
			case "needs-permission":
				return (
					<span style={{ ...styleBase, background: "#ffc107", color: "black" }}>
						要許可
					</span>
				);
			case "denied":
				return (
					<span style={{ ...styleBase, background: "#dc3545", color: "white" }}>
						拒否
					</span>
				);
			case "no-sensor":
			case "not-supported":
				return (
					<span style={{ ...styleBase, background: "#6c757d", color: "white" }}>
						未対応
					</span>
				);
			// case "checking":
			default:
				return (
					<span style={{ ...styleBase, background: "#17a2b8", color: "white" }}>
						確認中
					</span>
				);
		}
	}, [isSensor, permissionState]);

	return (
		<div
			style={{
				position: "fixed",
				top: 12,
				right: 12,
				zIndex: 1101,
				background: "rgba(0,0,0,0.6)",
				color: "white",
				padding: 8,
				borderRadius: 8,
				display: "flex",
				alignItems: "center",
				gap: 8,
				boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
				backdropFilter: "blur(6px)",
			}}
		>
			<span style={{ fontSize: 13 }}>操作モード</span>
			<div style={{ display: "flex", gap: 6 }}>
				<button
					type="button"
					onClick={() => onChange("drag")}
					style={{
						padding: "6px 10px",
						borderRadius: 6,
						border: "1px solid rgba(255,255,255,0.3)",
						background: mode === "drag" ? "#0d6efd" : "transparent",
						color: mode === "drag" ? "white" : "white",
						cursor: "pointer",
						fontSize: 13,
					}}
				>
					ドラッグ
				</button>
				<button
					type="button"
					onClick={() => onChange("sensor")}
					style={{
						padding: "6px 10px",
						borderRadius: 6,
						border: "1px solid rgba(255,255,255,0.3)",
						background: mode === "sensor" ? "#0d6efd" : "transparent",
						color: mode === "sensor" ? "white" : "white",
						cursor: "pointer",
						fontSize: 13,
					}}
				>
					センサー
				</button>
				{permissionBadge}
			</div>
		</div>
	);
}
