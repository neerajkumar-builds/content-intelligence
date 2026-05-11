"use client";

import { useState } from "react";
import type { InferSelectModel } from "drizzle-orm";
import type { ideas } from "@/db/schema";

type Idea = InferSelectModel<typeof ideas>;

const SOURCE_COLORS: Record<string, string> = {
  reddit: "#FF4500",
  linkedin: "#0A66C2",
  rss: "#FF6F00",
  apify: "#0066FF",
  twitter: "#1DA1F2",
  competitor: "#8B5CF6",
  thought_leader: "#059669",
  manual: "var(--ink-secondary)",
};

export function IdeaCard({
  idea,
  onGenerate,
  onDismiss,
}: {
  idea: Idea;
  onGenerate: (id: string) => void;
  onDismiss: (id: string) => void;
}) {
  const [hover, setHover] = useState(false);
  const sourceColor = SOURCE_COLORS[idea.sourceKind] ?? "var(--ink-secondary)";
  const hotScore = idea.hotScore;

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        padding: 14,
        borderRadius: 8,
        border: "1px solid var(--border-subtle)",
        background: "var(--bg-surface)",
        transition: "border-color 0.12s, box-shadow 0.12s",
        borderColor: hover ? "var(--border-default)" : "var(--border-subtle)",
        boxShadow: hover ? "var(--shadow-md)" : "none",
      }}
    >
      {/* Meta row */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 9, gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7, minWidth: 0 }}>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              padding: "2px 7px",
              borderRadius: 999,
              background: "var(--bg-muted)",
              fontSize: 10,
              color: "var(--ink-secondary)",
              fontWeight: 500,
            }}
          >
            <span style={{ width: 5, height: 5, borderRadius: 50, background: sourceColor }} />
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 160 }}>
              {idea.sourceLabel}
            </span>
          </span>
          {idea.sourceCitation && (
            <span style={{ fontSize: 9.5, color: "var(--ink-tertiary)", fontFamily: "var(--font-mono)" }}>
              {idea.sourceCitation}
            </span>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
            <span style={{ fontSize: 11, color: hotScore >= 80 ? "var(--danger)" : hotScore >= 60 ? "var(--warn)" : "var(--ink-tertiary)" }}>
              🔥
            </span>
            <span style={{ fontSize: 10, color: "var(--ink-secondary)", fontFamily: "var(--font-mono)" }}>{hotScore}</span>
          </span>
          <span style={{ fontSize: 10, color: "var(--ink-tertiary)", fontFamily: "var(--font-mono)" }}>· {idea.freshness}</span>
        </div>
      </div>

      {/* Hook */}
      <p style={{ fontSize: 13.5, lineHeight: 1.45, color: "var(--ink-primary)", margin: "0 0 11px", fontWeight: 500 }}>
        {idea.hook}
      </p>

      {/* Angle */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
        <span style={{ fontSize: 8.5, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--ink-tertiary)" }}>
          Angle
        </span>
        <span style={{ fontSize: 11, color: "var(--ink-secondary)" }}>{idea.angle}</span>
      </div>

      {/* Dedup warning */}
      {idea.dedupScore && Number(idea.dedupScore) > 0.85 && (
        <div
          style={{
            padding: "6px 9px",
            marginBottom: 10,
            background: "var(--warn-soft, rgba(234,179,8,0.1))",
            borderRadius: 5,
            display: "flex",
            alignItems: "center",
            gap: 7,
            fontSize: 10.5,
            color: "var(--warn, #ca8a04)",
          }}
        >
          ⚠ Similar to a recent idea (sim {Number(idea.dedupScore).toFixed(2)})
        </div>
      )}

      {/* Score row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 9, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--ink-tertiary)", marginBottom: 3 }}>
            ICP fit
          </div>
          <div style={{ fontSize: 16, fontWeight: 600, fontFamily: "var(--font-mono)", color: Number(idea.icpFit) >= 0.8 ? "var(--success, #22c55e)" : "var(--ink-primary)" }}>
            {Number(idea.icpFit).toFixed(2)}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 9, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--ink-tertiary)", marginBottom: 3 }}>
            Formats
          </div>
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            {idea.formats.map((f) => (
              <span
                key={f}
                style={{
                  fontSize: 9.5,
                  padding: "1px 6px",
                  borderRadius: 4,
                  border: "1px solid var(--border-subtle)",
                  color: "var(--ink-secondary)",
                }}
              >
                {f}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          paddingTop: 10,
          borderTop: "1px dashed var(--border-subtle)",
        }}
      >
        <div style={{ display: "flex", gap: 4 }}>
          {idea.tags.slice(0, 3).map((t) => (
            <span key={t} style={{ fontSize: 9.5, padding: "1px 5px", borderRadius: 4, background: "var(--bg-muted)", color: "var(--ink-secondary)" }}>
              #{t}
            </span>
          ))}
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          <button
            onClick={() => onDismiss(idea.id)}
            style={{
              padding: "4px 8px",
              fontSize: 11,
              background: "transparent",
              border: "1px solid var(--border-subtle)",
              borderRadius: 4,
              cursor: "pointer",
              color: "var(--ink-secondary)",
            }}
          >
            Dismiss
          </button>
          <button
            onClick={() => onGenerate(idea.id)}
            style={{
              padding: "4px 10px",
              fontSize: 11,
              background: "var(--accent)",
              color: "white",
              border: "none",
              borderRadius: 4,
              cursor: "pointer",
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            ✦ Generate
          </button>
        </div>
      </div>
    </div>
  );
}
