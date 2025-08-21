import { forwardRef } from 'react';
import * as THREE from 'three';

interface DirectionalColorMaterialProps {
  transparent?: boolean;
  opacity?: number;
  side?: THREE.Side;
}

export const DirectionalColorMaterial = forwardRef<
  THREE.MeshStandardMaterial,
  DirectionalColorMaterialProps
>(({ transparent = true, opacity = 0.5, side = THREE.DoubleSide, ...props }, ref) => {
  return (
    <meshStandardMaterial
      ref={ref}
      transparent={transparent}
      opacity={opacity}
      side={side}
      {...props}
      onBeforeCompile={(shader) => {
        shader.vertexShader = shader.vertexShader.replace(
          '#include <common>',
          `
          #include <common>
          varying vec3 vWorldNormal;
          varying vec3 vWorldPosition;
          `
        );

        shader.vertexShader = shader.vertexShader.replace(
          '#include <worldpos_vertex>',
          `
          #include <worldpos_vertex>
          vWorldNormal = normalize((modelMatrix * vec4(normal, 0.0)).xyz);
          vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
          `
        );

        shader.fragmentShader = shader.fragmentShader.replace(
          '#include <common>',
          `
          #include <common>
          varying vec3 vWorldNormal;
          varying vec3 vWorldPosition;
          `
        );

        shader.fragmentShader = shader.fragmentShader.replace(
          'vec4 diffuseColor = vec4( diffuse, opacity );',
          `
          vec3 normalizedWorldNormal = normalize(vWorldNormal);
          
          if (vWorldPosition.y < -0.1 && normalizedWorldNormal.y < -0.1) {
            discard;
          }
          
          vec3 directionalColor = normalizedWorldNormal * 0.5 + 0.5;
          vec4 diffuseColor = vec4( directionalColor, opacity );
          `
        );
      }}
    />
  );
});

DirectionalColorMaterial.displayName = 'DirectionalColorMaterial';