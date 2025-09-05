interface PermissionRequestOverlayProps {
  sensorTypeLabel: string;
  onRequestPermission: () => void | Promise<void>;
}

export function PermissionRequestOverlay({ sensorTypeLabel, onRequestPermission }: PermissionRequestOverlayProps) {
  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          background: "white",
          padding: "30px",
          borderRadius: "10px",
          textAlign: "center",
          color: "black",
          maxWidth: "400px",
        }}
      >
        <h2 style={{ marginTop: 0 }}>Enable Orientation Sensing</h2>
        <p>
          This app uses device orientation to control the camera direction.
          Please grant permission to access motion sensors.
        </p>
        <p style={{ fontSize: "14px", color: "#666" }}>Sensor Type: {sensorTypeLabel}</p>
        <button
          type="button"
          onClick={onRequestPermission}
          style={{
            padding: "12px 24px",
            backgroundColor: "#007bff",
            color: "white",
            border: "none",
            borderRadius: "5px",
            fontSize: "16px",
            cursor: "pointer",
          }}
        >
          Enable Sensors
        </button>
      </div>
    </div>
  );
}

