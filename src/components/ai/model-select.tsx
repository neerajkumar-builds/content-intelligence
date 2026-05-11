"use client";

interface ModelOption {
  id: string;
  label: string;
  tier: string;
  costEstimate: string;
}

const MODELS: ModelOption[] = [
  { id: "gemini-2.0-flash", label: "Gemini Flash", tier: "Fast", costEstimate: "~$0.01" },
  { id: "claude-sonnet-4-20250514", label: "Claude Sonnet 4", tier: "Balanced", costEstimate: "~$0.08" },
  { id: "claude-opus-4-20250514", label: "Claude Opus 4", tier: "Best", costEstimate: "~$0.40" },
];

const TIER_COLORS: Record<string, string> = {
  Fast: "#22c55e",
  Balanced: "#6366f1",
  Best: "#f59e0b",
};

interface Props {
  value: string;
  onChange: (modelId: string) => void;
  compact?: boolean;
}

export function ModelSelect({ value, onChange, compact }: Props) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        padding: compact ? "4px 8px" : "6px 10px",
        fontSize: compact ? 11 : 12,
        fontFamily: "var(--font-mono)",
        borderRadius: 6,
        border: "1px solid var(--border-subtle)",
        background: "var(--bg-surface)",
        color: "var(--ink-primary)",
        cursor: "pointer",
        outline: "none",
        appearance: "auto" as never,
        minWidth: compact ? 120 : 180,
      }}
    >
      {MODELS.map((m) => (
        <option key={m.id} value={m.id}>
          {m.label} — {m.tier} {m.costEstimate}
        </option>
      ))}
    </select>
  );
}

export function getModelLabel(modelId: string): string {
  return MODELS.find((m) => m.id === modelId)?.label ?? modelId;
}

export { MODELS };
