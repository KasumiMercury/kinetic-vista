import type { JSX } from "react";
import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Mesh } from "three";
import { OctahedronMarker } from "./OctahedronMarker";
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

type OctahedronMarkersProps = Omit<
	JSX.IntrinsicElements["group"],
	"scale" | "rotation"
> & {
	// Global appearance
	color?: string;
	scale?: ScaleLike;
	yaw?: number;
	rotation?: RotationLike;
	coordMap?: CoordMap;
	// Keys of landmarks to render. If omitted, renders all.
	selectedKeys?: string[];
	// Base display height (lowest vertex will be at this height)
	height?: number;
	// Y-axis rotation speed in radians per second (applied to each marker)
	spinSpeed?: number;
};

type LocEntry = {
	x?: number;
	y?: number;
	z?: number;
	radius?: number;
	heightOffset?: number;
	displayJP?: string;
};
type LocData = Record<string, LocEntry>;

const DEFAULT_COLOR = "#ff3366";
const DEFAULT_RADIUS = 0.12; // used only if landmark radius is missing

export function OctahedronMarkers({
	color = DEFAULT_COLOR,
	scale,
	rotation,
	yaw,
	coordMap,
	selectedKeys,
	height = 0,
	spinSpeed = 0,
	...groupProps
}: OctahedronMarkersProps): JSX.Element {
	const data = loc as unknown as LocData;

	// Refs for per-marker meshes to rotate efficiently without re-rendering
	const meshRefs = useRef<Mesh[]>([]);
	const angleRef = useRef(0);

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

	// Update rotation angle and apply to all marker meshes
	useFrame((_state, delta) => {
		if (meshRefs.current.length === 0 || spinSpeed === 0) return;
		angleRef.current += delta * spinSpeed;
		const angle = angleRef.current;
		const normalized = angle % (Math.PI * 2);
		for (let i = 0; i < meshRefs.current.length; i++) {
			const m = meshRefs.current[i];
			if (m) m.rotation.y = normalized;
		}
	});

	return (
		<group {...groupProps}>
			{(selectedKeys !== undefined
				? Object.entries(data).filter(([key]) => selectedKeys.includes(key))
				: Object.entries(data)
			).map(([key, entry], i) => {
				const baseX = (xKey ? (entry as never)[xKey] : entry.x) ?? 0;
				const baseZ =
					(zKey ? (entry as never)[zKey] : (entry.z ?? entry.y)) ?? 0; // prefer z; fallback to y

				const vx = (invertX ? -baseX : baseX) * sx;
				const vz = (invertZ ? -baseZ : baseZ) * sz;

				const rx = vx * cosY + vz * sinY;
				const rz = -vx * sinY + vz * cosY;

				const r = entry.radius ?? DEFAULT_RADIUS;
				// Position Y so the lowest vertex sits at `height + heightOffset`
				const centerY = height + (entry.heightOffset ?? 0) + r;

				return (
					<OctahedronMarker
						key={key}
						x={rx}
						y={centerY}
						z={rz}
						radius={r}
						color={color}
						ref={(el) => {
							if (el) meshRefs.current[i] = el;
						}}
					/>
				);
			})}
		</group>
	);
}
