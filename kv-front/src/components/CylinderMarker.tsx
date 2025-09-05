import type { JSX } from "react";

type CylinderMarkerProps = {
	x: number;
	z: number;
	radius: number;
	height: number;
	color: string;
};

export function CylinderMarker({
	x,
	z,
	radius,
	height,
	color,
}: CylinderMarkerProps): JSX.Element {
	return (
		<mesh position={[x, height / 2 - 0.3, z]} castShadow receiveShadow>
			<cylinderGeometry args={[radius, radius, height, 32]} />
			<meshStandardMaterial
				color={color}
				transparent
				opacity={0.3}
				depthWrite={false}
			/>
		</mesh>
	);
}
