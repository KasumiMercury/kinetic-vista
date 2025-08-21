import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";

interface ParticleNetworkProps {
	particleCount?: number;
	centerPosition?: [number, number, number];
	yRange?: number;
	spawnRange?: number;
	maxLinkDistance?: number;
	linkColorNear?: string;
	linkColorFar?: string;
	particleColor?: string;
	particleSize?: number;
	velocityRange?: number;
	densityFalloff?: number;
}

export function ParticleNetwork({
	particleCount = 400,
	centerPosition = [0, 0, 0],
	yRange = 5,
	spawnRange = 1000,
	maxLinkDistance = 150,
	linkColorNear = "#ffffff",
	linkColorFar = "#ffffff",
	particleColor = "#ffffff",
	particleSize = 4,
	velocityRange = 0.5,
	densityFalloff = 0,
}: ParticleNetworkProps) {
	const particlesRef = useRef<THREE.Points>(null);
	const linesRef = useRef<THREE.LineSegments>(null);

	const { particlePositions, particleVelocities, linePositions, lineColors } =
		useMemo(() => {
			const positions = new Float32Array(particleCount * 3);
			const velocities = new Float32Array(particleCount * 3);

			for (let i = 0; i < particleCount; i++) {
				const i3 = i * 3;

				// Generate position with density falloff
				let x: number, y: number, z: number, distance: number, probability: number;
				do {
					x = (Math.random() * 2 - 1) * spawnRange;
					y = (Math.random() * 2 - 1) * yRange;
					z = (Math.random() * 2 - 1) * spawnRange;

					// Calculate distance from center for density falloff
					distance = Math.sqrt(x * x + z * z) / spawnRange;

					// Apply density falloff (higher densityFalloff = more particles near center)
					probability =
						densityFalloff > 0 ? (1 - distance) ** densityFalloff : 1;
				} while (densityFalloff > 0 && Math.random() > probability);

				positions[i3] = centerPosition[0] + x;
				positions[i3 + 1] = centerPosition[1] + y;
				positions[i3 + 2] = centerPosition[2] + z;

				velocities[i3] = (Math.random() - 0.5) * velocityRange * 0.3;
				velocities[i3 + 1] = (Math.random() - 0.5) * (velocityRange * 0.05);
				velocities[i3 + 2] = (Math.random() - 0.5) * velocityRange * 0.3;
			}

			const maxConnections = particleCount * particleCount;
			const linePos = new Float32Array(maxConnections * 3 * 2);
			const lineCol = new Float32Array(maxConnections * 3 * 2);

			return {
				particlePositions: positions,
				particleVelocities: velocities,
				linePositions: linePos,
				lineColors: lineCol,
			};
		}, [particleCount, centerPosition, yRange, spawnRange, velocityRange, densityFalloff]);

	useFrame(() => {
		if (!particlesRef.current || !linesRef.current) return;

		const positions = particlesRef.current.geometry.attributes.position
			.array as Float32Array;
		const velocities = particleVelocities;

		const linePositions = linesRef.current.geometry.attributes.position
			.array as Float32Array;
		const lineColors = linesRef.current.geometry.attributes.color
			.array as Float32Array;

		let lineVertexIndex = 0;

		const boxSizeX = spawnRange;
		const boxSizeY = yRange;
		const boxSizeZ = spawnRange;

		for (let i = 0; i < particleCount; i++) {
			const i3 = i * 3;
			positions[i3] += velocities[i3];
			positions[i3 + 1] += velocities[i3 + 1];
			positions[i3 + 2] += velocities[i3 + 2];

			const baseX = centerPosition[0];
			const baseY = centerPosition[1];
			const baseZ = centerPosition[2];

			if (
				positions[i3] > baseX + boxSizeX ||
				positions[i3] < baseX - boxSizeX
			) {
				velocities[i3] *= -1;
			}
			if (
				positions[i3 + 1] > baseY + boxSizeY ||
				positions[i3 + 1] < baseY - boxSizeY
			) {
				velocities[i3 + 1] *= -1;
			}
			if (
				positions[i3 + 2] > baseZ + boxSizeZ ||
				positions[i3 + 2] < baseZ - boxSizeZ
			) {
				velocities[i3 + 2] *= -1;
			}
		}

		for (let i = 0; i < particleCount; i++) {
			const i3 = i * 3;
			const p1 = new THREE.Vector3(
				positions[i3],
				positions[i3 + 1],
				positions[i3 + 2],
			);

			for (let j = i + 1; j < particleCount; j++) {
				const j3 = j * 3;
				const p2 = new THREE.Vector3(
					positions[j3],
					positions[j3 + 1],
					positions[j3 + 2],
				);

				const distSq = p1.distanceToSquared(p2);

				// Calculate dynamic link distance based on distance from center
				const centerDistanceP1 =
					Math.sqrt(
						(p1.x - centerPosition[0]) * (p1.x - centerPosition[0]) +
							(p1.z - centerPosition[2]) * (p1.z - centerPosition[2]),
					) / spawnRange;
				const centerDistanceP2 =
					Math.sqrt(
						(p2.x - centerPosition[0]) * (p2.x - centerPosition[0]) +
							(p2.z - centerPosition[2]) * (p2.z - centerPosition[2]),
					) / spawnRange;

				// Average distance from center for both particles
				const avgCenterDistance = (centerDistanceP1 + centerDistanceP2) / 2;

				// Increase link distance for particles farther from center
				const dynamicMaxDistance =
					densityFalloff > 0
						? maxLinkDistance * (1 + avgCenterDistance * densityFalloff * 0.5)
						: maxLinkDistance;
				const dynamicMaxDistanceSquared =
					dynamicMaxDistance * dynamicMaxDistance;

				if (distSq < dynamicMaxDistanceSquared) {
					const dist = Math.sqrt(distSq);
					const alpha = 1.0 - dist / dynamicMaxDistance;

					linePositions[lineVertexIndex * 6] = p1.x;
					linePositions[lineVertexIndex * 6 + 1] = p1.y;
					linePositions[lineVertexIndex * 6 + 2] = p1.z;
					linePositions[lineVertexIndex * 6 + 3] = p2.x;
					linePositions[lineVertexIndex * 6 + 4] = p2.y;
					linePositions[lineVertexIndex * 6 + 5] = p2.z;

					const nearColor = new THREE.Color(linkColorNear);
					const farColor = new THREE.Color(linkColorFar);
					const color = nearColor.clone().lerp(farColor, 1 - alpha);

					// Keep colors bright by separating color and alpha
					lineColors[lineVertexIndex * 6] = color.r;
					lineColors[lineVertexIndex * 6 + 1] = color.g;
					lineColors[lineVertexIndex * 6 + 2] = color.b;
					lineColors[lineVertexIndex * 6 + 3] = color.r;
					lineColors[lineVertexIndex * 6 + 4] = color.g;
					lineColors[lineVertexIndex * 6 + 5] = color.b;

					lineVertexIndex++;
				}
			}
		}

		linesRef.current.geometry.setDrawRange(0, lineVertexIndex * 2);
		linesRef.current.geometry.attributes.position.needsUpdate = true;
		linesRef.current.geometry.attributes.color.needsUpdate = true;
		particlesRef.current.geometry.attributes.position.needsUpdate = true;
	});

	return (
		<>
			<points ref={particlesRef}>
				<bufferGeometry>
					<bufferAttribute
						args={[particlePositions, 3]}
						attach="attributes-position"
						count={particleCount}
						usage={THREE.DynamicDrawUsage}
					/>
				</bufferGeometry>
				<pointsMaterial
					color={particleColor}
					size={particleSize}
					blending={THREE.AdditiveBlending}
					transparent
					sizeAttenuation
					fog
				/>
			</points>

			<lineSegments ref={linesRef}>
				<bufferGeometry>
					<bufferAttribute
						args={[linePositions, 3]}
						attach="attributes-position"
						count={particleCount * particleCount * 2}
						usage={THREE.DynamicDrawUsage}
					/>
					<bufferAttribute
						args={[lineColors, 3]}
						attach="attributes-color"
						count={particleCount * particleCount * 2}
						usage={THREE.DynamicDrawUsage}
					/>
				</bufferGeometry>
				<lineBasicMaterial linewidth={1} vertexColors fog />
			</lineSegments>
		</>
	);
}
