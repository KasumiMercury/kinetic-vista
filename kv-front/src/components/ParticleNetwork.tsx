import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";

// Global object pool for performance optimization
const tempVector1 = new THREE.Vector3();
const tempVector2 = new THREE.Vector3();
const nearColor = new THREE.Color();
const farColor = new THREE.Color();
const tempColor = new THREE.Color();

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
	adaptive?: boolean;
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
	adaptive = false,
}: ParticleNetworkProps) {
	const particlesRef = useRef<THREE.Points>(null);
	const linesRef = useRef<THREE.LineSegments>(null);
	const lastLineCount = useRef(0);

	// スマートなフレーム分割用の状態
	const pairBatchIndex = useRef(0);
	const linkStateMap = useRef<Map<string, { positions: number[], colors: number[], valid: boolean }>>(new Map());

	const { particlePositions, particleVelocities, linePositions, lineColors, totalPairs, batchSize } =
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

			// 総ペア数の計算（i < jの組み合わせ）
			const totalPairCount = (particleCount * (particleCount - 1)) / 2;
			
			// 適応的バッチサイズ：フレームレート60fpsを目標に調整
			const adaptiveBatchSize = adaptive && particleCount > 300 
				? Math.max(Math.floor(totalPairCount / 4), 50) // 4フレームで全体をカバー
				: totalPairCount; // 非適応モードでは全て一度に処理

			return {
				particlePositions: positions,
				particleVelocities: velocities,
				linePositions: linePos,
				lineColors: lineCol,
				totalPairs: totalPairCount,
				batchSize: adaptiveBatchSize,
			};
		}, [particleCount, centerPosition, yRange, spawnRange, velocityRange, densityFalloff, adaptive]);

	useFrame((_state, _delta) => {
		if (!particlesRef.current || !linesRef.current) return;

		const positions = particlesRef.current.geometry.attributes.position
			.array as Float32Array;
		const velocities = particleVelocities;

		const linePositions = linesRef.current.geometry.attributes.position
			.array as Float32Array;
		const lineColors = linesRef.current.geometry.attributes.color
			.array as Float32Array;

		// パーティクル位置の更新
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

		// リンク計算：スマートなフレーム分割
		if (adaptive && particleCount > 300) {
			// バッチ処理で一部のペアを更新
			const currentBatchStart = pairBatchIndex.current * batchSize;
			const currentBatchEnd = Math.min(currentBatchStart + batchSize, totalPairs);
			
			// 現在のバッチのペアを処理
			let pairIndex = 0;
			let processedPairs = 0;
			
			for (let i = 0; i < particleCount && processedPairs < batchSize; i++) {
				for (let j = i + 1; j < particleCount && processedPairs < batchSize; j++) {
					if (pairIndex >= currentBatchStart && pairIndex < currentBatchEnd) {
						const i3 = i * 3;
						const j3 = j * 3;
						const pairKey = `${i}-${j}`;

						tempVector1.set(positions[i3], positions[i3 + 1], positions[i3 + 2]);
						tempVector2.set(positions[j3], positions[j3 + 1], positions[j3 + 2]);

						const distSq = tempVector1.distanceToSquared(tempVector2);

						// Dynamic link distance calculation
						const dx1 = tempVector1.x - centerPosition[0];
						const dz1 = tempVector1.z - centerPosition[2];
						const centerDistanceSqP1 = dx1 * dx1 + dz1 * dz1;
						const centerDistanceP1 = Math.sqrt(centerDistanceSqP1) / spawnRange;
						
						const dx2 = tempVector2.x - centerPosition[0];
						const dz2 = tempVector2.z - centerPosition[2];
						const centerDistanceSqP2 = dx2 * dx2 + dz2 * dz2;
						const centerDistanceP2 = Math.sqrt(centerDistanceSqP2) / spawnRange;

						const avgCenterDistance = (centerDistanceP1 + centerDistanceP2) / 2;
						const dynamicMaxDistance = densityFalloff > 0
							? maxLinkDistance * (1 + avgCenterDistance * densityFalloff * 0.5)
							: maxLinkDistance;
						const dynamicMaxDistanceSquared = dynamicMaxDistance * dynamicMaxDistance;

						if (distSq < dynamicMaxDistanceSquared) {
							const dist = Math.sqrt(distSq);
							const alpha = 1.0 - dist / dynamicMaxDistance;

							nearColor.set(linkColorNear);
							farColor.set(linkColorFar);
							tempColor.copy(nearColor).lerp(farColor, 1 - alpha);

							// リンクデータを保存
							linkStateMap.current.set(pairKey, {
								positions: [tempVector1.x, tempVector1.y, tempVector1.z, tempVector2.x, tempVector2.y, tempVector2.z],
								colors: [tempColor.r, tempColor.g, tempColor.b, tempColor.r, tempColor.g, tempColor.b],
								valid: true
							});
						} else {
							// 距離が遠い場合は無効にする
							const existingLink = linkStateMap.current.get(pairKey);
							if (existingLink) {
								existingLink.valid = false;
							}
						}
						
						processedPairs++;
					}
					pairIndex++;
				}
			}

			// 次のバッチインデックスを計算
			const totalBatches = Math.ceil(totalPairs / batchSize);
			pairBatchIndex.current = (pairBatchIndex.current + 1) % totalBatches;
		} else {
			// 非適応モード：全ペアを一度に処理
			linkStateMap.current.clear();
			
			for (let i = 0; i < particleCount; i++) {
				for (let j = i + 1; j < particleCount; j++) {
					const i3 = i * 3;
					const j3 = j * 3;
					const pairKey = `${i}-${j}`;

					tempVector1.set(positions[i3], positions[i3 + 1], positions[i3 + 2]);
					tempVector2.set(positions[j3], positions[j3 + 1], positions[j3 + 2]);

					const distSq = tempVector1.distanceToSquared(tempVector2);

					const dx1 = tempVector1.x - centerPosition[0];
					const dz1 = tempVector1.z - centerPosition[2];
					const centerDistanceSqP1 = dx1 * dx1 + dz1 * dz1;
					const centerDistanceP1 = Math.sqrt(centerDistanceSqP1) / spawnRange;
					
					const dx2 = tempVector2.x - centerPosition[0];
					const dz2 = tempVector2.z - centerPosition[2];
					const centerDistanceSqP2 = dx2 * dx2 + dz2 * dz2;
					const centerDistanceP2 = Math.sqrt(centerDistanceSqP2) / spawnRange;

					const avgCenterDistance = (centerDistanceP1 + centerDistanceP2) / 2;
					const dynamicMaxDistance = densityFalloff > 0
						? maxLinkDistance * (1 + avgCenterDistance * densityFalloff * 0.5)
						: maxLinkDistance;
					const dynamicMaxDistanceSquared = dynamicMaxDistance * dynamicMaxDistance;

					if (distSq < dynamicMaxDistanceSquared) {
						const dist = Math.sqrt(distSq);
						const alpha = 1.0 - dist / dynamicMaxDistance;

						nearColor.set(linkColorNear);
						farColor.set(linkColorFar);
						tempColor.copy(nearColor).lerp(farColor, 1 - alpha);

						linkStateMap.current.set(pairKey, {
							positions: [tempVector1.x, tempVector1.y, tempVector1.z, tempVector2.x, tempVector2.y, tempVector2.z],
							colors: [tempColor.r, tempColor.g, tempColor.b, tempColor.r, tempColor.g, tempColor.b],
							valid: true
						});
					}
				}
			}
		}

		// BufferAttributeの更新：有効なリンクのみを描画
		let lineVertexIndex = 0;
		for (const [_key, link] of linkStateMap.current) {
			if (link.valid) {
				const baseIndex = lineVertexIndex * 6;
				linePositions[baseIndex] = link.positions[0];
				linePositions[baseIndex + 1] = link.positions[1];
				linePositions[baseIndex + 2] = link.positions[2];
				linePositions[baseIndex + 3] = link.positions[3];
				linePositions[baseIndex + 4] = link.positions[4];
				linePositions[baseIndex + 5] = link.positions[5];

				lineColors[baseIndex] = link.colors[0];
				lineColors[baseIndex + 1] = link.colors[1];
				lineColors[baseIndex + 2] = link.colors[2];
				lineColors[baseIndex + 3] = link.colors[3];
				lineColors[baseIndex + 4] = link.colors[4];
				lineColors[baseIndex + 5] = link.colors[5];

				lineVertexIndex++;
			}
		}

		// Geometry更新
		const lineGeometry = linesRef.current.geometry;
		lineGeometry.setDrawRange(0, lineVertexIndex * 2);
		lineGeometry.attributes.position.needsUpdate = true;
		
		if (lastLineCount.current !== lineVertexIndex) {
			lineGeometry.attributes.color.needsUpdate = true;
			lastLineCount.current = lineVertexIndex;
		}
		
		// パーティクル位置の更新
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
