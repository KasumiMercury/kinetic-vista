import {
	CameraControls,
	CameraControlsImpl,
	OrbitControls,
	Sky,
} from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
// import {Perf} from "r3f-perf";
import { Suspense, useEffect, useRef, useState } from "react";
import { ParticleNetwork } from "./components/ParticleNetwork";
import { ResidentialPlane } from "./components/ResidentialPlane";
// import {WaveWireframeMesh} from "./components/WaveWireframeMesh";
import { AllModels, type ModelComponent } from "./model";
import { getLocationFromEnvironment } from "./utils/geolocation";
import { CylinderMarkers } from "./components/CylinderMarkers";
import {
	calculateSkyParameters,
	calculateSolarPosition,
	type SkyParameters,
} from "./utils/solarPosition";

type SceneProps = {
	rotation: number;
	useCameraControls: boolean;
	compassOffset?: number;
	timeOverride?: number | null;
};

export function Scene({
	rotation,
	useCameraControls,
	compassOffset = 0,
	timeOverride,
}: SceneProps) {
	const { ACTION } = CameraControlsImpl;
	const controlsRef = useRef<CameraControlsImpl>(null);
	const { gl } = useThree();
	const [skyParams, setSkyParams] = useState<SkyParameters>({
		sunPosition: [0, 1, 0],
		turbidity: 10,
		rayleigh: 1,
		mieCoefficient: 0.005,
		mieDirectionalG: 0.7,
		exposure: 1,
	});

	useEffect(() => {
		const initializeSkyParameters = () => {
			try {
				const coordinates = getLocationFromEnvironment();
				let currentTime = new Date();

				if (timeOverride !== null && timeOverride !== undefined) {
					currentTime = new Date();
					currentTime.setHours(timeOverride, 0, 0, 0);
				}

				const solarPos = calculateSolarPosition(currentTime, coordinates);
				const params = calculateSkyParameters(solarPos, compassOffset);
				setSkyParams(params);

				gl.toneMappingExposure = params.exposure;
			} catch (error) {
				console.error("Failed to calculate sky parameters:", error);
			}
		};

		initializeSkyParameters();
	}, [gl, compassOffset, timeOverride]);

	const convertCompassToTarget = (compassDegrees: number, radius: number) => {
		const rotationRad = ((-compassDegrees + 90) * Math.PI) / 180;

		return {
			x: Math.cos(rotationRad) * radius, // 東西方向
			z: -Math.sin(rotationRad) * radius, // 南北方向
		};
	};

	useFrame(() => {
		if (controlsRef.current && useCameraControls) {
			controlsRef.current.setPosition(0, 0.2, 0);

			const targetRadius = 5;
			const target = convertCompassToTarget(rotation, targetRadius);

			controlsRef.current.setTarget(target.x, 0, target.z);
		}
	});

	return (
		<>
			{/*<Perf/>*/}

			<fog attach="fog" args={["#87CEEB", 5, 40]} />

			<Sky
				sunPosition={skyParams.sunPosition}
				turbidity={skyParams.turbidity}
				rayleigh={skyParams.rayleigh}
				mieCoefficient={skyParams.mieCoefficient}
				mieDirectionalG={skyParams.mieDirectionalG}
			/>

			<Suspense fallback={null}>
				{AllModels.map(({ path, component: ModelComponent }) => {
					const Component = ModelComponent as ModelComponent;
					return <Component key={path} />;
				})}
			</Suspense>

			<CylinderMarkers
				radius={0.2}
				color="#ff3366"
				coordMap={{ xKey: "x", zKey: "y", invertZ: true }}
                height={10}
			/>

			{/*<WaveWireframeMesh*/}
			{/*    size={60}*/}
			{/*    segments={192}*/}
			{/*    waveSpeed={1}*/}
			{/*    waveAmplitude={0.01}*/}
			{/*    waveFrequency={0.8}*/}
			{/*    waveDecay={0.03}*/}
			{/*    noiseScale={0.15}*/}
			{/*    noiseAmplitude={0.04}*/}
			{/*    color="#00ccee"*/}
			{/*    position={[0, -0.2, 0]}*/}
			{/*    waveCount={12}*/}
			{/*    waveInterval={0.1}*/}
			{/*/>*/}

			<ParticleNetwork
				particleCount={1500}
				centerPosition={[0, -0.1, 0]}
				yRange={0.15}
				spawnRange={20}
				maxLinkDistance={0.35}
				linkColor="#87ceeb"
				particleColor="#ffffff"
				particleSize={0.02}
				velocityRange={0.005}
				densityFalloff={3}
				gridDivisions={9}
				maxConnections={3}
				connectionUpdateInterval={10}
				timeScale={24}
			/>

			<ResidentialPlane
				size={60}
				position={[0, -0.25, 0]}
				textureRepeat={[100, 100]}
				bumpScale={30}
				color="#ffffff"
			/>

			<directionalLight
				position={skyParams.sunPosition}
				intensity={6}
				castShadow
				shadow-mapSize-width={1024}
				shadow-mapSize-height={1024}
				shadow-camera-far={30}
				shadow-camera-left={-10}
				shadow-camera-right={10}
				shadow-camera-top={10}
				shadow-camera-bottom={-10}
				shadow-bias={-0.001}
				shadow-normalBias={0.005}
			/>
			<ambientLight intensity={5} />

			{useCameraControls ? (
				<CameraControls
					ref={controlsRef}
					makeDefault
					mouseButtons={{
						left: ACTION.NONE,
						middle: ACTION.NONE,
						right: ACTION.NONE,
						wheel: ACTION.NONE,
					}}
					touches={{
						one: ACTION.NONE,
						two: ACTION.NONE,
						three: ACTION.NONE,
					}}
				/>
			) : (
				<OrbitControls />
			)}
		</>
	);
}
