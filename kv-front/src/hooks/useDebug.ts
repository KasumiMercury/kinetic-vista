import { useMemo } from "react";

function parseBoolean(value: string | null | undefined): boolean {
  if (value == null) return false;
  const v = value.toLowerCase();
  return v === "1" || v === "true" || v === "yes" || v === "on" || v === "debug";
}

/**
 * Debug flag detection.
 * Enabled when any of the following is true:
 * - URL query contains `debug` (e.g., `?debug` or `?debug=1`)
 * - URL hash contains `debug` (e.g., `#debug`)
 * - localStorage `debug` is truthy ("1", "true", "yes", "on")
 */
export function useDebug(): boolean {
  return useMemo(() => {
    if (typeof window === "undefined") return false;

    // query: ?debug or ?debug=value
    let queryEnabled = false;
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.has("debug")) {
        const val = params.get("debug");
        queryEnabled = val === null || val === "" ? true : parseBoolean(val);
      }
    } catch {
      // noop
    }

    // hash: #debug or #...&debug
    let hashEnabled = false;
    try {
      const hash = window.location.hash.replace(/^#/g, "");
      if (hash) {
        const parts = hash.split(/[&;,]/);
        hashEnabled = parts.some((p) => {
          const [k, v] = p.split("=");
          if (k === "debug") return v ? parseBoolean(v) : true;
          return k === "debug" || p === "debug";
        });
      }
    } catch {
      // noop
    }

    // localStorage: debug
    let storageEnabled = false;
    try {
      const s = window.localStorage.getItem("debug");
      storageEnabled = parseBoolean(s);
    } catch {
      // noop
    }

    return queryEnabled || hashEnabled || storageEnabled;
  }, []);
}

