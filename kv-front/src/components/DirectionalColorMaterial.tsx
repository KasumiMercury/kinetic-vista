import { forwardRef } from 'react';
import { DoubleSide } from 'three';
import type { MeshStandardMaterialProps } from '@react-three/fiber';

interface DirectionalColorMaterialProps extends Omit<MeshStandardMaterialProps, 'color'> {
  transparent?: boolean;
  opacity?: number;
  side?: typeof DoubleSide;
}

export const DirectionalColorMaterial = forwardRef<
  THREE.MeshStandardMaterial,
  DirectionalColorMaterialProps
>(({ transparent = true, opacity = 0.5, side = DoubleSide, ...props }, ref) => {
  return (
    <meshStandardMaterial
      ref={ref}
      transparent={transparent}
      opacity={opacity}
      side={side}
      {...props}
      onBeforeCompile={(shader) => {
        // バーテックスシェーダーに法線情報を追加
        shader.vertexShader = shader.vertexShader.replace(
          '#include <common>',
          `
          #include <common>
          varying vec3 vWorldNormal;
          `
        );

        shader.vertexShader = shader.vertexShader.replace(
          '#include <worldpos_vertex>',
          `
          #include <worldpos_vertex>
          vWorldNormal = normalize((modelMatrix * vec4(normal, 0.0)).xyz);
          `
        );

        // フラグメントシェーダーで法線ベクトルを色に変換
        shader.fragmentShader = shader.fragmentShader.replace(
          '#include <common>',
          `
          #include <common>
          varying vec3 vWorldNormal;
          `
        );

        shader.fragmentShader = shader.fragmentShader.replace(
          'vec4 diffuseColor = vec4( diffuse, opacity );',
          `
          // 法線ベクトルを0-1の範囲にマッピングして色に変換
          vec3 directionalColor = normalize(vWorldNormal) * 0.5 + 0.5;
          vec4 diffuseColor = vec4( directionalColor, opacity );
          `
        );
      }}
    />
  );
});

DirectionalColorMaterial.displayName = 'DirectionalColorMaterial';