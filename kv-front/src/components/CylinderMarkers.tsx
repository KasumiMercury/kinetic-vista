import type { JSX } from "react";
import { CylinderMarker } from "./CylinderMarker";
import loc from "../assets/landmark.json";

type ScaleLike =
	| number
	| [number, number, number]
	| { x: number; y: number; z: number };
type RotationLike =
	| [number, number, number]
	| { x: number; y: number; z: number };

type CoordMap = {
	xKey?: "x" | "y" | "z";
	zKey?: "x" | "y" | "z";
	invertX?: boolean;
	invertZ?: boolean;
};

type CylinderMarkersProps = Omit<
	JSX.IntrinsicElements["group"],
	"scale" | "rotation"
> & {
	// Global marker appearance
	radius?: number;
	height?: number;
	color?: string;
	scale?: ScaleLike;
	yaw?: number;
	rotation?: RotationLike;
	coordMap?: CoordMap;
	// Keys of landmarks to render. If omitted, renders all.
	selectedKeys?: string[];
};

type LocEntry = { x?: number; y?: number; z?: number; displayJP?: string };
type LocData = Record<string, LocEntry>;

const DEFAULT_RADIUS = 0.12;
const DEFAULT_HEIGHT = 3.0;
const DEFAULT_COLOR = "#ff3366";

export function CylinderMarkers({
	radius = DEFAULT_RADIUS,
	height = DEFAULT_HEIGHT,
	color = DEFAULT_COLOR,
	scale,
	rotation,
	yaw,
	coordMap,
	selectedKeys,
	...groupProps
}: CylinderMarkersProps): JSX.Element {
	const data = loc as unknown as LocData;

	const { sx, sz } = (() => {
		if (typeof scale === "number") return { sx: scale, sz: scale };
		if (Array.isArray(scale) && scale.length === 3)
			return { sx: scale[0] ?? 1, sz: scale[2] ?? 1 };
		if (scale && typeof scale === "object" && "x" in scale && "z" in scale) {
			const anyScale = scale as { x?: number; z?: number };
			return { sx: anyScale.x ?? 1, sz: anyScale.z ?? 1 };
		}
		return { sx: 1, sz: 1 };
	})();

	// derive yaw from rotation's y if provided and yaw is undefined
	const yawRad: number = (() => {
		if (typeof yaw === "number") return yaw;
		if (!rotation) return 0;
		if (Array.isArray(rotation)) return rotation[1] ?? 0;
		if (typeof rotation === "object")
			return (rotation as { y?: number }).y ?? 0;
		return 0;
	})();

	const cosY = Math.cos(yawRad);
	const sinY = Math.sin(yawRad);

	const xKey = coordMap?.xKey;
	const zKey = coordMap?.zKey;
	const invertX = coordMap?.invertX ?? false;
	const invertZ = coordMap?.invertZ ?? false;

	return (
		<group {...groupProps}>
			{(selectedKeys !== undefined
				? Object.entries(data).filter(([key]) => selectedKeys.includes(key))
				: Object.entries(data)
			).map(([key, entry]) => {
				const baseX = (xKey ? (entry as never)[xKey] : entry.x) ?? 0;
				const baseZ =
					(zKey ? (entry as never)[zKey] : (entry.z ?? entry.y)) ?? 0; // prefer z; fallback to y for Blender

				const vx = (invertX ? -baseX : baseX) * sx;
				const vz = (invertZ ? -baseZ : baseZ) * sz;

				const rx = vx * cosY + vz * sinY;
				const rz = -vx * sinY + vz * cosY;

				return (
					<CylinderMarker
						key={key}
						x={rx}
						z={rz}
						radius={radius}
						height={height}
						color={color}
					/>
				);
			})}
		</group>
	);
}
