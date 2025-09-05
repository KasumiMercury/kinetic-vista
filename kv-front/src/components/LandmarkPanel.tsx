import type { JSX } from "react";
import { useMemo } from "react";
import loc from "../assets/landmark.json";

type LandmarkPanelProps = {
  selectedKeys: string[];
  onChange: (next: string[]) => void;
};

type LocEntry = { displayJP?: string } & Record<string, unknown>;
type LocData = Record<string, LocEntry>;

export function LandmarkPanel({ selectedKeys, onChange }: LandmarkPanelProps): JSX.Element {
  const data = loc as unknown as LocData;

  const items = useMemo(
    () =>
      Object.entries(data)
        .map(([key, entry]) => ({ key, displayJP: entry.displayJP ?? key }))
        .sort((a, b) => a.displayJP.localeCompare(b.displayJP, "ja")),
    [data],
  );

  const toggle = (key: string) => {
    const isSelected = selectedKeys.includes(key);
    const next = isSelected
      ? selectedKeys.filter((k) => k !== key)
      : [...selectedKeys, key];
    onChange(next);
  };

  return (
    <div
      style={{
        position: "fixed",
        left: 16,
        bottom: 16,
        zIndex: 10000,
        maxWidth: "50vw",
        maxHeight: "50vh",
        overflow: "auto",
        background: "rgba(0,0,0,0.7)",
        color: "white",
        padding: 12,
        borderRadius: 8,
        boxShadow: "0 2px 10px rgba(0,0,0,0.4)",
      }}
    >
      <div style={{ fontWeight: 600, marginBottom: 8 }}>Landmarks</div>

      <div style={{ display: "grid", gap: 8 }}>
        {items.map(({ key, displayJP }) => {
          const selected = selectedKeys.includes(key);
          return (
            <button
              key={key}
              type="button"
              onClick={() => toggle(key)}
              aria-pressed={selected}
              style={{
                cursor: "pointer",
                width: "100%",
                textAlign: "left",
                padding: "8px 10px",
                borderRadius: 8,
                border: selected ? "1px solid #ff8fb3" : "1px solid rgba(255,255,255,0.25)",
                background: selected ? "#ff3366" : "rgba(255,255,255,0.08)",
                color: "white",
                fontSize: 13,
                lineHeight: 1.2,
              }}
            >
              {displayJP}
            </button>
          );
        })}
      </div>
    </div>
  );
}
