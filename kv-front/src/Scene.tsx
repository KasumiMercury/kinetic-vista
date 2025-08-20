import {
	CameraControls,
	CameraControlsImpl,
	OrbitControls,
	Sky,
} from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { Suspense, useEffect, useRef, useState } from "react";
import { AllModels, type ModelComponent } from "./model";
import { getLocationFromEnvironment } from "./utils/geolocation";
import { calculateSolarPosition, calculateSkyParameters, type SkyParameters } from "./utils/solarPosition";

type SceneProps = {
	rotation: number;
	useCameraControls: boolean;
};

export function Scene({ rotation, useCameraControls }: SceneProps) {
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
				const currentTime = new Date();
				const solarPos = calculateSolarPosition(currentTime, coordinates);
				const params = calculateSkyParameters(solarPos);
				setSkyParams(params);

				gl.toneMappingExposure = params.exposure;
			} catch (error) {
				console.error("Failed to calculate sky parameters:", error);
			}
		};

		initializeSkyParameters();
	}, [gl]);

	const convertCompassToTarget = (compassDegrees: number, radius: number) => {
		const rotationRad = ((-compassDegrees + 90) * Math.PI) / 180;
		
		return {
			x: Math.cos(rotationRad) * radius,  // 東西方向
			z: -Math.sin(rotationRad) * radius  // 南北方向
		};
	};

	useFrame(() => {
		if (controlsRef.current && useCameraControls) {
			controlsRef.current.setPosition(0, 0.1, 0);

			const targetRadius = 5;
			const target = convertCompassToTarget(rotation, targetRadius);

			controlsRef.current.setTarget(target.x, 0, target.z);
		}
	});

	return (
		<>
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

			<ambientLight intensity={10} />

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
