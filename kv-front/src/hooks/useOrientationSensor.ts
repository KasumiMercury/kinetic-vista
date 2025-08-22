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
    }
  }, []);

  const createOrientationHandler = useCallback(() => {
    return (event: DeviceOrientationEvent) => {

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
      }
    };
  }, [clearSensorTimeout]);

  const startDeviceOrientationListening = useCallback(() => {
    dataReceivedRef.current = false;

    const handleOrientationChange = createOrientationHandler();
    listenerRef.current = handleOrientationChange;
    window.addEventListener("deviceorientation", handleOrientationChange);
    setIsListening(true);

    sensorTimeoutRef.current = setTimeout(() => {
      if (!dataReceivedRef.current) {
        setPermissionState("no-sensor");
        if (listenerRef.current) {
          window.removeEventListener("deviceorientation", listenerRef.current);
          setIsListening(false);
        }
      }
    }, 3000);
  }, [createOrientationHandler]);

  const fallbackToDeviceOrientation = useCallback(() => {
    if (absoluteSensorRef.current) {
      try {
        absoluteSensorRef.current.stop();
      } catch (error) {
        console.error("[Fallback] Error stopping AbsoluteOrientationSensor:", error);
      }
      absoluteSensorRef.current = null;
    }

    setSensorType("device-orientation");
    const DeviceOrientationEventTyped = DeviceOrientationEvent as unknown as DeviceOrientationEventConstructor;

    if (typeof DeviceOrientationEventTyped.requestPermission === "function") {
      setPermissionState("needs-permission");
    } else {
      setPermissionState("granted");
      startDeviceOrientationListening();
    }
  }, [startDeviceOrientationListening]);

  const startAbsoluteOrientationSensorListening = useCallback(() => {
    try {
      dataReceivedRef.current = false;
      if (!window.AbsoluteOrientationSensor) {
        throw new Error("AbsoluteOrientationSensor not available");
      }
      const sensor = new window.AbsoluteOrientationSensor({frequency: 60});
      absoluteSensorRef.current = sensor;

      const handleReading = () => {
        clearSensorTimeout();

        dataReceivedRef.current = true;
        if (sensor.quaternion) {
          setQuaternion(sensor.quaternion);
          const heading = calculateCompassFromQuaternion(sensor.quaternion);
          setCompassHeading(heading);
        }
      };

      const handleError = (event: Event) => {
        console.error("[AbsoluteOrientationSensor] Sensor error:", event);
        retryCountRef.current++;
        if (retryCountRef.current < 2) {
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
        if (!dataReceivedRef.current) {
          fallbackToDeviceOrientation();
        }
      }, 3000);
    } catch (error) {
      console.error("[AbsoluteOrientationSensor] Failed to create sensor:", error);
      fallbackToDeviceOrientation();
    }
  }, [clearSensorTimeout, fallbackToDeviceOrientation]);


  useEffect(() => {
    const checkSupport = async () => {

      if (checkAbsoluteOrientationSensorSupport()) {
        setSensorType("absolute-orientation");
        setPermissionState("needs-permission");
        return;
      }

      if (!window.DeviceOrientationEvent) {
        setSensorType("unsupported");
        setPermissionState("not-supported");
        return;
      }

      setSensorType("device-orientation");
      const DeviceOrientationEventTyped = DeviceOrientationEvent as unknown as DeviceOrientationEventConstructor;

      if (typeof DeviceOrientationEventTyped.requestPermission === "function") {
        setPermissionState("needs-permission");
      } else {
        setPermissionState("granted");
        startDeviceOrientationListening();
      }
    };

    checkSupport();

    return () => {

      if (listenerRef.current) {
        window.removeEventListener("deviceorientation", listenerRef.current);
        listenerRef.current = null;
      }

      if (absoluteSensorRef.current) {
        try {
          absoluteSensorRef.current.stop();
        } catch (error) {
          console.error("[Cleanup] Error stopping AbsoluteOrientationSensor:", error);
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
    retryCountRef.current = 0;

    if (sensorType === "absolute-orientation") {
      try {
        setPermissionState("granted");
        startAbsoluteOrientationSensorListening();
      } catch (error) {
        console.error("[AbsoluteOrientationSensor] Permission request failed:", error);
        fallbackToDeviceOrientation();
      }
    } else if (sensorType === "device-orientation") {
      const DeviceOrientationEventTyped = DeviceOrientationEvent as unknown as DeviceOrientationEventConstructor;

      if (typeof DeviceOrientationEventTyped.requestPermission === "function") {
        try {
          const permission = await DeviceOrientationEventTyped.requestPermission();
          if (permission === "granted") {
            setPermissionState("granted");
            startDeviceOrientationListening();
          } else {
            setPermissionState("denied");
          }
        } catch (error) {
          console.error("[DeviceOrientationEvent] Permission request error:", error);
          setPermissionState("denied");
        }
      } else {
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