// Minimal WebSocket client for kv-wsrelay with one-shot connect attempt

import type { UserIdentity } from "./userIdentity";

type ConnectionState = "idle" | "connecting" | "connected" | "failed";

let state: ConnectionState = "idle"; // persists for page lifetime (module scope)
let ws: WebSocket | null = null;

function resolveWsUrl(): string | null {
  // Priority: explicit env URL, then same-origin /api/ws, then localhost:8080 fallback
  // Vite exposes env via import.meta.env
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const env = (import.meta as any).env || {};
    const explicit = env.VITE_WS_URL as string | undefined;
    if (explicit) return explicit;
  } catch {}
  if (typeof window === "undefined") return null;
  const { location } = window;
  const proto = location.protocol === "https:" ? "wss:" : "ws:";
  const base = `${proto}//${location.host}`;
  // If running via Vite (not behind Caddy), dev server is 5173; use backend default
  if (location.port === "5173") {
    return `ws://localhost:8080/ws`;
  }
  return `${base}/api/ws`;
}

export function connectOnce(identity: UserIdentity): void {
  if (state === "connected" || state === "connecting" || state === "failed") return;
  const url = resolveWsUrl();
  if (!url) {
    console.warn("[ws] No WebSocket URL resolvable; skipping connection");
    state = "failed";
    return;
  }
  try {
    state = "connecting";
    ws = new WebSocket(url);
    ws.onopen = () => {
      state = "connected";
      // Send identity payload (server may ignore until supported)
      const hello = {
        type: "hello",
        userId: identity.userId,
        color: identity.color,
      };
      try { ws?.send(JSON.stringify(hello)); } catch {}
      console.info("[ws] connected:", url, `userId=${identity.userId} color=${identity.color}`);
    };
    ws.onmessage = (ev) => {
      // Future: handle broadcast selections from others
      // console.debug("[ws] message:", ev.data);
    };
    ws.onerror = (ev) => {
      console.warn("[ws] error:", ev);
    };
    ws.onclose = () => {
      // Do not retry during this page lifetime as per requirements
      if (state !== "connected") state = "failed";
      ws = null;
      console.warn("[ws] closed");
    };
  } catch (e) {
    console.warn("[ws] connection failed:", e);
    state = "failed";
    ws = null;
  }
}

export function sendSelection(userId: string, landmarkId: string): void {
  if (state !== "connected" || !ws) return;
  const payload = { type: "select", userId, landmarkId };
  try {
    ws.send(JSON.stringify(payload));
  } catch (e) {
    console.warn("[ws] send failed:", e);
  }
}

export function connectionState(): ConnectionState {
  return state;
}
