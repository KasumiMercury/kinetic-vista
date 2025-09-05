import React, { useMemo } from "react";
import { useLoader } from "@react-three/fiber";
import {
	TextureLoader,
	RepeatWrapping,
	PlaneGeometry,
	MeshStandardMaterial,
} from "three";

interface ResidentialPlaneProps {
	size?: number;
	position?: [number, number, number];
	rotation?: [number, number, number];
	textureRepeat?: [number, number];
	bumpScale?: number;
	color?: string;
}

const ResidentialPlane = React.memo(function ResidentialPlane({
	size = 50,
	position = [0, 0, 0],
	rotation = [-Math.PI / 2, 0, 0],
	textureRepeat = [10, 10],
	bumpScale = 0.1,
	color = "#8b7355",
}: ResidentialPlaneProps) {
	const bumpTexture = useLoader(TextureLoader, "/bump.png");

	// Memoize texture configuration to avoid unnecessary recalculations
	const configuredTexture = useMemo(() => {
		const texture = bumpTexture.clone();
		texture.wrapS = RepeatWrapping;
		texture.wrapT = RepeatWrapping;
		texture.repeat.set(textureRepeat[0], textureRepeat[1]);
		return texture;
	}, [bumpTexture, textureRepeat]);

	// Memoize geometry to reuse when size doesn't change
	const geometry = useMemo(() => new PlaneGeometry(size, size), [size]);

	// Memoize material to avoid recreation when props don't change
	const material = useMemo(() => {
		const mat = new MeshStandardMaterial({
			color: color,
			bumpMap: configuredTexture,
			bumpScale: bumpScale,
			roughness: 0.8,
			metalness: 0.1,
		});
		return mat;
	}, [color, configuredTexture, bumpScale]);

	return (
		<mesh
			position={position}
			rotation={rotation}
			receiveShadow
			geometry={geometry}
			material={material}
		/>
	);
});

export { ResidentialPlane };
