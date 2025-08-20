import "./App.css";
import {Canvas} from "@react-three/fiber";
import {useId, useState} from "react";
import {Scene} from "./Scene..tsx";

function App() {
  const [rotation, setRotation] = useState(0);
  const [useCameraControls, setUseCameraControls] = useState(true);
  const sliderId = useId();

  return (
      <div style={{width: "100vw", height: "100vh"}}>
        {/* Camera Controls */}
        <div style={{
          position: "absolute",
          top: "20px",
          left: "20px",
          zIndex: 100,
          color: "white",
          background: "rgba(0, 0, 0, 0.5)",
          padding: "10px",
          borderRadius: "5px"
        }}>
          <label>
            <input
              type="checkbox"
              checked={useCameraControls}
              onChange={(e) => setUseCameraControls(e.target.checked)}
            />
            Use CameraControls (with slider)
          </label>
          <br/>
          <label htmlFor={sliderId}>
            Camera Rotation: {Math.round(rotation * 180 / Math.PI)}°
          </label>
          <br/>
          <input
              id={sliderId}
              type="range"
              min={0}
              max={Math.PI * 2}
              step={0.01}
              value={rotation}
              onChange={(e) => setRotation(parseFloat(e.target.value))}
              style={{width: "200px"}}
          />
        </div>

        <Canvas>
          <Scene rotation={rotation} useCameraControls={useCameraControls}/>
        </Canvas>
      </div>
  );
}

export default App;
