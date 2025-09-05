import { useId } from "react";

interface CameraControlsPanelProps {
  useCameraControls: boolean;
  onUseCameraControlsChange: (value: boolean) => void;
  useManualRotation: boolean;
  onUseManualRotationChange: (value: boolean) => void;
  rotation: number;
  onRotationChange: (value: number) => void;
  smoothRotation: number;
  timeOverride: number | null;
  onTimeOverrideChange: (value: number | null) => void;
  currentHour: number;
  isSensorActive: boolean;
}

export function CameraControlsPanel({
  useCameraControls,
  onUseCameraControlsChange,
  useManualRotation,
  onUseManualRotationChange,
  rotation,
  onRotationChange,
  smoothRotation,
  timeOverride,
  onTimeOverrideChange,
  currentHour,
  isSensorActive,
}: CameraControlsPanelProps) {
  const sliderId = useId();
  const timeId = useId();

  return (
    <div
      style={{
        position: "absolute",
        top: "20px",
        left: "20px",
        zIndex: 100,
        color: "white",
        background: "rgba(0, 0, 0, 0.5)",
        padding: "10px",
        borderRadius: "5px",
      }}
    >
      <label>
        <input
          type="checkbox"
          checked={useCameraControls}
          onChange={(e) => onUseCameraControlsChange(e.target.checked)}
        />
        Use CameraControls (with slider)
      </label>
      <br />
      <br />
      <label>
        <input
          type="checkbox"
          checked={useManualRotation}
          onChange={(e) => onUseManualRotationChange(e.target.checked)}
        />
        Manual Rotation Control
      </label>
      <br />
      <label htmlFor={sliderId}>
        Camera Rotation: {Math.round(smoothRotation)}° {isSensorActive ? "(Sensor)" : "(Manual)"}
      </label>
      <br />
      <input
        id={sliderId}
        type="range"
        min={0}
        max={360}
        step={10}
        value={rotation}
        disabled={!useManualRotation}
        onChange={(e) => onRotationChange(parseFloat(e.target.value))}
        style={{ width: "200px", opacity: useManualRotation ? 1 : 0.5 }}
      />
      <br />
      <br />
      <label>
        <input
          type="checkbox"
          checked={timeOverride !== null}
          onChange={(e) => onTimeOverrideChange(e.target.checked ? 16 : null)}
        />
        Override Time (Debug)
      </label>
      <br />
      <label htmlFor={timeId}>
        Time: {timeOverride !== null ? `${timeOverride}:00` : `${currentHour}:00 (Real-time)`}
      </label>
      <br />
      <input
        id={timeId}
        type="range"
        min={0}
        max={23}
        step={1}
        value={timeOverride ?? currentHour}
        disabled={timeOverride === null}
        onChange={(e) => onTimeOverrideChange(parseInt(e.target.value, 10))}
        style={{ width: "200px" }}
      />
    </div>
  );
}

