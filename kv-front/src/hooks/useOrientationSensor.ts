import {useCallback, useEffect, useRef, useState} from "react";

// TypeScript definitions for AbsoluteOrientationSensor
declare global {
  interface Window {
    AbsoluteOrientationSensor?: new (options?: {
      frequency?: number;
      referenceFrame?: "device" | "screen";
    }) => AbsoluteOrientationSensor;
  }

  interface DeviceOrientationEvent {
    webkitCompassHeading?: number;
  }
}

interface AbsoluteOrientationSensor extends EventTarget {
  readonly quaternion: [number, number, number, number] | null;
  readonly timestamp: number | null;

  start(): void;

  stop(): void;

  addEventListener(type: "reading", listener: () => void): void;

  addEventListener(type: "error", listener: (event: Event) => void): void;

  removeEventListener(type: "reading", listener: () => void): void;

  removeEventListener(type: "error", listener: (event: Event) => void): void;
}

type SensorType = "absolute-orientation" | "device-orientation" | "unsupported";
type PermissionState =
    | "checking"
    | "granted"
    | "denied"
    | "not-supported"
    | "needs-permission"
    | "no-sensor";

interface OrientationData {
  alpha: number | null;
  beta: number | null;
  gamma: number | null;
}

interface SensorInfo {
  sensorType: SensorType;
  permissionState: PermissionState;
  compassHeading: number | null;
  orientation: OrientationData;
  quaternion: [number, number, number, number] | null;
  isListening: boolean;
}

const DEBUG = import.meta.env?.DEV || false;
const log = DEBUG ? console.log : () => {
};
const logError = DEBUG ? console.error : () => {
};

const compassHeading = (
    alpha: number | null,
    beta: number | null,
    gamma: number | null,
): number | null => {
  if (alpha === null || beta === null || gamma === null) return null;

  const degtorad = Math.PI / 180;
  const _x = beta * degtorad;
  const _y = gamma * degtorad;
  const _z = alpha * degtorad;

  const cY = Math.cos(_y);
  const cZ = Math.cos(_z);
  const sX = Math.sin(_x);
  const sY = Math.sin(_y);
  const sZ = Math.sin(_z);

  const Vx = -cZ * sY - sZ * sX * cY;
  const Vy = -sZ * sY + cZ * sX * cY;

  let heading = Math.atan2(Vx, Vy) * (180 / Math.PI);

  if (heading < 0) {
    heading += 360;
  }

  return heading;
};

const detectOS = (): "iphone" | "android" | "pc" => {
  const userAgent = navigator.userAgent;
  if (userAgent.includes("iPhone") || userAgent.includes("iPad") || userAgent.includes("iPod")) {
    return "iphone";
  } else if (userAgent.includes("Android")) {
    return "android";
  } else {
    return "pc";
  }
};

const calculateCompassHeading = (
    alpha: number | null,
    beta: number | null,
    gamma: number | null,
    webkitCompassHeading?: number,
): number | null => {
  const os = detectOS();

  if (os === "iphone" && webkitCompassHeading !== undefined) {
    return webkitCompassHeading;
  } else if (os === "android" || os === "pc") {
    return compassHeading(alpha, beta, gamma);
  } else {
    return alpha !== null ? (360 - alpha) % 360 : null;
  }
};

const checkAbsoluteOrientationSensorSupport = (): boolean => {
  return (
      "AbsoluteOrientationSensor" in window &&
      typeof window.AbsoluteOrientationSensor === "function"
  );
};

const calculateCompassFromQuaternion = (
    quaternion: [number, number, number, number] | null,
): number | null => {
  if (!quaternion) return null;

  const [x, y, z, w] = quaternion;
  const yaw = Math.atan2(2 * (w * z + x * y), 1 - 2 * (y * y + z * z));
  let heading = -yaw * (180 / Math.PI);

  if (heading < 0) {
    heading += 360;
  }

  return heading;
};

interface DeviceOrientationEventConstructor {
  requestPermission?: () => Promise<"granted" | "denied">;
}

