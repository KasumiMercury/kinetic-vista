import { CameraControls, CameraControlsImpl, Sky } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useSmoothRotation } from "./hooks/useSmoothRotation";
// import {Perf} from "r3f-perf";
import { Suspense, useEffect, useRef, useState } from "react";
import { ParticleNetwork } from "./components/ParticleNetwork";
import { ResidentialPlane } from "./components/ResidentialPlane";
// import {WaveWireframeMesh} from "./components/WaveWireframeMesh";
import { AllModels, type ModelComponent } from "./model";
import { getLocationFromEnvironment } from "./utils/geolocation";
import { OctahedronMarkers } from "./components/OctahedronMarkers";
import {
	calculateSkyParameters,
	calculateSolarPosition,
	type SkyParameters,
} from "./utils/solarPosition";

type SceneProps = {
    rotation: number;
    useCameraControls: boolean; // true: sensor mode, false: drag mode
    onRotationChange?: (value: number) => void;
    compassOffset?: number;
    timeOverride?: number | null;
    selectedLandmarks?: string[];
    markerColor?: string;
};

export function Scene({
    rotation,
    useCameraControls,
    onRotationChange,
    compassOffset = 0,
    timeOverride,
    selectedLandmarks,
    markerColor,
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

	// Smooth manual (drag) rotation to avoid stutter; sensor already smoothed in App
	const manualSmoothRotation = useSmoothRotation(rotation, {
		interpolationSpeed: 0.15,
		threshold: 0.05,
	});
	const displayedRotation = useCameraControls ? rotation : manualSmoothRotation;

	useFrame(() => {
		if (controlsRef.current) {
			controlsRef.current.setPosition(0, 0.2, 0);
			const targetRadius = 5;
			const target = convertCompassToTarget(displayedRotation, targetRadius);
			controlsRef.current.setTarget(target.x, 0, target.z);
		}
	});

	// Keep live rotation in a ref for drag start
	const liveRotationRef = useRef(rotation);
	useEffect(() => {
		liveRotationRef.current = rotation;
	}, [rotation]);

	// Horizontal-only drag handling for manual mode (no zoom/pan, position fixed)
	useEffect(() => {
		if (useCameraControls) return; // only in drag mode
		const el = gl.domElement;

		let dragging = false;
		let startX = 0;
		let startRotation = liveRotationRef.current;
		const sensitivity = 0.25; // degrees per pixel

		const normalize = (deg: number) => {
			let d = deg % 360;
			if (d < 0) d += 360;
			return d;
		};

		const onDown = (e: PointerEvent) => {
			dragging = true;
			startX = e.clientX;
			startRotation = liveRotationRef.current;
			el.setPointerCapture(e.pointerId);
			e.preventDefault();
		};

		const onMove = (e: PointerEvent) => {
			if (!dragging) return;
			const dx = e.clientX - startX;
			const next = normalize(startRotation - dx * sensitivity);
			onRotationChange?.(next);
			e.preventDefault();
		};

		const onUp = (e: PointerEvent) => {
			dragging = false;
			try {
				el.releasePointerCapture(e.pointerId);
			} catch {}
			e.preventDefault();
		};

		el.addEventListener("pointerdown", onDown, { passive: false });
		window.addEventListener("pointermove", onMove, { passive: false });
		window.addEventListener("pointerup", onUp, { passive: false });
		window.addEventListener("pointercancel", onUp, { passive: false });

		return () => {
			el.removeEventListener("pointerdown", onDown as any);
			window.removeEventListener("pointermove", onMove as any);
			window.removeEventListener("pointerup", onUp as any);
			window.removeEventListener("pointercancel", onUp as any);
		};
	}, [gl, useCameraControls, onRotationChange]);

	// Marker spin speed (radians per second). Adjust here centrally.
	const markerSpinSpeed = 0.6;

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

            <OctahedronMarkers
                color={markerColor ?? "#ff3366"}
                coordMap={{ xKey: "x", zKey: "y", invertZ: true }}
                height={0.1}
                spinSpeed={markerSpinSpeed}
                selectedKeys={selectedLandmarks}
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
				connectionUpdateInterval={2}
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
		</>
	);
}
