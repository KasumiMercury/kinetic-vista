import type { JSX, Ref } from "react";
import { forwardRef } from "react";
import type { Mesh } from "three";

type OctahedronMarkerProps = {
	x: number;
	y: number;
	z: number;
	radius: number; // from landmark.json per item
	color: string;
};

export const OctahedronMarker = forwardRef(function OctahedronMarker(
	{ x, y, z, radius, color }: OctahedronMarkerProps,
	ref: Ref<Mesh>,
): JSX.Element {
	return (
		<mesh ref={ref} position={[x, y, z]} castShadow receiveShadow>
			<octahedronGeometry args={[radius, 0]} />
			<meshStandardMaterial
				color={color}
				transparent={false}
				opacity={1}
				depthWrite={true}
			/>
		</mesh>
	);
});
