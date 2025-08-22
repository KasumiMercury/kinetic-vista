import { useState, useEffect, useRef, useCallback } from 'react';

// TypeScript definitions for AbsoluteOrientationSensor
declare global {
  interface Window {
    AbsoluteOrientationSensor?: new (options?: {
      frequency?: number;
      referenceFrame?: 'device' | 'screen';
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
  addEventListener(type: 'reading', listener: () => void): void;
  addEventListener(type: 'error', listener: (event: Event) => void): void;
  removeEventListener(type: 'reading', listener: () => void): void;
  removeEventListener(type: 'error', listener: (event: Event) => void): void;
}

type SensorType = 'absolute-orientation' | 'device-orientation' | 'unsupported';
type CustomPermissionName = 'accelerometer' | 'gyroscope' | 'magnetometer';
type PermissionState = 'checking' | 'granted' | 'denied' | 'not-supported' | 'needs-permission' | 'no-sensor';

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

const compassHeading = (alpha: number | null, beta: number | null, gamma: number | null): number | null => {
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
  
  let heading = Math.atan2(Vx, Vy);
  
  heading = heading * (180 / Math.PI);
  
  if (heading < 0) {
    heading += 360;
  }
  
  return Math.round(heading);
};

const detectOS = (): 'iphone' | 'android' | 'pc' => {
  const userAgent = navigator.userAgent;
  if (userAgent.indexOf('iPhone') > -1 || userAgent.indexOf('iPad') > -1 || userAgent.indexOf('iPod') > -1) {
    return 'iphone';
  } else if (userAgent.indexOf('Android') > -1) {
    return 'android';
  } else {
    return 'pc';
  }
};

const calculateCompassHeading = (alpha: number | null, beta: number | null, gamma: number | null, webkitCompassHeading?: number): number | null => {
  const os = detectOS();
  
  if (os === 'iphone' && webkitCompassHeading !== undefined) {
    return Math.round(webkitCompassHeading);
  } else if (os === 'android' || os === 'pc') {
    return compassHeading(alpha, beta, gamma);
  } else {
    return alpha !== null ? Math.round((360 - alpha) % 360) : null;
  }
};

// AbsoluteOrientationSensorの対応チェック
const checkAbsoluteOrientationSensorSupport = (): boolean => {
  return 'AbsoluteOrientationSensor' in window && typeof window.AbsoluteOrientationSensor === 'function';
};

// クォータニオンからコンパス方位を計算
const calculateCompassFromQuaternion = (quaternion: [number, number, number, number] | null): number | null => {
  if (!quaternion) return null;
  
  const [x, y, z, w] = quaternion;
  
  const yaw = Math.atan2(2 * (w * z + x * y), 1 - 2 * (y * y + z * z));
  
  let heading = -yaw * (180 / Math.PI);
  
  if (heading < 0) {
    heading += 360;
  }
  
  return Math.round(heading);
};

export function useOrientationSensor(): [SensorInfo, () => Promise<void>] {
  const [orientation, setOrientation] = useState<OrientationData>({
    alpha: null,
    beta: null,
    gamma: null,
  });
  const [quaternion, setQuaternion] = useState<[number, number, number, number] | null>(null);
  const [compassHeading, setCompassHeading] = useState<number | null>(null);
  const [permissionState, setPermissionState] = useState<PermissionState>('checking');
  const [sensorType, setSensorType] = useState<SensorType>('unsupported');
  const [isListening, setIsListening] = useState(false);
  
  const sensorTimeoutRef = useRef<number | null>(null);
  const listenerRef = useRef<((event: DeviceOrientationEvent) => void) | null>(null);
  const absoluteSensorRef = useRef<AbsoluteOrientationSensor | null>(null);
  const dataReceivedRef = useRef<boolean>(false);
  const retryCountRef = useRef<number>(0);

  useEffect(() => {
    // DeviceOrientationEvent用のリスナー開始（ローカル定義）
    const localStartDeviceOrientationListening = () => {
      console.log('[DeviceOrientationEvent] Starting listener...');
      dataReceivedRef.current = false;
      
      const handleOrientationChange = (event: DeviceOrientationEvent) => {
        console.log('[DeviceOrientationEvent] Orientation change:', {
          alpha: event.alpha,
          beta: event.beta,
          gamma: event.gamma,
          webkitCompassHeading: event.webkitCompassHeading
        });
        
        if (sensorTimeoutRef.current) {
          clearTimeout(sensorTimeoutRef.current);
          sensorTimeoutRef.current = null;
          console.log('[DeviceOrientationEvent] Timeout cleared - data received');
        }

        if (event.alpha !== null || event.beta !== null || event.gamma !== null) {
          dataReceivedRef.current = true;
          setOrientation({
            alpha: event.alpha,
            beta: event.beta,
            gamma: event.gamma,
          });
          const heading = calculateCompassHeading(event.alpha, event.beta, event.gamma, event.webkitCompassHeading);
          setCompassHeading(heading);
          console.log('[DeviceOrientationEvent] Data updated - heading:', heading);
        }
      };

      listenerRef.current = handleOrientationChange;
      window.addEventListener('deviceorientation', handleOrientationChange);
      setIsListening(true);
      console.log('[DeviceOrientationEvent] Event listener added, setting timeout...');

      sensorTimeoutRef.current = setTimeout(() => {
        console.log('[DeviceOrientationEvent] Timeout reached. Data received:', dataReceivedRef.current);
        if (!dataReceivedRef.current) {
          console.log('[DeviceOrientationEvent] No data received, marking as no-sensor');
          setPermissionState('no-sensor');
          if (listenerRef.current) {
            window.removeEventListener('deviceorientation', listenerRef.current);
            setIsListening(false);
          }
        }
      }, 3000);
    };

    const checkSupport = async () => {
      console.log('[Init] Checking sensor support...');
      
      // AbsoluteOrientationSensorの対応チェック
      if (checkAbsoluteOrientationSensorSupport()) {
        console.log('[Init] AbsoluteOrientationSensor supported');
        setSensorType('absolute-orientation');
        setPermissionState('needs-permission');
        return;
      }

      // DeviceOrientationEventのフォールバック
      if (!window.DeviceOrientationEvent) {
        console.log('[Init] DeviceOrientationEvent not supported');
        setSensorType('unsupported');
        setPermissionState('not-supported');
        return;
      }

      console.log('[Init] Using DeviceOrientationEvent');
      setSensorType('device-orientation');
      if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
        console.log('[Init] DeviceOrientationEvent permission required');
        setPermissionState('needs-permission');
      } else {
        console.log('[Init] DeviceOrientationEvent permission not required, starting directly');
        setPermissionState('granted');
        localStartDeviceOrientationListening();
      }
    };

    checkSupport();

    return () => {
      console.log('[Cleanup] Component unmounting, cleaning up sensors...');
      
      // DeviceOrientationEventのクリーンアップ
      if (listenerRef.current) {
        window.removeEventListener('deviceorientation', listenerRef.current);
        listenerRef.current = null;
        console.log('[Cleanup] DeviceOrientationEvent listener removed');
      }
      
      // AbsoluteOrientationSensorのクリーンアップ
      if (absoluteSensorRef.current) {
        try {
          absoluteSensorRef.current.stop();
          console.log('[Cleanup] AbsoluteOrientationSensor stopped');
        } catch (error) {
          console.error('[Cleanup] Error stopping AbsoluteOrientationSensor:', error);
        }
        absoluteSensorRef.current = null;
      }
      
      // タイムアウトのクリア
      if (sensorTimeoutRef.current) {
        clearTimeout(sensorTimeoutRef.current);
        sensorTimeoutRef.current = null;
        console.log('[Cleanup] Timeout cleared');
      }
      
      // 状態のリセット
      setIsListening(false);
      dataReceivedRef.current = false;
      retryCountRef.current = 0;
    };
  }, []);

  // AbsoluteOrientationSensor用のリスナー開始
  const startAbsoluteOrientationSensorListening = () => {
    console.log('[AbsoluteOrientationSensor] Starting listener...');
    try {
      dataReceivedRef.current = false;
      if (!window.AbsoluteOrientationSensor) {
        throw new Error('AbsoluteOrientationSensor not available');
      }
      const sensor = new window.AbsoluteOrientationSensor({ frequency: 60 });
      absoluteSensorRef.current = sensor;
      console.log('[AbsoluteOrientationSensor] Sensor created successfully');

      const handleReading = () => {
        console.log('[AbsoluteOrientationSensor] Reading event received', sensor.quaternion);
        if (sensorTimeoutRef.current) {
          clearTimeout(sensorTimeoutRef.current);
          sensorTimeoutRef.current = null;
          console.log('[AbsoluteOrientationSensor] Timeout cleared - data received');
        }

        dataReceivedRef.current = true;
        if (sensor.quaternion) {
          setQuaternion(sensor.quaternion);
          const heading = calculateCompassFromQuaternion(sensor.quaternion);
          setCompassHeading(heading);
          console.log('[AbsoluteOrientationSensor] Data updated - quaternion:', sensor.quaternion, 'heading:', heading);
        }
      };

      const handleError = (event: Event) => {
        console.error('[AbsoluteOrientationSensor] Sensor error:', event);
        retryCountRef.current++;
        if (retryCountRef.current < 2) {
          console.log('[AbsoluteOrientationSensor] Retrying with DeviceOrientationEvent...');
          fallbackToDeviceOrientation();
        } else {
          setPermissionState('no-sensor');
        }
      };

      sensor.addEventListener('reading', handleReading);
      sensor.addEventListener('error', handleError);
      
      console.log('[AbsoluteOrientationSensor] Starting sensor...');
      sensor.start();
      setIsListening(true);
      console.log('[AbsoluteOrientationSensor] Sensor started, setting timeout...');

      sensorTimeoutRef.current = setTimeout(() => {
        console.log('[AbsoluteOrientationSensor] Timeout reached. Data received:', dataReceivedRef.current);
        if (!dataReceivedRef.current) {
          console.log('[AbsoluteOrientationSensor] No data received, falling back to DeviceOrientationEvent');
          fallbackToDeviceOrientation();
        }
      }, 3000);
    } catch (error) {
      console.error('[AbsoluteOrientationSensor] Failed to create sensor:', error);
      fallbackToDeviceOrientation();
    }
  };

  // DeviceOrientationEventへのフォールバック
  const fallbackToDeviceOrientation = () => {
    console.log('[Fallback] Switching to DeviceOrientationEvent');
    if (absoluteSensorRef.current) {
      try {
        absoluteSensorRef.current.stop();
        console.log('[Fallback] AbsoluteOrientationSensor stopped');
      } catch (error) {
        console.error('[Fallback] Error stopping AbsoluteOrientationSensor:', error);
      }
      absoluteSensorRef.current = null;
    }
    
    setSensorType('device-orientation');
    if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
      setPermissionState('needs-permission');
      console.log('[Fallback] DeviceOrientationEvent permission required');
    } else {
      setPermissionState('granted');
      startDeviceOrientationListening();
      console.log('[Fallback] DeviceOrientationEvent started directly');
    }
  };

  // DeviceOrientationEvent用のリスナー開始
  const startDeviceOrientationListening = useCallback(() => {
    console.log('[DeviceOrientationEvent] Starting listener...');
    dataReceivedRef.current = false;
    
    const handleOrientationChange = (event: DeviceOrientationEvent) => {
      console.log('[DeviceOrientationEvent] Orientation change:', {
        alpha: event.alpha,
        beta: event.beta,
        gamma: event.gamma,
        webkitCompassHeading: event.webkitCompassHeading
      });
      
      if (sensorTimeoutRef.current) {
        clearTimeout(sensorTimeoutRef.current);
        sensorTimeoutRef.current = null;
        console.log('[DeviceOrientationEvent] Timeout cleared - data received');
      }

      if (event.alpha !== null || event.beta !== null || event.gamma !== null) {
        dataReceivedRef.current = true;
        setOrientation({
          alpha: event.alpha,
          beta: event.beta,
          gamma: event.gamma,
        });
        const heading = calculateCompassHeading(event.alpha, event.beta, event.gamma, event.webkitCompassHeading);
        setCompassHeading(heading);
        console.log('[DeviceOrientationEvent] Data updated - heading:', heading);
      }
    };

    listenerRef.current = handleOrientationChange;
    window.addEventListener('deviceorientation', handleOrientationChange);
    setIsListening(true);
    console.log('[DeviceOrientationEvent] Event listener added, setting timeout...');

    sensorTimeoutRef.current = setTimeout(() => {
      console.log('[DeviceOrientationEvent] Timeout reached. Data received:', dataReceivedRef.current);
      if (!dataReceivedRef.current) {
        console.log('[DeviceOrientationEvent] No data received, marking as no-sensor');
        setPermissionState('no-sensor');
        if (listenerRef.current) {
          window.removeEventListener('deviceorientation', listenerRef.current);
          setIsListening(false);
        }
      }
    }, 3000);
  }, []);

  // DeviceOrientationEventへのフォールバック（重複削除）

  // AbsoluteOrientationSensorの権限要求
  const requestAbsoluteOrientationSensorPermission = async () => {
    console.log('[AbsoluteOrientationSensor] Requesting permissions...');
    try {
      const permissions: CustomPermissionName[] = ['accelerometer', 'gyroscope', 'magnetometer'];
      console.log('[AbsoluteOrientationSensor] Checking permissions:', permissions);
      
      // 権限チェックよりも直接センサーを試行するアプローチ
      console.log('[AbsoluteOrientationSensor] Attempting direct sensor creation...');
      setPermissionState('granted');
      startAbsoluteOrientationSensorListening();
      
    } catch (error) {
      console.error('[AbsoluteOrientationSensor] Permission request failed:', error);
      console.log('[AbsoluteOrientationSensor] Falling back to DeviceOrientationEvent');
      fallbackToDeviceOrientation();
    }
  };

  // DeviceOrientationEventの権限要求
  const requestDeviceOrientationPermission = async () => {
    console.log('[DeviceOrientationEvent] Requesting permission...');
    if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
      try {
        console.log('[DeviceOrientationEvent] Permission function available, requesting...');
        const permission = await (DeviceOrientationEvent as any).requestPermission();
        console.log('[DeviceOrientationEvent] Permission result:', permission);
        if (permission === 'granted') {
          setPermissionState('granted');
          startDeviceOrientationListening();
        } else {
          console.log('[DeviceOrientationEvent] Permission denied');
          setPermissionState('denied');
        }
      } catch (error) {
        console.error('[DeviceOrientationEvent] Permission request error:', error);
        setPermissionState('denied');
      }
    } else {
      console.log('[DeviceOrientationEvent] No permission function, starting directly');
      setPermissionState('granted');
      startDeviceOrientationListening();
    }
  };

  // センサータイプに応じた権限要求
  const requestPermission = async () => {
    console.log('[Permission] Request started for sensor type:', sensorType);
    retryCountRef.current = 0; // リトライカウンタをリセット
    
    if (sensorType === 'absolute-orientation') {
      await requestAbsoluteOrientationSensorPermission();
    } else if (sensorType === 'device-orientation') {
      await requestDeviceOrientationPermission();
    }
  };

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