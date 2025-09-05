import type { JSX } from "react";

type OctahedronMarkerProps = {
	x: number;
	y: number;
	z: number;
	radius: number; // from landmark.json per item
	color: string;
};

export function OctahedronMarker({
	x,
	y,
	z,
	radius,
	color,
}: OctahedronMarkerProps): JSX.Element {
	return (
		<mesh position={[x, y, z]} castShadow receiveShadow>
			<octahedronGeometry args={[radius, 0]} />
			<meshStandardMaterial
				color={color}
				// transparent
				opacity={1}
				depthWrite={true}
			/>
		</mesh>
	);
}
