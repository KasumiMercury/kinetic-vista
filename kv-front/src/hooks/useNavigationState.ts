import {
	useMemo,
	useState,
	useEffect,
	useCallback,
	type Dispatch,
	type SetStateAction,
} from "react";
import { useOrientationSensor } from "./useOrientationSensor";
import { useSmoothRotation } from "./useSmoothRotation";
import { useDebug } from "./useDebug";
import { getOrCreateUserIdentity } from "../utils/userIdentity";
import {
	connectOnce,
	sendSelection,
	sendDeselection,
	subscribeSelection,
	subscribeWelcome,
} from "../utils/wsClient";
import landmarkData from "../assets/landmark.json";
import {
	calculateLandmarkAngle,
	type LandmarkEntry,
} from "../utils/landmarkAngles";

export type RemoteSelection = { userId: string; color: string; ts: number };

export type CalibrationResult =
	| {
				success: true;
				offset: number;
				actualAngle: number;
				sensorHeading: number;
				calibratedHeading: number;
				landmarkKey: string;
			}
	| {
				success: false;
				reason: "sensor-unavailable" | "landmark-not-found";
				landmarkKey: string;
			};

const LANDMARKS = landmarkData as Record<string, LandmarkEntry>;
const CALIBRATION_COORD_MAP = { xKey: "x", zKey: "y", invertZ: true } as const;

const normalizeAngle = (value: number): number => {
	const normalized = value % 360;
	return normalized < 0 ? normalized + 360 : normalized;
};

const shortestAngleDifference = (target: number, reference: number): number => {
	let diff = target - reference;
	while (diff > 180) diff -= 360;
	while (diff < -180) diff += 360;
	return diff;
};

type NavigationState = {
	rotation: number;
	setRotation: Dispatch<SetStateAction<number>>;
	useCameraControls: boolean;
	setUseCameraControls: Dispatch<SetStateAction<boolean>>;
	timeOverride: number | null;
	setTimeOverride: Dispatch<SetStateAction<number | null>>;
	useManualRotation: boolean;
	setUseManualRotation: Dispatch<SetStateAction<boolean>>;
	selectedLandmarks: string[];
	handleLandmarkChange: (next: string[]) => void;
	sensorInfo: ReturnType<typeof useOrientationSensor>[0];
	requestPermission: ReturnType<typeof useOrientationSensor>[1];
	smoothRotation: number;
	debug: boolean;
	currentHour: number;
	color: string;
	displaySelectedKeys: string[];
	colorsByKey: Record<string, string>;
	userId: string;
	calibrationOffset: number;
	calibratedLandmarkKey: string | null;
	calibrationTimestamp: number | null;
	calibrateWithLandmark: (landmarkKey: string) => CalibrationResult;
	resetCalibration: () => void;
};

