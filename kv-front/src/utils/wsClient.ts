// Minimal WebSocket client for kv-wsrelay with one-shot connect attempt

import type { UserIdentity } from "./userIdentity";

type ConnectionState = "idle" | "connecting" | "connected" | "failed";

export type SelectionEvent =
  | { type: "selection"; userId: string; landmarkKey: string; color: string }
  | { type: "deselection"; userId: string; landmarkKey: string; color?: string };

type SelectionHandler = (e: SelectionEvent) => void;
const selectionHandlers: Set<SelectionHandler> = new Set();

export function subscribeSelection(handler: SelectionHandler): () => void {
  selectionHandlers.add(handler);
  return () => selectionHandlers.delete(handler);
}

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
      try {
        const data = JSON.parse(ev.data as string);
        if (data && data.landmarkKey && data.userId && (data.type === "selection" || data.type === "deselection")) {
          if (data.type === "selection") {
            const evt: SelectionEvent = {
              type: "selection",
              userId: String(data.userId),
              landmarkKey: String(data.landmarkKey),
              color: typeof data.color === "string" ? data.color : "#FF3366",
            };
            selectionHandlers.forEach((h) => { try { h(evt); } catch {} });
          } else {
            const evt: SelectionEvent = {
              type: "deselection",
              userId: String(data.userId),
              landmarkKey: String(data.landmarkKey),
            };
            selectionHandlers.forEach((h) => { try { h(evt); } catch {} });
          }
        } else if (data && data.type === "snapshot" && Array.isArray(data.selections)) {
          // Initial snapshot: replay as selection events
          for (const s of data.selections) {
            if (!s) continue;
            const evt: SelectionEvent = {
              type: "selection",
              userId: String(s.userId),
              landmarkKey: String(s.landmarkKey),
              color: typeof s.color === "string" ? s.color : "#FF3366",
            };
            selectionHandlers.forEach((h) => { try { h(evt); } catch {} });
          }
        }
      } catch {
        // ignore non-JSON
      }
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

export function sendSelection(userId: string, landmarkKey: string): void {
  if (state !== "connected" || !ws) return;
  const payload = { type: "select", userId, landmarkKey };
  try {
    ws.send(JSON.stringify(payload));
  } catch (e) {
    console.warn("[ws] send failed:", e);
  }
}

export function sendDeselection(userId: string, landmarkKey: string): void {
  if (state !== "connected" || !ws) return;
  const payload = { type: "deselect", userId, landmarkKey };
  try {
    ws.send(JSON.stringify(payload));
  } catch (e) {
    console.warn("[ws] send failed:", e);
  }
}

export function connectionState(): ConnectionState {
  return state;
}
