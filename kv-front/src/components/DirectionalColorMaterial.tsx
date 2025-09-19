import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
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
	wireframe?: boolean; // ワイヤーフレームのオーバーレイを有効化
	wireframeColor?: string; // ワイヤーフレームラインの色
	wireframeOpacity?: number; // ワイヤーフレームラインの不透明度
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
			positiveXColor = "#ff8a5c",
			negativeXColor = "#2acfb3",
			positiveYColor = "#4a9df6",
			negativeYColor = "#ffe16a",
			positiveZColor = "#b678ff",
			negativeZColor = "#3dd1ff",
			wireframe = true,
			wireframeColor = "#ffffff",
			wireframeOpacity = 1,
			...props
		},
		ref,
	) => {
		const { scene } = useThree();
		const materialRef = useRef<THREE.MeshStandardMaterial | null>(null);
		const wireframeSegmentsRef = useRef<THREE.LineSegments | null>(null);
		const wireframeMeshRef = useRef<THREE.Mesh | null>(null);
		const wireframeColorRef = useRef(wireframeColor);
		const wireframeOpacityRef = useRef(wireframeOpacity);

		useImperativeHandle(ref, () => materialRef.current as THREE.MeshStandardMaterial);

		const detachWireframe = useCallback(() => {
			const segments = wireframeSegmentsRef.current;
			const mesh = wireframeMeshRef.current;
			if (!segments || !mesh) {
				wireframeSegmentsRef.current = null;
				wireframeMeshRef.current = null;
				return;
			}
			mesh.remove(segments);
			segments.geometry.dispose();
			(segments.material as THREE.LineBasicMaterial).dispose();
			wireframeSegmentsRef.current = null;
			wireframeMeshRef.current = null;
		}, []);

		const attachWireframe = useCallback(
			(mesh: THREE.Mesh) => {
				detachWireframe();
				const wireframeGeometry = new THREE.WireframeGeometry(mesh.geometry);
				wireframeGeometry.userData.sourceGeometryUuid = mesh.geometry.uuid;
				const lineMaterial = new THREE.LineBasicMaterial({
					color: new THREE.Color(wireframeColorRef.current),
					transparent: wireframeOpacityRef.current < 1,
					opacity: wireframeOpacityRef.current,
				});
				lineMaterial.depthTest = true;
				lineMaterial.depthWrite = false;
				lineMaterial.needsUpdate = true;
				const segments = new THREE.LineSegments(wireframeGeometry, lineMaterial);
				segments.renderOrder = mesh.renderOrder + 1;
				mesh.add(segments);
				wireframeSegmentsRef.current = segments;
				wireframeMeshRef.current = mesh;
			},
			[detachWireframe],
		);

		const findMeshForMaterial = useCallback(
			(material: THREE.Material) => {
				let targetMesh: THREE.Mesh | null = null;
				scene.traverse((object) => {
					if (targetMesh || !(object instanceof THREE.Mesh)) {
						return;
					}
					const mesh = object as THREE.Mesh;
					const materials = Array.isArray(mesh.material)
						? mesh.material
						: [mesh.material];
					if (materials.includes(material)) {
						targetMesh = mesh;
					}
				});
				return targetMesh;
			},
			[scene],
		);

		useEffect(() => {
			return () => {
				detachWireframe();
			};
		}, [detachWireframe]);

		useEffect(() => {
			if (!wireframe) {
				detachWireframe();
			}
		}, [wireframe, detachWireframe]);

		useEffect(() => {
			wireframeColorRef.current = wireframeColor;
			const segments = wireframeSegmentsRef.current;
			if (!segments) {
				return;
			}
			const lineMaterial = segments.material as THREE.LineBasicMaterial;
			lineMaterial.color.set(wireframeColor);
			lineMaterial.needsUpdate = true;
		}, [wireframeColor]);

		useEffect(() => {
			wireframeOpacityRef.current = wireframeOpacity;
			const segments = wireframeSegmentsRef.current;
			if (!segments) {
				return;
			}
			const lineMaterial = segments.material as THREE.LineBasicMaterial;
			lineMaterial.opacity = wireframeOpacity;
			lineMaterial.transparent = wireframeOpacity < 1;
			lineMaterial.needsUpdate = true;
		}, [wireframeOpacity]);

		useFrame(() => {
			if (!wireframe) {
				return;
			}
			const materialInstance = materialRef.current;
			if (!materialInstance) {
				return;
			}
			const existingMesh = wireframeMeshRef.current;
			const existingSegments = wireframeSegmentsRef.current;
			if (existingMesh && !existingMesh.parent) {
				detachWireframe();
			}
			if (
				existingMesh &&
				existingSegments &&
				existingSegments.geometry.userData?.sourceGeometryUuid !== existingMesh.geometry.uuid
			) {
				attachWireframe(existingMesh);
				return;
			}
			if (wireframeSegmentsRef.current) {
				return;
			}
			const mesh = findMeshForMaterial(materialInstance);
			if (!mesh) {
				return;
			}
			attachWireframe(mesh);
		});

		return (
			<meshStandardMaterial
				ref={materialRef}
				transparent={transparent}
				opacity={opacity}
				side={side}
				{...props}
				onBeforeCompile={(shader) => {
					// uniform変数を追加
					shader.uniforms.uPositiveXColor = {
						value: new THREE.Color(positiveXColor),
					};
					shader.uniforms.uNegativeXColor = {
						value: new THREE.Color(negativeXColor),
					};
					shader.uniforms.uPositiveYColor = {
						value: new THREE.Color(positiveYColor),
					};
					shader.uniforms.uNegativeYColor = {
						value: new THREE.Color(negativeYColor),
					};
					shader.uniforms.uPositiveZColor = {
						value: new THREE.Color(positiveZColor),
					};
					shader.uniforms.uNegativeZColor = {
						value: new THREE.Color(negativeZColor),
					};

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
