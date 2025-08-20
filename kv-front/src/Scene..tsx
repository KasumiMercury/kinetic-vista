import { OrbitControls, Sky } from "@react-three/drei";
import { Suspense } from "react";
import { AllModels, type ModelComponent } from "./model";

export function Scene() {
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
			<OrbitControls />
		</>
	);
}
