import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";

// Global object pool for performance optimization
const tempVector1 = new THREE.Vector3();
const tempVector2 = new THREE.Vector3();

interface ParticleNetworkProps {
	particleCount?: number;
	centerPosition?: [number, number, number];
	yRange?: number;
	spawnRange?: number;
	maxLinkDistance?: number;
	linkColor?: string;
	particleColor?: string;
	particleSize?: number;
	velocityRange?: number;
	densityFalloff?: number;
	gridDivisions?: number; // Number of grid divisions (must be odd, default: 5)
	maxConnections?: number; // Maximum connections per particle (default: 3)
	connectionUpdateInterval?: number; // Frames between connection updates (default: 3)
	timeScale?: number; // Time scale multiplier for consistent animation speed across devices (default: 60)
}

// Grid class for spatial partitioning optimization
class Grid {
	private cells: Map<number, number[]> = new Map();
	private planeSize: number;
	private cellSize: number;
	private halfPlaneSize: number;
	private gridSize: number;

	constructor(planeSize: number, cellSize: number) {
		this.planeSize = planeSize;
		this.cellSize = cellSize;
		this.halfPlaneSize = planeSize / 2;
		this.gridSize = Math.ceil(planeSize / cellSize);
	}

	clear(): void {
		this.cells.clear();
	}

	updateCellSize(cellSize: number): void {
		this.cellSize = cellSize;
		this.gridSize = Math.ceil(this.planeSize / cellSize);
		this.clear();
	}

	private getCellIndex(x: number, z: number): number {
		const gridX = Math.floor((x + this.halfPlaneSize) / this.cellSize);
		const gridZ = Math.floor((z + this.halfPlaneSize) / this.cellSize);
		return gridZ * this.gridSize + gridX;
	}

	add(particleIndex: number, x: number, z: number): void {
		const index = this.getCellIndex(x, z);
		if (!this.cells.has(index)) {
			this.cells.set(index, []);
		}
		this.cells.get(index)?.push(particleIndex);
	}

	getNearbyParticles(x: number, z: number): number[] {
		const nearby: number[] = [];
		const gridX = Math.floor((x + this.halfPlaneSize) / this.cellSize);
		const gridZ = Math.floor((z + this.halfPlaneSize) / this.cellSize);

		// Check 3x3 grid around the particle
		for (let deltaZ = -1; deltaZ <= 1; deltaZ++) {
			for (let deltaX = -1; deltaX <= 1; deltaX++) {
				const checkX = gridX + deltaX;
				const checkZ = gridZ + deltaZ;
				
				if (checkX < 0 || checkX >= this.gridSize || checkZ < 0 || checkZ >= this.gridSize) {
					continue;
				}
				
				const cellIndex = checkZ * this.gridSize + checkX;
				const particles = this.cells.get(cellIndex);
				
				if (particles) {
					nearby.push(...particles);
				}
			}
		}
		
		return nearby;
	}
}

