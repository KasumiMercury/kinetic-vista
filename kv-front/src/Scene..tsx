import {CameraControls, CameraControlsImpl, Sky} from "@react-three/drei";
import {useFrame} from "@react-three/fiber";
import {Suspense, useRef} from "react";
import {AllModels, type ModelComponent} from "./model";

type SceneProps = {
  rotation: number;
};

export function Scene({rotation}: SceneProps) {
  const {ACTION} = CameraControlsImpl;
  const controlsRef = useRef<CameraControlsImpl>(null);

  useFrame(() => {
    if (controlsRef.current) {
      controlsRef.current.setPosition(0, 0.1, 0);

      const targetRadius = 5;
      const targetX = Math.sin(rotation) * targetRadius;
      const targetZ = Math.cos(rotation) * targetRadius;

      controlsRef.current.setTarget(targetX, 0, targetZ);
    }
  });

  return (
      <>
        <Sky/>

        <Suspense fallback={null}>
          {AllModels.map(({path, component: ModelComponent}) => {
            const Component = ModelComponent as ModelComponent;
            return <Component key={path}/>;
          })}
        </Suspense>

        <ambientLight intensity={10}/>

        {/*<OrbitControls></OrbitControls>*/}
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
