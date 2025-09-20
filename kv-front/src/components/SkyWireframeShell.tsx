import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { DirectionalColorMaterial } from "./DirectionalColorMaterial";

interface SkyWireframeShellProps {
	radius?: number;
	widthSegments?: number;
	heightSegments?: number;
	wireframeColor?: string;
	wireframeOpacity?: number;
	wireframeThickness?: number;
	shellOpacity?: number;
}

export function SkyWireframeShell({
	radius = 60,
	widthSegments = 96,
	heightSegments = 64,
	wireframeColor = "#ffffff",
	wireframeOpacity = 0.45,
	wireframeThickness = 2.8,
	shellOpacity = 0.04,
}: SkyWireframeShellProps) {
	const geometry = useMemo(() => {
		return new THREE.SphereGeometry(radius, widthSegments, heightSegments);
	}, [radius, widthSegments, heightSegments]);

	useEffect(() => {
		return () => {
			geometry.dispose();
		};
	}, [geometry]);

	return (
		<mesh geometry={geometry} frustumCulled={false} renderOrder={-10}>
			<DirectionalColorMaterial
				side={THREE.BackSide}
				transparent
				opacity={shellOpacity}
				positiveXColor="#3f7fff"
				negativeXColor="#3f7fff"
				positiveYColor="#6fb9ff"
				negativeYColor="#fff8d6"
				positiveZColor="#3f7fff"
				negativeZColor="#3f7fff"
				wireframe
				wireframeColor={wireframeColor}
				wireframeOpacity={wireframeOpacity}
				wireframeThickness={wireframeThickness}
			/>
		</mesh>
	);
}
