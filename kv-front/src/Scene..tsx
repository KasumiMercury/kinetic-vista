import { CameraControls, CameraControlsImpl, Sky } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { Suspense, useRef } from "react";
import { AllModels, type ModelComponent } from "./model";

type SceneProps = {
	rotation: number;
};

export function Scene({ rotation }: SceneProps) {
	const { ACTION } = CameraControlsImpl;
	const controlsRef = useRef<CameraControlsImpl>(null);

	useFrame(() => {
		if (controlsRef.current) {
			const radius = 10;
			const x = Math.sin(rotation) * radius;
			const z = Math.cos(rotation) * radius;
			
			controlsRef.current.setPosition(x, 1, z);
			controlsRef.current.setTarget(0, 0, 0);
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

			<pointLight color={"#ffffff"} intensity={1} position={[0, 0, 0]} />

			<ambientLight intensity={10} />
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
