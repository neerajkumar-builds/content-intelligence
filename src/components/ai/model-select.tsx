"use client";

import { useState, useRef, useEffect } from "react";

interface ModelOption {
  id: string;
  label: string;
  provider: "anthropic" | "openai" | "google";
  category: "standard" | "thinking";
  costEstimate: string;
}

const MODELS: ModelOption[] = [
  { id: "gemini-2.0-flash", label: "Gemini 2.0 Flash", provider: "google", category: "standard", costEstimate: "~$0.01" },
  { id: "claude-sonnet-4-20250514", label: "Sonnet 4.6", provider: "anthropic", category: "standard", costEstimate: "~$0.08" },
  { id: "openai/gpt-4.1", label: "GPT-4.1", provider: "openai", category: "standard", costEstimate: "~$0.05" },
  { id: "claude-opus-4-20250514", label: "Opus 4.6", provider: "anthropic", category: "thinking", costEstimate: "~$0.40" },
  { id: "google/gemini-2.5-flash-preview", label: "Gemini 2.5 Flash", provider: "google", category: "thinking", costEstimate: "~$0.02" },
];

const PROVIDER_ICONS: Record<string, string> = {
  anthropic: "✸",
  openai: "◎",
  google: "G",
};

const PROVIDER_COLORS: Record<string, string> = {
  anthropic: "#d4a574",
  openai: "#9ca3af",
  google: "#4285f4",
};

interface Props {
  value: string;
  onChange: (modelId: string) => void;
  compact?: boolean;
}

export function ModelSelect({ value, onChange, compact }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const selected = MODELS.find((m) => m.id === value) ?? MODELS[0];
  const standardModels = MODELS.filter((m) => m.category === "standard");
  const thinkingModels = MODELS.filter((m) => m.category === "thinking");

  return (
    <div ref={ref} style={{ position: "relative", display: "inline-block" }}>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(!open)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: compact ? "4px 10px" : "6px 12px",
          fontSize: compact ? 11 : 12,
          fontWeight: 500,
          borderRadius: 6,
          border: "1px solid var(--border-subtle)",
          background: "var(--bg-surface)",
          color: "var(--ink-primary)",
          cursor: "pointer",
          outline: "none",
          minWidth: compact ? 140 : 180,
          fontFamily: "var(--font-heading, 'Montserrat', sans-serif)",
        }}
      >
        <span style={{ color: PROVIDER_COLORS[selected.provider], fontSize: compact ? 12 : 14, lineHeight: 1 }}>
          {PROVIDER_ICONS[selected.provider]}
        </span>
        <span style={{ flex: 1, textAlign: "left" }}>{selected.label}</span>
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="var(--ink-tertiary)" strokeWidth="1.5">
          <path d="M2 4L5 7L8 4" />
        </svg>
      </button>

      {/* Dropdown */}
      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            zIndex: 50,
            minWidth: 220,
            borderRadius: 10,
            border: "1px solid var(--border-subtle)",
            background: "var(--bg-surface)",
            boxShadow: "0 8px 30px rgba(0,0,0,0.18)",
            padding: "6px 0",
            overflow: "hidden",
          }}
        >
          {/* Standard Models */}
          <div style={{ padding: "8px 14px 4px", fontSize: 11, fontWeight: 600, color: "var(--ink-tertiary)", letterSpacing: "0.02em" }}>
            Standard Models
          </div>
          {standardModels.map((m) => (
            <ModelItem
              key={m.id}
              model={m}
              selected={value === m.id}
              onSelect={() => { onChange(m.id); setOpen(false); }}
            />
          ))}

          {/* Divider */}
          <div style={{ height: 1, background: "var(--border-subtle)", margin: "4px 0" }} />

          {/* Thinking Models */}
          <div style={{ padding: "8px 14px 4px", fontSize: 11, fontWeight: 600, color: "var(--ink-tertiary)", letterSpacing: "0.02em" }}>
            Thinking Models
          </div>
          {thinkingModels.map((m) => (
            <ModelItem
              key={m.id}
              model={m}
              selected={value === m.id}
              onSelect={() => { onChange(m.id); setOpen(false); }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ModelItem({
  model,
  selected,
  onSelect,
}: {
  model: ModelOption;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        width: "100%",
        padding: "7px 14px",
        fontSize: 13,
        fontWeight: selected ? 600 : 400,
        color: "var(--ink-primary)",
        background: selected ? "rgba(99,102,241,0.06)" : "transparent",
        border: "none",
        cursor: "pointer",
        textAlign: "left",
        fontFamily: "var(--font-heading, 'Montserrat', sans-serif)",
      }}
      onMouseEnter={(e) => {
        if (!selected) (e.currentTarget as HTMLElement).style.background = "var(--bg-muted)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.background = selected ? "rgba(99,102,241,0.06)" : "transparent";
      }}
    >
      <span style={{ color: PROVIDER_COLORS[model.provider], fontSize: 14, width: 18, textAlign: "center", lineHeight: 1 }}>
        {PROVIDER_ICONS[model.provider]}
      </span>
      <span style={{ flex: 1 }}>{model.label}</span>
      {selected && (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 7.5L6 10.5L11 4" />
        </svg>
      )}
    </button>
  );
}

export function getModelLabel(modelId: string): string {
  return MODELS.find((m) => m.id === modelId)?.label ?? modelId;
}

export { MODELS };
