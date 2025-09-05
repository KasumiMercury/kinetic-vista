interface PermissionDeniedOverlayProps {
  onTryAgain: () => void | Promise<void>;
  onUseManualControl: () => void;
}

export function PermissionDeniedOverlay({ onTryAgain, onUseManualControl }: PermissionDeniedOverlayProps) {
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
        <h2 style={{ marginTop: 0, color: "#dc3545" }}>Permission Denied</h2>
        <p>
          Motion sensor access was denied. You can still use manual rotation controls.
        </p>
        <button
          type="button"
          onClick={onTryAgain}
          style={{
            padding: "12px 24px",
            backgroundColor: "#dc3545",
            color: "white",
            border: "none",
            borderRadius: "5px",
            fontSize: "16px",
            cursor: "pointer",
            marginRight: "10px",
          }}
        >
          Try Again
        </button>
        <button
          type="button"
          onClick={onUseManualControl}
          style={{
            padding: "12px 24px",
            backgroundColor: "#6c757d",
            color: "white",
            border: "none",
            borderRadius: "5px",
            fontSize: "16px",
            cursor: "pointer",
          }}
        >
          Use Manual Control
        </button>
      </div>
    </div>
  );
}

