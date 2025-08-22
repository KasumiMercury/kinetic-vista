import { useEffect, useRef, useState } from "react";

interface SmoothRotationOptions {
	interpolationSpeed?: number;
	threshold?: number;
}

function lerpAngle(from: number, to: number, factor: number): number {
	let diff = to - from;

	if (diff > 180) {
		diff -= 360;
	} else if (diff < -180) {
		diff += 360;
	}

	const result = from + diff * factor;

	return ((result % 360) + 360) % 360;
}

export function useSmoothRotation(
	targetRotation: number,
	options: SmoothRotationOptions = {},
): number {
	const { interpolationSpeed = 0.1, threshold = 0.1 } = options;

	const [smoothRotation, setSmoothRotation] = useState(targetRotation);
	const lastTargetRef = useRef(targetRotation);
	const currentRotationRef = useRef(targetRotation);
	const animationFrameRef = useRef<number | undefined>(undefined);

	useEffect(() => {
		if (lastTargetRef.current !== targetRotation) {
			lastTargetRef.current = targetRotation;

			const diff = Math.abs(targetRotation - currentRotationRef.current);
			const normalizedDiff = Math.min(diff, 360 - diff);

			if (normalizedDiff > 45) {
				currentRotationRef.current = targetRotation;
				setSmoothRotation(targetRotation);
			}
		}
	}, [targetRotation]);

	useEffect(() => {
		const animate = () => {
			const current = currentRotationRef.current;
			const target = targetRotation;

			let diff = target - current;
			if (diff > 180) diff -= 360;
			else if (diff < -180) diff += 360;

			const distance = Math.abs(diff);

			if (distance > threshold) {
				const dynamicSpeed = Math.min(
					interpolationSpeed * (1 + distance / 90),
					0.3,
				);

				const newRotation = lerpAngle(current, target, dynamicSpeed);
				currentRotationRef.current = newRotation;
				setSmoothRotation(newRotation);
			}

			animationFrameRef.current = requestAnimationFrame(animate);
		};

		animationFrameRef.current = requestAnimationFrame(animate);

		return () => {
			if (animationFrameRef.current) {
				cancelAnimationFrame(animationFrameRef.current);
			}
		};
	}, [targetRotation, interpolationSpeed, threshold]);

	return smoothRotation;
}
