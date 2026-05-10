"use client";

interface ScoreSwatchProps {
  value: number;
  label?: string | null;
  compact?: boolean;
}

export function ScoreSwatch({ value, label, compact }: ScoreSwatchProps) {
  const display = value <= 1 ? value.toFixed(2) : value.toFixed(1);
  const normalized = value <= 1 ? value * 10 : value;
  const color =
    normalized >= 7 ? "var(--score-good)" : normalized >= 4 ? "var(--score-mid)" : "var(--score-bad)";

  if (compact) {
    return (
      <span
        className="mono tabular"
        style={{ fontSize: 11, fontWeight: 600, color }}
      >
        {display}
      </span>
    );
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: color,
          flexShrink: 0,
        }}
      />
      <span className="mono tabular" style={{ fontSize: 12, fontWeight: 600, color }}>
        {display}
      </span>
      {label !== null && label !== undefined && (
        <span style={{ fontSize: 10, color: "var(--ink-tertiary)" }}>{label}</span>
      )}
    </div>
  );
}