export function useNavigationState(): NavigationState {
	const [rotation, setRotation] = useState(0);
	const [useCameraControls, setUseCameraControls] = useState(true);
	const [timeOverride, setTimeOverride] = useState<number | null>(null);
	const [useManualRotation, setUseManualRotation] = useState(false);
	const [selectedLandmarks, setSelectedLandmarks] = useState<string[]>([]);
	const [identity, setIdentity] = useState(() => getOrCreateUserIdentity());
	const { userId, color } = identity;
	const [remoteSelections, setRemoteSelections] = useState<Record<string, RemoteSelection>>({});
	const [calibrationOffset, setCalibrationOffset] = useState(0);
	const [calibratedLandmarkKey, setCalibratedLandmarkKey] = useState<string | null>(null);
	const [calibrationTimestamp, setCalibrationTimestamp] = useState<number | null>(null);

	const debug = useDebug();
	const currentHour = new Date().getHours();

	const [sensorInfo, requestPermission] = useOrientationSensor();

	useEffect(() => {
		const ua = navigator.userAgent.toLowerCase();
		const isMobile = /iphone|ipod|ipad|android/.test(ua);
		setUseCameraControls(isMobile);
		setUseManualRotation(false);
	}, []);

	useEffect(() => {
		if (
			!useManualRotation &&
			sensorInfo.compassHeading !== null &&
			sensorInfo.permissionState === "granted"
		) {
			const adjusted = normalizeAngle(
				sensorInfo.compassHeading + calibrationOffset,
			);
			setRotation(adjusted);
		}
	}, [
		sensorInfo.compassHeading,
		useManualRotation,
		sensorInfo.permissionState,
		calibrationOffset,
	]);

	const smoothRotation = useSmoothRotation(rotation, {
		interpolationSpeed: 0.15,
		threshold: 0.05,
	});

	useEffect(() => {
		console.info(`[kv-front] userId=${userId} color=${color}`);
	}, [userId, color]);

	useEffect(() => {
		try {
			connectOnce({ userId, color });
		} catch (e) {
			console.warn("[ws] connect attempt failed:", e);
		}
	}, [userId, color]);

	useEffect(() => {
		const unsub = subscribeWelcome((evt) => {
			setIdentity({ userId: evt.userId, color: evt.color });
		});
		return () => unsub();
	}, []);

	useEffect(() => {
		const unsub = subscribeSelection((evt) => {
			if (evt.type === "selection") {
				setRemoteSelections((prev) => ({
					...prev,
					[evt.landmarkKey]: {
						userId: evt.userId,
						color: evt.color,
						ts: Date.now(),
					},
				}));
			} else {
				setRemoteSelections((prev) => {
					const current = prev[evt.landmarkKey];
					if (current && current.userId === evt.userId) {
						const rest = { ...prev };
						delete rest[evt.landmarkKey];
						return rest;
					}
					return prev;
				});
			}
		});
		return () => unsub();
	}, []);

	const handleLandmarkChange = useCallback(
		(next: string[]) => {
			const prev = selectedLandmarks[0];
			const curr = next[0];
			if (prev && prev !== curr) {
				sendDeselection(userId, prev);
			}
			if (curr && curr !== prev) {
				sendSelection(userId, curr);
			}
			if (!curr && prev) {
				sendDeselection(userId, prev);
			}
			setSelectedLandmarks(next);
		},
		[selectedLandmarks, userId],
	);

	const displaySelectedKeys = useMemo(() => {
		return Array.from(
			new Set([...selectedLandmarks, ...Object.keys(remoteSelections)]),
		);
	}, [selectedLandmarks, remoteSelections]);

	const colorsByKey = useMemo(() => {
		return displaySelectedKeys.reduce<Record<string, string>>((acc, key) => {
			if (selectedLandmarks.includes(key)) acc[key] = color;
			else acc[key] = remoteSelections[key]?.color ?? color;
			return acc;
		}, {});
	}, [displaySelectedKeys, selectedLandmarks, remoteSelections, color]);

	const calibrateWithLandmark = useCallback(
		(landmarkKey: string): CalibrationResult => {
			const landmark = LANDMARKS[landmarkKey];
			if (!landmark) {
				return {
					success: false,
					reason: "landmark-not-found",
					landmarkKey,
				};
			}

			const sensorHeading = sensorInfo.compassHeading;
			if (sensorHeading === null) {
				return {
					success: false,
					reason: "sensor-unavailable",
					landmarkKey,
				};
			}

			const actualAngle = calculateLandmarkAngle(landmark, CALIBRATION_COORD_MAP);
			const offset = shortestAngleDifference(actualAngle, sensorHeading);
			const calibratedHeading = normalizeAngle(sensorHeading + offset);

			setCalibrationOffset(offset);
			setCalibratedLandmarkKey(landmarkKey);
			setCalibrationTimestamp(Date.now());

			if (
				!useManualRotation &&
				sensorInfo.permissionState === "granted"
			) {
				setRotation(calibratedHeading);
			}

			return {
				success: true,
				offset,
				actualAngle,
				sensorHeading,
				calibratedHeading,
				landmarkKey,
			};
		},
		[
			sensorInfo.compassHeading,
			sensorInfo.permissionState,
			useManualRotation,
			setRotation,
		],
	);

	const resetCalibration = useCallback(() => {
		setCalibrationOffset(0);
		setCalibratedLandmarkKey(null);
		setCalibrationTimestamp(null);

		if (
			!useManualRotation &&
			sensorInfo.compassHeading !== null &&
			sensorInfo.permissionState === "granted"
		) {
			setRotation(normalizeAngle(sensorInfo.compassHeading));
		}
	}, [
		useManualRotation,
		sensorInfo.compassHeading,
		sensorInfo.permissionState,
		setRotation,
	]);

	return {
		rotation,
		setRotation,
		useCameraControls,
		setUseCameraControls,
		timeOverride,
		setTimeOverride,
		useManualRotation,
		setUseManualRotation,
		selectedLandmarks,
		handleLandmarkChange,
		sensorInfo,
		requestPermission,
		smoothRotation,
		debug,
		currentHour,
		color,
		displaySelectedKeys,
		colorsByKey,
		userId,
		calibrationOffset,
		calibratedLandmarkKey,
		calibrationTimestamp,
		calibrateWithLandmark,
		resetCalibration,
	};
}