export function ParticleNetwork({
	particleCount = 400,
	centerPosition = [0, 0, 0],
	yRange = 5,
	spawnRange = 1000,
	maxLinkDistance = 150,
	linkColor = "#ffffff",
	particleColor = "#ffffff",
	particleSize = 4,
	velocityRange = 0.5,
	densityFalloff = 0,
	gridDivisions = 5,
	maxConnections = 3,
	connectionUpdateInterval = 3,
	timeScale = 60,
}: ParticleNetworkProps) {
	const particlesRef = useRef<THREE.Points>(null);
	const linesRef = useRef<THREE.LineSegments>(null);
	const lastLineCount = useRef(0);

	// Grid system for spatial optimization
	const gridRef = useRef<Grid | null>(null);
	const frameCounter = useRef(0);
	const accumulatedTime = useRef(0);
	const connectionCounts = useRef<number[]>([]);
	const initialConnectionsCalculated = useRef(false);
	
	const targetUpdateInterval = connectionUpdateInterval / 60;
	
	const actualGridDivisions = useMemo(() => gridDivisions % 2 === 0 ? gridDivisions + 1 : gridDivisions, [gridDivisions]);

	const memoizedCenterPosition = useMemo(() => centerPosition, [centerPosition[0], centerPosition[1], centerPosition[2]]);

	const { particlePositions, particleVelocities, linePositions } =
		useMemo(() => {
			const positions = new Float32Array(particleCount * 3);
			const velocities = new Float32Array(particleCount * 3);

			for (let i = 0; i < particleCount; i++) {
				const i3 = i * 3;
				let x: number, y: number, z: number, distance: number, probability: number;
				do {
					x = (Math.random() * 2 - 1) * spawnRange;
					y = (Math.random() * 2 - 1) * yRange;
					z = (Math.random() * 2 - 1) * spawnRange;
					distance = Math.sqrt(x * x + z * z) / spawnRange;
					probability =
						densityFalloff > 0 ? (1 - distance) ** densityFalloff : 1;
				} while (densityFalloff > 0 && Math.random() > probability);

				positions[i3] = memoizedCenterPosition[0] + x;
				positions[i3 + 1] = memoizedCenterPosition[1] + y;
				positions[i3 + 2] = memoizedCenterPosition[2] + z;

				velocities[i3] = (Math.random() - 0.5) * velocityRange * 0.3;
				velocities[i3 + 1] = (Math.random() - 0.5) * (velocityRange * 0.05);
				velocities[i3 + 2] = (Math.random() - 0.5) * velocityRange * 0.3;
			}

			const maxLineCount = particleCount * maxConnections;
			const linePos = new Float32Array(maxLineCount * 3 * 2);

			// Initialize connection counts
			connectionCounts.current = new Array(particleCount).fill(0);

			// Initialize grid system with appropriate cell size
			const cellSize = Math.max(maxLinkDistance * 1.2, spawnRange / actualGridDivisions);
			gridRef.current = new Grid(spawnRange * 2, cellSize);

			initialConnectionsCalculated.current = false;

			return {
				particlePositions: positions,
				particleVelocities: velocities,
				linePositions: linePos,
			};
		}, [particleCount, memoizedCenterPosition, yRange, spawnRange, velocityRange, densityFalloff, maxConnections, maxLinkDistance, actualGridDivisions]);

	useFrame((_state, delta) => {
		if (!particlesRef.current || !linesRef.current || !gridRef.current) return;

		frameCounter.current++;
		accumulatedTime.current += delta;

		const positions = particlesRef.current.geometry.attributes.position
			.array as Float32Array;
		const velocities = particleVelocities;

		const linePositions = linesRef.current.geometry.attributes.position
			.array as Float32Array;

		const boxSizeX = spawnRange;
		const boxSizeY = yRange;
		const boxSizeZ = spawnRange;

		for (let i = 0; i < particleCount; i++) {
			const i3 = i * 3;

			const deltaTimeScaled = delta * timeScale;
			
			positions[i3] += velocities[i3] * deltaTimeScaled;
			positions[i3 + 1] += velocities[i3 + 1] * deltaTimeScaled;
			positions[i3 + 2] += velocities[i3 + 2] * deltaTimeScaled;

			const baseX = memoizedCenterPosition[0];
			const baseY = memoizedCenterPosition[1];
			const baseZ = memoizedCenterPosition[2];

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

		const shouldUpdateConnections = !initialConnectionsCalculated.current || accumulatedTime.current >= targetUpdateInterval;
		
		if (shouldUpdateConnections) {
			if (initialConnectionsCalculated.current) {
				accumulatedTime.current = 0;
			}
			initialConnectionsCalculated.current = true;
			
			// Clear and rebuild grid
			gridRef.current.clear();
			
			// Reset connection counts
			connectionCounts.current.fill(0);
			
			// Add all particles to grid
			for (let i = 0; i < particleCount; i++) {
				const i3 = i * 3;
				gridRef.current.add(i, positions[i3], positions[i3 + 2]);
			}

			let lineVertexIndex = 0;

			// Grid-based connection calculation
			for (let i = 0; i < particleCount; i++) {
				if (connectionCounts.current[i] >= maxConnections) continue;

				const i3 = i * 3;
				const nearbyParticles = gridRef.current.getNearbyParticles(positions[i3], positions[i3 + 2]);

				for (const j of nearbyParticles) {
					if (i >= j || connectionCounts.current[i] >= maxConnections || connectionCounts.current[j] >= maxConnections) continue;

					const j3 = j * 3;

					tempVector1.set(positions[i3], positions[i3 + 1], positions[i3 + 2]);
					tempVector2.set(positions[j3], positions[j3 + 1], positions[j3 + 2]);

					const distSq = tempVector1.distanceToSquared(tempVector2);

					// Dynamic link distance calculation
					const dx1 = tempVector1.x - memoizedCenterPosition[0];
					const dz1 = tempVector1.z - memoizedCenterPosition[2];
					const centerDistanceSqP1 = dx1 * dx1 + dz1 * dz1;
					const centerDistanceP1 = Math.sqrt(centerDistanceSqP1) / spawnRange;
					
					const dx2 = tempVector2.x - memoizedCenterPosition[0];
					const dz2 = tempVector2.z - memoizedCenterPosition[2];
					const centerDistanceSqP2 = dx2 * dx2 + dz2 * dz2;
					const centerDistanceP2 = Math.sqrt(centerDistanceSqP2) / spawnRange;

					const avgCenterDistance = (centerDistanceP1 + centerDistanceP2) / 2;
					const dynamicMaxDistance = densityFalloff > 0
						? maxLinkDistance * (1 + avgCenterDistance * densityFalloff * 0.5)
						: maxLinkDistance;
					const dynamicMaxDistanceSquared = dynamicMaxDistance * dynamicMaxDistance;

					if (distSq < dynamicMaxDistanceSquared) {
						// Create connection
						connectionCounts.current[i]++;
						connectionCounts.current[j]++;

						const baseIndex = lineVertexIndex * 6;
						linePositions[baseIndex] = tempVector1.x;
						linePositions[baseIndex + 1] = tempVector1.y;
						linePositions[baseIndex + 2] = tempVector1.z;
						linePositions[baseIndex + 3] = tempVector2.x;
						linePositions[baseIndex + 4] = tempVector2.y;
						linePositions[baseIndex + 5] = tempVector2.z;

						lineVertexIndex++;
						
						// Break if we've reached max connections for particle i
						if (connectionCounts.current[i] >= maxConnections) break;
					}
				}
			}

			// Update geometry
			const lineGeometry = linesRef.current.geometry;
			lineGeometry.setDrawRange(0, lineVertexIndex * 2);
			lineGeometry.attributes.position.needsUpdate = true;
			
			lastLineCount.current = lineVertexIndex;
		}
		
		// Update particle positions (every frame)
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
					toneMapped={false}
				/>
			</points>

			<lineSegments ref={linesRef}>
				<bufferGeometry>
					<bufferAttribute
						args={[linePositions, 3]}
						attach="attributes-position"
						count={particleCount * maxConnections * 2}
						usage={THREE.DynamicDrawUsage}
					/>
				</bufferGeometry>
				<lineBasicMaterial 
					color={linkColor}
					linewidth={1}
					transparent 
					fog
					toneMapped={false}
				/>
			</lineSegments>
		</>
	);
}
