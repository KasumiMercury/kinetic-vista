import { generateVibrantHexColor } from "./userColor";

export type UserIdentity = {
  userId: string;
  color: string; // hex like #AABBCC
};

const KEY_ID = "kv.userId";
const KEY_COLOR = "kv.userColor";

function generateUUID(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  // Fallback RFC4122 v4
  const rnd = (n = 16) => Array.from(crypto.getRandomValues(new Uint8Array(n)));
  const b = rnd(16);
  // Set version and variant bits
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const hex = Array.from(b, (v) => v.toString(16).padStart(2, "0"));
  return `${hex[0]}${hex[1]}${hex[2]}${hex[3]}-${hex[4]}${hex[5]}-${hex[6]}${hex[7]}-${hex[8]}${hex[9]}-${hex[10]}${hex[11]}${hex[12]}${hex[13]}${hex[14]}${hex[15]}`;
}

export function getOrCreateUserIdentity(): UserIdentity {
  try {
    const storedId = localStorage.getItem(KEY_ID);
    const storedColor = localStorage.getItem(KEY_COLOR);
    if (storedId && storedColor) {
      return { userId: storedId, color: storedColor };
    }
  } catch {}

  const userId = generateUUID();
  // Use a deterministic seed from UUID to keep color stable per user
  const seed = Array.from(userId).reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  const color = generateVibrantHexColor(seed);

  try {
    localStorage.setItem(KEY_ID, userId);
    localStorage.setItem(KEY_COLOR, color);
  } catch {}

  return { userId, color };
}

