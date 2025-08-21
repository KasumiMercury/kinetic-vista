import { forwardRef } from "react";
import * as THREE from "three";

interface DirectionalColorMaterialProps {
	transparent?: boolean;
	opacity?: number;
	side?: THREE.Side;
	positiveXColor?: string; // +X軸方向の色
	negativeXColor?: string; // -X軸方向の色
	positiveYColor?: string; // +Y軸方向の色
	negativeYColor?: string; // -Y軸方向の色
	positiveZColor?: string; // +Z軸方向の色
	negativeZColor?: string; // -Z軸方向の色
}

export const DirectionalColorMaterial = forwardRef<
	THREE.MeshStandardMaterial,
	DirectionalColorMaterialProps
>(
	(
		{ 
			transparent = false, 
			opacity = 0.5, 
			side = THREE.FrontSide,
			positiveXColor = "#ffb3b3",
			negativeXColor = "#b3ffb3",
			positiveYColor = "#b3b3ff",
			negativeYColor = "#ffb3ff",
			positiveZColor = "#ffb3ff",
			negativeZColor = "#b3ffff",
			...props 
		},
		ref,
	) => {
		return (
			<meshStandardMaterial
				ref={ref}
				transparent={transparent}
				opacity={opacity}
				side={side}
				{...props}
				onBeforeCompile={(shader) => {
					// uniform変数を追加
					shader.uniforms.uPositiveXColor = { value: new THREE.Color(positiveXColor) };
					shader.uniforms.uNegativeXColor = { value: new THREE.Color(negativeXColor) };
					shader.uniforms.uPositiveYColor = { value: new THREE.Color(positiveYColor) };
					shader.uniforms.uNegativeYColor = { value: new THREE.Color(negativeYColor) };
					shader.uniforms.uPositiveZColor = { value: new THREE.Color(positiveZColor) };
					shader.uniforms.uNegativeZColor = { value: new THREE.Color(negativeZColor) };

					shader.vertexShader = shader.vertexShader.replace(
						"#include <common>",
						`
          #include <common>
          varying vec3 vWorldNormal;
          varying vec3 vWorldPosition;
          `,
					);

					shader.vertexShader = shader.vertexShader.replace(
						"#include <worldpos_vertex>",
						`
          #include <worldpos_vertex>
          vWorldNormal = normalize((modelMatrix * vec4(normal, 0.0)).xyz);
          vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
          `,
					);

					shader.fragmentShader = shader.fragmentShader.replace(
						"#include <common>",
						`
          #include <common>
          varying vec3 vWorldNormal;
          varying vec3 vWorldPosition;
          uniform vec3 uPositiveXColor;
          uniform vec3 uNegativeXColor;
          uniform vec3 uPositiveYColor;
          uniform vec3 uNegativeYColor;
          uniform vec3 uPositiveZColor;
          uniform vec3 uNegativeZColor;
          `,
					);

					shader.fragmentShader = shader.fragmentShader.replace(
						"vec4 diffuseColor = vec4( diffuse, opacity );",
						`
          vec3 normalizedWorldNormal = normalize(vWorldNormal);
          
          if (vWorldPosition.y < -0.1 && normalizedWorldNormal.y < -0.1) {
            discard;
          }
          
          // 各軸方向の重みを計算
          vec3 absNormal = abs(normalizedWorldNormal);
          vec3 weights = absNormal / (absNormal.x + absNormal.y + absNormal.z);
          
          // 各軸方向の色を補間
          vec3 xColor = mix(uNegativeXColor, uPositiveXColor, (normalizedWorldNormal.x + 1.0) * 0.5);
          vec3 yColor = mix(uNegativeYColor, uPositiveYColor, (normalizedWorldNormal.y + 1.0) * 0.5);
          vec3 zColor = mix(uNegativeZColor, uPositiveZColor, (normalizedWorldNormal.z + 1.0) * 0.5);
          
          // 重み付け合成
          vec3 finalColor = xColor * weights.x + yColor * weights.y + zColor * weights.z;
          
          vec4 diffuseColor = vec4( finalColor, opacity );
          `,
					);
				}}
			/>
		);
	},
);

DirectionalColorMaterial.displayName = "DirectionalColorMaterial";