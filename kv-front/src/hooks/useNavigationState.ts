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

export type RemoteSelection = { userId: string; color: string; ts: number };

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
			setRotation(sensorInfo.compassHeading);
		}
	}, [sensorInfo.compassHeading, useManualRotation, sensorInfo.permissionState]);

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
	};
}
