import type { JSX } from "react";
import { useMemo, useState } from "react";
import loc from "../assets/landmark.json";

type LandmarkPanelProps = {
    selectedKeys: string[];
    onChange: (next: string[]) => void;
    color?: string;
};

type LocEntry = { displayJP?: string } & Record<string, unknown>;
type LocData = Record<string, LocEntry>;

import { lightenHex, hexToRgba } from "../utils/userColor";

export function LandmarkPanel({
    selectedKeys,
    onChange,
    color,
}: LandmarkPanelProps): JSX.Element {
	const [isCollapsed, setIsCollapsed] = useState(true);
	const data = loc as unknown as LocData;

	const items = useMemo(
		() =>
			Object.entries(data)
				.map(([key, entry]) => ({ key, displayJP: entry.displayJP ?? key })),
		[data],
	);

	const toggle = (key: string) => {
		const isSelected = selectedKeys.includes(key);
		const next = isSelected
			? selectedKeys.filter((k) => k !== key)
			: [...selectedKeys, key];
		onChange(next);
	};

	return (
		<div className="fixed bottom-4 left-4 z-[10000] w-[280px] rounded-lg bg-black/70 text-white shadow-xl">
			{/* ヘッダー */}
			<button
				type="button"
				className="flex w-full cursor-pointer items-center justify-between p-3 text-left"
				onClick={() => setIsCollapsed(!isCollapsed)}
			>
				<div className="font-semibold">Landmarks</div>
				<div className="text-white/70">{isCollapsed ? "▼" : "▲"}</div>
			</button>

			{/* コンテンツ */}
			{!isCollapsed && (
				<div className="max-h-[50vh] overflow-auto p-3 pt-0">
					<div className="grid gap-2">
						{items.map(({ key, displayJP }) => {
							const selected = selectedKeys.includes(key);
                        const bg = color ?? "#ff3366";
                        const border = lightenHex(bg, 0.3);
                        const shadow = hexToRgba(bg, 0.5);
                        return (
                            <button
                                key={key}
                                type="button"
                                onClick={() => toggle(key)}
                                aria-pressed={selected}
                                className={`w-full cursor-pointer rounded-lg px-2.5 py-2 text-left text-[13px] leading-[1.2] text-white ${
                                    selected
                                        ? "border"
                                        : "border border-white/25 bg-white/10"
                                }`}
                                style={
                                    selected
                                        ? { backgroundColor: bg, borderColor: border, boxShadow: `0 0 8px ${shadow}` }
                                        : undefined
                                }
                            >
                                {displayJP}
                            </button>
                        );
                    })}
					</div>
				</div>
			)}
		</div>
	);
}
