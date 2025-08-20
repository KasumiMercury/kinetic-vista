import "./App.css";
import { Canvas } from "@react-three/fiber";
import { useId, useState } from "react";
import { Scene } from "./Scene..tsx";

function App() {
	const [rotation, setRotation] = useState(0);
	const sliderId = useId();

	return (
		<div style={{ width: "100vw", height: "100vh" }}>
			{/* Camera Rotation Slider */}
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
				<label htmlFor={sliderId}>
					Camera Rotation: {Math.round(rotation * 180 / Math.PI)}°
				</label>
				<br />
				<input
					id={sliderId}
					type="range"
					min={0}
					max={Math.PI * 2}
					step={0.01}
					value={rotation}
					onChange={(e) => setRotation(parseFloat(e.target.value))}
					style={{ width: "200px" }}
				/>
			</div>

			<Canvas camera={{ position: [0, 10, 0] }}>
				<Scene rotation={rotation} />
			</Canvas>
		</div>
	);
}

export default App;