export function useOrientationSensor(): [SensorInfo, () => Promise<void>] {
  const [orientation, setOrientation] = useState<OrientationData>({
    alpha: null,
    beta: null,
    gamma: null,
  });
  const [quaternion, setQuaternion] = useState<[number, number, number, number] | null>(null);
  const [compassHeading, setCompassHeading] = useState<number | null>(null);
  const [permissionState, setPermissionState] = useState<PermissionState>("checking");
  const [sensorType, setSensorType] = useState<SensorType>("unsupported");
  const [isListening, setIsListening] = useState(false);

  const sensorTimeoutRef = useRef<number | null>(null);
  const listenerRef = useRef<((event: DeviceOrientationEvent) => void) | null>(null);
  const absoluteSensorRef = useRef<AbsoluteOrientationSensor | null>(null);
  const dataReceivedRef = useRef<boolean>(false);
  const retryCountRef = useRef<number>(0);

  const clearSensorTimeout = useCallback(() => {
    if (sensorTimeoutRef.current) {
      clearTimeout(sensorTimeoutRef.current);
      sensorTimeoutRef.current = null;
      log("Timeout cleared - data received");
    }
  }, []);

  const createOrientationHandler = useCallback(() => {
    return (event: DeviceOrientationEvent) => {
      log("DeviceOrientationEvent change:", {
        alpha: event.alpha,
        beta: event.beta,
        gamma: event.gamma,
        webkitCompassHeading: event.webkitCompassHeading,
      });

      clearSensorTimeout();

      if (event.alpha !== null || event.beta !== null || event.gamma !== null) {
        dataReceivedRef.current = true;
        setOrientation({
          alpha: event.alpha,
          beta: event.beta,
          gamma: event.gamma,
        });
        const heading = calculateCompassHeading(
            event.alpha,
            event.beta,
            event.gamma,
            event.webkitCompassHeading,
        );
        setCompassHeading(heading);
        log("DeviceOrientation data updated - heading:", heading);
      }
    };
  }, [clearSensorTimeout]);

  const startDeviceOrientationListening = useCallback(() => {
    log("[DeviceOrientationEvent] Starting listener...");
    dataReceivedRef.current = false;

    const handleOrientationChange = createOrientationHandler();
    listenerRef.current = handleOrientationChange;
    window.addEventListener("deviceorientation", handleOrientationChange);
    setIsListening(true);
    log("[DeviceOrientationEvent] Event listener added, setting timeout...");

    sensorTimeoutRef.current = setTimeout(() => {
      log("[DeviceOrientationEvent] Timeout reached. Data received:", dataReceivedRef.current);
      if (!dataReceivedRef.current) {
        log("[DeviceOrientationEvent] No data received, marking as no-sensor");
        setPermissionState("no-sensor");
        if (listenerRef.current) {
          window.removeEventListener("deviceorientation", listenerRef.current);
          setIsListening(false);
        }
      }
    }, 3000);
  }, [createOrientationHandler]);

  const fallbackToDeviceOrientation = useCallback(() => {
    log("[Fallback] Switching to DeviceOrientationEvent");
    if (absoluteSensorRef.current) {
      try {
        absoluteSensorRef.current.stop();
      } catch (error) {
        logError("[Fallback] Error stopping AbsoluteOrientationSensor:", error);
      }
      absoluteSensorRef.current = null;
    }

    setSensorType("device-orientation");
    const DeviceOrientationEventTyped = DeviceOrientationEvent as unknown as DeviceOrientationEventConstructor;

    if (typeof DeviceOrientationEventTyped.requestPermission === "function") {
      setPermissionState("needs-permission");
      log("[Fallback] DeviceOrientationEvent permission required");
    } else {
      setPermissionState("granted");
      startDeviceOrientationListening();
      log("[Fallback] DeviceOrientationEvent started directly");
    }
  }, [startDeviceOrientationListening]);

  const startAbsoluteOrientationSensorListening = useCallback(() => {
    log("[AbsoluteOrientationSensor] Starting listener...");
    try {
      dataReceivedRef.current = false;
      if (!window.AbsoluteOrientationSensor) {
        throw new Error("AbsoluteOrientationSensor not available");
      }
      const sensor = new window.AbsoluteOrientationSensor({frequency: 60});
      absoluteSensorRef.current = sensor;

      const handleReading = () => {
        log("[AbsoluteOrientationSensor] Reading event received", sensor.quaternion);
        clearSensorTimeout();

        dataReceivedRef.current = true;
        if (sensor.quaternion) {
          setQuaternion(sensor.quaternion);
          const heading = calculateCompassFromQuaternion(sensor.quaternion);
          setCompassHeading(heading);
          log("[AbsoluteOrientationSensor] Data updated - quaternion:", sensor.quaternion, "heading:", heading);
        }
      };

      const handleError = (event: Event) => {
        logError("[AbsoluteOrientationSensor] Sensor error:", event);
        retryCountRef.current++;
        if (retryCountRef.current < 2) {
          log("[AbsoluteOrientationSensor] Retrying with DeviceOrientationEvent...");
          fallbackToDeviceOrientation();
        } else {
          setPermissionState("no-sensor");
        }
      };

      sensor.addEventListener("reading", handleReading);
      sensor.addEventListener("error", handleError);
      sensor.start();
      setIsListening(true);

      sensorTimeoutRef.current = setTimeout(() => {
        log("[AbsoluteOrientationSensor] Timeout reached. Data received:", dataReceivedRef.current);
        if (!dataReceivedRef.current) {
          log("[AbsoluteOrientationSensor] No data received, falling back to DeviceOrientationEvent");
          fallbackToDeviceOrientation();
        }
      }, 3000);
    } catch (error) {
      logError("[AbsoluteOrientationSensor] Failed to create sensor:", error);
      fallbackToDeviceOrientation();
    }
  }, [clearSensorTimeout, fallbackToDeviceOrientation]);


  useEffect(() => {
    const checkSupport = async () => {
      log("[Init] Checking sensor support...");

      if (checkAbsoluteOrientationSensorSupport()) {
        log("[Init] AbsoluteOrientationSensor supported");
        setSensorType("absolute-orientation");
        setPermissionState("needs-permission");
        return;
      }

      if (!window.DeviceOrientationEvent) {
        log("[Init] DeviceOrientationEvent not supported");
        setSensorType("unsupported");
        setPermissionState("not-supported");
        return;
      }

      log("[Init] Using DeviceOrientationEvent");
      setSensorType("device-orientation");
      const DeviceOrientationEventTyped = DeviceOrientationEvent as unknown as DeviceOrientationEventConstructor;

      if (typeof DeviceOrientationEventTyped.requestPermission === "function") {
        log("[Init] DeviceOrientationEvent permission required");
        setPermissionState("needs-permission");
      } else {
        log("[Init] DeviceOrientationEvent permission not required, starting directly");
        setPermissionState("granted");
        startDeviceOrientationListening();
      }
    };

    checkSupport();

    return () => {
      log("[Cleanup] Component unmounting, cleaning up sensors...");

      if (listenerRef.current) {
        window.removeEventListener("deviceorientation", listenerRef.current);
        listenerRef.current = null;
      }

      if (absoluteSensorRef.current) {
        try {
          absoluteSensorRef.current.stop();
        } catch (error) {
          logError("[Cleanup] Error stopping AbsoluteOrientationSensor:", error);
        }
        absoluteSensorRef.current = null;
      }

      if (sensorTimeoutRef.current) {
        clearTimeout(sensorTimeoutRef.current);
        sensorTimeoutRef.current = null;
      }

      setIsListening(false);
      dataReceivedRef.current = false;
      retryCountRef.current = 0;
    };
  }, [startDeviceOrientationListening]);

  const requestPermission = useCallback(async () => {
    log("[Permission] Request started for sensor type:", sensorType);
    retryCountRef.current = 0;

    if (sensorType === "absolute-orientation") {
      log("[AbsoluteOrientationSensor] Requesting permissions...");
      try {
        log("[AbsoluteOrientationSensor] Attempting direct sensor creation...");
        setPermissionState("granted");
        startAbsoluteOrientationSensorListening();
      } catch (error) {
        logError("[AbsoluteOrientationSensor] Permission request failed:", error);
        log("[AbsoluteOrientationSensor] Falling back to DeviceOrientationEvent");
        fallbackToDeviceOrientation();
      }
    } else if (sensorType === "device-orientation") {
      log("[DeviceOrientationEvent] Requesting permission...");
      const DeviceOrientationEventTyped = DeviceOrientationEvent as unknown as DeviceOrientationEventConstructor;

      if (typeof DeviceOrientationEventTyped.requestPermission === "function") {
        try {
          log("[DeviceOrientationEvent] Permission function available, requesting...");
          const permission = await DeviceOrientationEventTyped.requestPermission();
          log("[DeviceOrientationEvent] Permission result:", permission);
          if (permission === "granted") {
            setPermissionState("granted");
            startDeviceOrientationListening();
          } else {
            log("[DeviceOrientationEvent] Permission denied");
            setPermissionState("denied");
          }
        } catch (error) {
          logError("[DeviceOrientationEvent] Permission request error:", error);
          setPermissionState("denied");
        }
      } else {
        log("[DeviceOrientationEvent] No permission function, starting directly");
        setPermissionState("granted");
        startDeviceOrientationListening();
      }
    }
  }, [sensorType, startAbsoluteOrientationSensorListening, fallbackToDeviceOrientation, startDeviceOrientationListening]);

  const sensorInfo: SensorInfo = {
    sensorType,
    permissionState,
    compassHeading,
    orientation,
    quaternion,
    isListening,
  };

  return [sensorInfo, requestPermission];
}