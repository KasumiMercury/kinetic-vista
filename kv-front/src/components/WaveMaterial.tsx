import { forwardRef, useMemo  } from "react";
import * as THREE from "three";

interface WaveMaterialProps {
	waveSpeed?: number;
	waveAmplitude?: number;
	waveFrequency?: number;
	waveDecay?: number;
	noiseScale?: number;
	noiseAmplitude?: number;
	color?: string;
	waveCount?: number;
	waveInterval?: number;
	time?: number;
	timeUniform?: { value: number };
	transparent?: boolean;
	opacity?: number;
}

export const WaveMaterial = forwardRef<THREE.Material, WaveMaterialProps>(
	(
		{
			waveSpeed = 2,
			waveAmplitude = 0.5,
			waveFrequency = 0.5,
			waveDecay = 0.1,
			noiseScale = 0.1,
			noiseAmplitude = 0.1,
			color = "#00ffff",
			waveCount = 3,
			waveInterval = 2.0,
			timeUniform,
			transparent = true,
			opacity = 0.8,
			...props
		},
		ref,
	) => {
		const uniforms = useMemo(
			() => ({
				uTime: timeUniform || { value: 0 },
				uWaveSpeed: { value: waveSpeed },
				uWaveAmplitude: { value: waveAmplitude },
				uWaveFrequency: { value: waveFrequency },
				uWaveDecay: { value: waveDecay },
				uNoiseScale: { value: noiseScale },
				uNoiseAmplitude: { value: noiseAmplitude },
				uColor: { value: new THREE.Color(color) },
				uWaveCount: { value: waveCount },
				uWaveInterval: { value: waveInterval },
			}),
			[
				timeUniform,
				waveSpeed,
				waveAmplitude,
				waveFrequency,
				waveDecay,
				noiseScale,
				noiseAmplitude,
				color,
				waveCount,
				waveInterval,
			],
		);

		return (
			<meshBasicMaterial
				ref={ref}
				wireframe={true}
				transparent={transparent}
				opacity={opacity}
				{...props}
				onBeforeCompile={(shader) => {
					// Add uniforms to shader with proper typing
					Object.keys(uniforms).forEach((key) => {
						shader.uniforms[key] = uniforms[key as keyof typeof uniforms];
					});
					
					// Ensure direct reference to time uniform
					shader.uniforms.uTime = uniforms.uTime;

					// Add noise function and uniforms to vertex shader
					shader.vertexShader = shader.vertexShader.replace(
						"#include <common>",
						`
            #include <common>
            uniform float uTime;
            uniform float uWaveSpeed;
            uniform float uWaveAmplitude;
            uniform float uWaveFrequency;
            uniform float uWaveDecay;
            uniform float uNoiseScale;
            uniform float uNoiseAmplitude;
            uniform float uWaveCount;
            uniform float uWaveInterval;

            // Noise function
            float noise(vec2 p) {
              return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
            }

            float smoothNoise(vec2 p) {
              vec2 i = floor(p);
              vec2 f = fract(p);
              
              float a = noise(i);
              float b = noise(i + vec2(1.0, 0.0));
              float c = noise(i + vec2(0.0, 1.0));
              float d = noise(i + vec2(1.0, 1.0));
              
              vec2 u = f * f * (3.0 - 2.0 * f);
              
              return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
            }
            `,
					);

					// Add position modification after begin_vertex
					shader.vertexShader = shader.vertexShader.replace(
						"#include <begin_vertex>",
						`#include <begin_vertex>
            // Calculate wave displacement
            vec2 worldPos = transformed.xy;
            float distance = length(worldPos);
            
            float totalWave = 0.0;
            for(float w = 0.0; w < uWaveCount; w += 1.0) {
              float phaseOffset = w * uWaveInterval;
              float frequency = uWaveFrequency * (1.0 + w * 0.3);
              float amplitude = uWaveAmplitude * (1.0 - w * 0.2);
              
              float wave = sin(distance * frequency - (uTime * uWaveSpeed + phaseOffset)) 
                         * amplitude 
                         * exp(-distance * uWaveDecay);
              totalWave += wave;
            }
            
            // Add noise
            vec2 noisePos = worldPos * uNoiseScale * 10.0;
            float noiseValue = (smoothNoise(noisePos) * 2.0 - 1.0) 
                             * uNoiseAmplitude 
                             * (1.0 + sin(uTime * 0.5) * 0.2);
            
            // Apply displacement to Z coordinate
            transformed.z += totalWave + noiseValue;
            `,
					);

					// Add color uniform to fragment shader
					shader.fragmentShader = shader.fragmentShader.replace(
						"#include <common>",
						`
            #include <common>
            uniform vec3 uColor;
            `,
					);

					// Use the uniform color
					shader.fragmentShader = shader.fragmentShader.replace(
						"vec4 diffuseColor = vec4( diffuse, opacity );",
						`
            vec4 diffuseColor = vec4( uColor, opacity );
            `,
					);
				}}
			/>
		);
	},
);

WaveMaterial.displayName = "WaveMaterial";