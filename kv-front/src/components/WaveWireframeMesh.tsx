import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type * as THREE from "three";
import { WaveMaterial } from "./WaveMaterial";

interface WaveWireframeMeshProps {
	size?: number;
	segments?: number;
	waveSpeed?: number;
	waveAmplitude?: number;
	waveFrequency?: number;
	waveDecay?: number;
	noiseScale?: number;
	noiseAmplitude?: number;
	color?: string;
	position?: [number, number, number];
	waveCount?: number;
	waveInterval?: number;
}

export function WaveWireframeMesh({
	size = 20,
	segments = 128,
	waveSpeed = 2,
	waveAmplitude = 0.5,
	waveFrequency = 0.5,
	waveDecay = 0.1,
	noiseScale = 0.1,
	noiseAmplitude = 0.1,
	color = "#00ffff",
	position = [0, 0, 0],
	waveCount = 3,
	waveInterval = 2.0,
}: WaveWireframeMeshProps) {
	const meshRef = useRef<THREE.Mesh>(null);
	const materialRef = useRef<THREE.Material>(null);
	const timeUniformRef = useRef<{ value: number }>({ value: 0 });

	useFrame(({ clock }) => {
		// Update time uniform directly
		timeUniformRef.current.value = clock.getElapsedTime();
	});

	return (
		<mesh ref={meshRef} position={position} rotation={[-Math.PI / 2, 0, 0]}>
			<planeGeometry args={[size, size, segments, segments]} />
			<WaveMaterial
				ref={materialRef}
				waveSpeed={waveSpeed}
				waveAmplitude={waveAmplitude}
				waveFrequency={waveFrequency}
				waveDecay={waveDecay}
				noiseScale={noiseScale}
				noiseAmplitude={noiseAmplitude}
				color={color}
				waveCount={waveCount}
				waveInterval={waveInterval}
				timeUniform={timeUniformRef.current}
				transparent={true}
				opacity={0.8}
			/>
		</mesh>
	);
}
