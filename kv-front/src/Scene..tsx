import { OrbitControls, Sky } from "@react-three/drei";
import { Suspense } from "react";
import { AllModels } from "./model";

export function Scene() {
	return (
		<>
			<Sky />

			<Suspense fallback={null}>
				{AllModels.map((ModelComponent, index) => (
					<ModelComponent key={index} />
				))}
			</Suspense>

			<pointLight color={"#ffffff"} intensity={1} position={[0, 0, 0]} />

			<ambientLight intensity={10} />
			<OrbitControls />
		</>
	);
}
