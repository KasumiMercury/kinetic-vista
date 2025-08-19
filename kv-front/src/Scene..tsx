import { OrbitControls, Sky } from "@react-three/drei";
import { Suspense } from "react";
import { Model } from "./Object";

export function Scene() {
  return (
      <>
        <Sky />

        <Suspense fallback={null}>
          <Model />
        </Suspense>

        <pointLight color={"#ffffff"} intensity={1} position={[0, 0, 0]} />

        <ambientLight intensity={10} />
        <OrbitControls />
      </>
  );
}
