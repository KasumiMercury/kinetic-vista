import {
	CameraControls,
	CameraControlsImpl,
	OrbitControls,
	Sky,
} from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { Suspense, useRef } from "react";
import { AllModels, type ModelComponent } from "./model";

type SceneProps = {
	rotation: number;
	useCameraControls: boolean;
};

export function Scene({ rotation, useCameraControls }: SceneProps) {
	const { ACTION } = CameraControlsImpl;
	const controlsRef = useRef<CameraControlsImpl>(null);

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
			<Sky />

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
