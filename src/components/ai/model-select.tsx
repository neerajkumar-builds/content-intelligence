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

function ProviderIcon({ provider, size = 16 }: { provider: string; size?: number }) {
  switch (provider) {
    case "anthropic":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <path d="M13.827 3.52h3.603L24 20.48h-3.603l-6.57-16.96zm-7.257 0h3.604L16.744 20.48h-3.603L6.57 3.52zM3.653 20.48H0L6.57 3.52h3.604L3.653 20.48z" fill="#d4a574" />
        </svg>
      );
    case "openai":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <path d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.998 5.998 0 0 0-3.998 2.9 6.042 6.042 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.911 6.051 6.051 0 0 0 6.515 2.9A5.985 5.985 0 0 0 13.26 24a6.056 6.056 0 0 0 5.772-4.206 5.99 5.99 0 0 0 3.997-2.9 6.056 6.056 0 0 0-.747-7.073zM13.26 22.43a4.476 4.476 0 0 1-2.876-1.04l.141-.081 4.779-2.758a.795.795 0 0 0 .392-.681v-6.737l2.02 1.168a.071.071 0 0 1 .038.052v5.583a4.504 4.504 0 0 1-4.494 4.494zM3.6 18.304a4.47 4.47 0 0 1-.535-3.014l.142.085 4.783 2.759a.771.771 0 0 0 .78 0l5.843-3.369v2.332a.08.08 0 0 1-.033.062L9.74 19.95a4.5 4.5 0 0 1-6.14-1.646zM2.34 7.896a4.485 4.485 0 0 1 2.366-1.973V11.6a.766.766 0 0 0 .388.676l5.815 3.355-2.02 1.168a.076.076 0 0 1-.071 0l-4.83-2.786A4.504 4.504 0 0 1 2.34 7.872zm16.597 3.855l-5.833-3.387L15.119 7.2a.076.076 0 0 1 .071 0l4.83 2.791a4.494 4.494 0 0 1-.676 8.105v-5.678a.79.79 0 0 0-.407-.667zm2.01-3.023l-.141-.085-4.774-2.782a.776.776 0 0 0-.785 0L9.409 9.23V6.897a.066.066 0 0 1 .028-.061l4.83-2.787a4.5 4.5 0 0 1 6.68 4.66zm-12.64 4.135l-2.02-1.164a.08.08 0 0 1-.038-.057V6.075a4.5 4.5 0 0 1 7.375-3.453l-.142.08L8.704 5.46a.795.795 0 0 0-.393.681zm1.097-2.365l2.602-1.5 2.607 1.5v2.999l-2.597 1.5-2.607-1.5z" fill="#9ca3af" />
        </svg>
      );
    case "google":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
        </svg>
      );
    default:
      return <span style={{ fontSize: 14 }}>?</span>;
  }
}

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
        <ProviderIcon provider={selected.provider} size={compact ? 14 : 16} />
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
      <span style={{ width: 18, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <ProviderIcon provider={model.provider} size={16} />
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
