import './App.css'
import {Canvas} from "@react-three/fiber";
import {Scene} from "./Scene..tsx";

function App() {
  return (
      <div style={{width: "100vw", height: "100vh"}}>
        <Canvas>
          <Scene/>
        </Canvas>
      </div>
  )
}

export default App
