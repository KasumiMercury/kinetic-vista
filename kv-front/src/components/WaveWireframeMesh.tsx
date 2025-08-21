import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface WaveWireframeMeshProps {
  size?: number
  segments?: number
  waveSpeed?: number
  waveAmplitude?: number
  waveFrequency?: number
  waveDecay?: number
  noiseScale?: number
  noiseAmplitude?: number
  color?: string
  position?: [number, number, number]
  waveCount?: number
  waveInterval?: number
}

function noise(x: number, y: number): number {
  const n = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453
  return (n - Math.floor(n)) * 2 - 1
}

function smoothNoise(x: number, y: number): number {
  const corners = (noise(x - 1, y - 1) + noise(x + 1, y - 1) + noise(x - 1, y + 1) + noise(x + 1, y + 1)) / 16
  const sides = (noise(x - 1, y) + noise(x + 1, y) + noise(x, y - 1) + noise(x, y + 1)) / 8
  const center = noise(x, y) / 4
  return corners + sides + center
}

export function WaveWireframeMesh({
  size = 20,
  segments = 128,
  waveSpeed = 2,
  waveAmplitude = 0.5,
  waveFrequency = 0.5,
  waveDecay = 0.1,
  noiseScale = 0.1,
  noiseAmplitude = 0.1,
  color = '#00ffff',
  position = [0, 0, 0],
  waveCount = 3,
  waveInterval = 2.0
}: WaveWireframeMeshProps) {
  const meshRef = useRef<THREE.Mesh>(null)
  const geometryRef = useRef<THREE.PlaneGeometry>(null)
  
  const { originalPositions, noiseValues } = useMemo(() => {
    const geometry = new THREE.PlaneGeometry(size, size, segments, segments)
    const positions = geometry.attributes.position.array.slice()
    const noise = new Float32Array((segments + 1) * (segments + 1))
    
    for (let y = 0; y <= segments; y++) {
      for (let x = 0; x <= segments; x++) {
        const i = y * (segments + 1) + x
        const nx = (x / segments - 0.5) * noiseScale
        const ny = (y / segments - 0.5) * noiseScale
        noise[i] = smoothNoise(nx * 10, ny * 10)
      }
    }
    
    return { originalPositions: positions, noiseValues: noise }
  }, [size, segments, noiseScale])

  return (
    <mesh ref={meshRef} position={position} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry
        ref={geometryRef}
        args={[size, size, segments, segments]}
      />
      <meshBasicMaterial
        color={color}
        wireframe={true}
        transparent={true}
        opacity={0.8}
      />
    </mesh>
  )
}