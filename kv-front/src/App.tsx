import "./App.css";
import { Canvas } from "@react-three/fiber";
import { useId, useState } from "react";
import { Scene } from "./Scene.tsx";

function App() {
	const [rotation, setRotation] = useState(0); // 度数で管理 (0-360°)
	const [useCameraControls, setUseCameraControls] = useState(true);
	const [timeOverride, setTimeOverride] = useState<number | null>(null); // 時刻オーバーライド (0-23時間)
	const sliderId = useId();
	const timeId = useId();

	// 現在時刻を取得
	const currentHour = new Date().getHours();

	return (
		<div style={{ width: "100vw", height: "100vh" }}>
			{/* Camera Controls */}
			<div
				style={{
					position: "absolute",
					top: "20px",
					left: "20px",
					zIndex: 100,
					color: "white",
					background: "rgba(0, 0, 0, 0.5)",
					padding: "10px",
					borderRadius: "5px",
				}}
			>
				<label>
					<input
						type="checkbox"
						checked={useCameraControls}
						onChange={(e) => setUseCameraControls(e.target.checked)}
					/>
					Use CameraControls (with slider)
				</label>
				<br />
				<label htmlFor={sliderId}>
					Camera Rotation: {Math.round(rotation)}°
				</label>
				<br />
				<input
					id={sliderId}
					type="range"
					min={0}
					max={360}
					step={10}
					value={rotation}
					onChange={(e) => setRotation(parseFloat(e.target.value))}
					style={{ width: "200px" }}
				/>
				<br />
				<br />
				<label>
					<input
						type="checkbox"
						checked={timeOverride !== null}
						onChange={(e) => setTimeOverride(e.target.checked ? 16 : null)}
					/>
					Override Time (Debug)
				</label>
				<br />
				<label htmlFor={timeId}>
					Time: {timeOverride !== null ? `${timeOverride}:00` : `${currentHour}:00 (Real-time)`}
				</label>
				<br />
				<input
					id={timeId}
					type="range"
					min={0}
					max={23}
					step={1}
					value={timeOverride ?? currentHour}
					disabled={timeOverride === null}
					onChange={(e) => setTimeOverride(parseInt(e.target.value, 10))}
					style={{ width: "200px" }}
				/>
			</div>

			<Canvas shadows>
				<Scene 
					rotation={rotation} 
					useCameraControls={useCameraControls}
					timeOverride={timeOverride}
				/>
			</Canvas>
		</div>
	);
}

export default App;
