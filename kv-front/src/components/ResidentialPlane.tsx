import { useMemo } from 'react'
import { useLoader } from '@react-three/fiber'
import { TextureLoader, RepeatWrapping } from 'three'

interface ResidentialPlaneProps {
  size?: number
  position?: [number, number, number]
  rotation?: [number, number, number]
  textureRepeat?: [number, number]
  bumpScale?: number
  color?: string
}

export function ResidentialPlane({
  size = 50,
  position = [0, 0, 0],
  rotation = [-Math.PI / 2, 0, 0],
  textureRepeat = [10, 10],
  bumpScale = 0.1,
  color = "#8b7355"
}: ResidentialPlaneProps) {
  const bumpTexture = useLoader(TextureLoader, '/bump.png')
  
  useMemo(() => {
    bumpTexture.wrapS = RepeatWrapping
    bumpTexture.wrapT = RepeatWrapping
    bumpTexture.repeat.set(textureRepeat[0], textureRepeat[1])
  }, [bumpTexture, textureRepeat])

  return (
    <mesh position={position} rotation={rotation} receiveShadow>
      <planeGeometry args={[size, size]} />
      <meshStandardMaterial
        color={color}
        bumpMap={bumpTexture}
        bumpScale={bumpScale}
        roughness={0.8}
        metalness={0.1}
      />
    </mesh>
  )
}
