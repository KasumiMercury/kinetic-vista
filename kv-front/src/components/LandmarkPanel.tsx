import type { JSX } from "react";
import { useMemo } from "react";
import loc from "../assets/landmark.json";

type LandmarkPanelProps = {
	selectedKeys: string[];
	onChange: (next: string[]) => void;
};

type LocEntry = { displayJP?: string } & Record<string, unknown>;
type LocData = Record<string, LocEntry>;

export function LandmarkPanel({
	selectedKeys,
	onChange,
}: LandmarkPanelProps): JSX.Element {
	const data = loc as unknown as LocData;

	const items = useMemo(
		() =>
			Object.entries(data)
				.map(([key, entry]) => ({ key, displayJP: entry.displayJP ?? key }))
				.sort((a, b) => a.displayJP.localeCompare(b.displayJP, "ja")),
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
		<div className="fixed bottom-4 left-4 z-[10000] max-h-[50vh] max-w-[50vw] overflow-auto rounded-lg bg-black/70 p-3 text-white shadow-xl">
			<div className="mb-2 font-semibold">Landmarks</div>

			<div className="grid gap-2">
				{items.map(({ key, displayJP }) => {
					const selected = selectedKeys.includes(key);
					return (
						<button
							key={key}
							type="button"
							onClick={() => toggle(key)}
							aria-pressed={selected}
							className={`w-full cursor-pointer rounded-lg px-2.5 py-2 text-left text-[13px] leading-[1.2] text-white ${
								selected
									? "border border-pink-300 bg-pink-600"
									: "border border-white/25 bg-white/10"
							}`}
						>
							{displayJP}
						</button>
					);
				})}
			</div>
		</div>
	);
}
