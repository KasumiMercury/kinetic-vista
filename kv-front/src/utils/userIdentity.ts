import { generateVibrantHexColor } from "./userColor";

export type UserIdentity = {
  userId: string;
  color: string; // hex like #AABBCC
};

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

// Always generate a fresh identity for this page view (no persistence)
export function getOrCreateUserIdentity(): UserIdentity {
  const userId = generateUUID();
  // Use a deterministic seed from UUID so color pairs with id for this session
  const seed = Array.from(userId).reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  const color = generateVibrantHexColor(seed);
  return { userId, color };
}
