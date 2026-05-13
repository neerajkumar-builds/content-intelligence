"use client";

import { useState } from "react";
import type { InferSelectModel } from "drizzle-orm";
import type { ideas } from "@/db/schema";
import { GeneratePopover } from "./generate-popover";

type Idea = InferSelectModel<typeof ideas>;

const DRAFT_STATUS_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  draft: { bg: "rgba(99,102,241,0.12)", color: "#6366f1", label: "Draft" },
  graded: { bg: "rgba(99,102,241,0.12)", color: "#6366f1", label: "Graded" },
  approved: { bg: "rgba(34,197,94,0.12)", color: "#22c55e", label: "Approved" },
  scheduled: { bg: "rgba(245,158,11,0.12)", color: "#f59e0b", label: "Scheduled" },
  publishing: { bg: "rgba(245,158,11,0.12)", color: "#f59e0b", label: "Publishing" },
  live: { bg: "rgba(22,163,74,0.15)", color: "#16a34a", label: "Live" },
  failed: { bg: "rgba(239,68,68,0.12)", color: "#ef4444", label: "Failed" },
};

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

/**
 * Renders sourceLabel with profile type badge when the label follows
 * the "ProfileName (Type)" pattern (e.g. "HubSpot (Competitor)").
 */
function SourceLabel({ label }: { label: string }) {
  const match = label.match(/^(.+?)\s*\(([^)]+)\)$/);
  if (!match) {
    return (
      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 160 }}>
        {label}
      </span>
    );
  }
  const [, name, type] = match;
  const typeColors: Record<string, string> = {
    Competitor: "#8B5CF6",
    Leader: "#059669",
    "Thought Leader": "#059669",
    Creator: "#0EA5E9",
  };
  const badgeColor = typeColors[type] ?? "var(--ink-tertiary)";
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, overflow: "hidden", maxWidth: 200 }}>
      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {name}
      </span>
      <span style={{
        fontSize: 8.5,
        fontWeight: 600,
        padding: "1px 4px",
        borderRadius: 3,
        background: `color-mix(in srgb, ${badgeColor} 15%, transparent)`,
        color: badgeColor,
        whiteSpace: "nowrap",
        flexShrink: 0,
      }}>
        {type}
      </span>
    </span>
  );
}

export function IdeaCard({
  idea,
  latestDraft,
  onGenerate,
  onDismiss,
  onViewDraft,
  generatePending,
}: {
  idea: Idea;
  latestDraft?: { draftId: string; draftStatus: string } | null;
  onGenerate: (id: string, opts: { channel: string; format: string; modelId: string }) => void;
  onDismiss: (id: string) => void;
  onViewDraft?: (draftId: string) => void;
  generatePending?: boolean;
}) {
  const [hover, setHover] = useState(false);
  const [showPopover, setShowPopover] = useState(false);
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
            <SourceLabel label={idea.sourceLabel} />
            {idea.sourceUrl && (
              <a
                href={idea.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                title="View source"
                style={{ color: "var(--ink-tertiary)", display: "flex", alignItems: "center", lineHeight: 0 }}
              >
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                  <path d="M15 3h6v6" />
                  <path d="M10 14L21 3" />
                </svg>
              </a>
            )}
          </span>
          {idea.sourceCitation && (
            <span style={{ fontSize: 9.5, color: "var(--ink-tertiary)", fontFamily: "var(--font-mono)" }}>
              {idea.sourceCitation}
            </span>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {hotScore > 0 && (
            <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
              <span style={{ fontSize: 10, color: hotScore >= 70 ? "var(--danger, #ef4444)" : hotScore >= 50 ? "var(--warn, #f59e0b)" : "var(--ink-tertiary)" }}>
                {hotScore >= 70 ? "🔥" : hotScore >= 50 ? "🔶" : "·"}
              </span>
              <span style={{ fontSize: 10, color: "var(--ink-secondary)", fontFamily: "var(--font-mono)" }}>{hotScore}</span>
            </span>
          )}
          <span style={{ fontSize: 10, color: "var(--ink-tertiary)" }} title={`Published: ${idea.publishedAt ? new Date(idea.publishedAt).toLocaleDateString() : "unknown"}\nSynced: ${new Date(idea.createdAt).toLocaleDateString()}`}>
            {idea.publishedAt
              ? new Date(idea.publishedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })
              : idea.freshness}
          </span>
        </div>
      </div>

      {/* Draft status badge */}
      {latestDraft && (
        <div style={{ marginBottom: 8 }}>
          <span style={{
            display: "inline-block",
            padding: "2px 8px",
            borderRadius: 4,
            fontSize: 10,
            fontWeight: 600,
            background: DRAFT_STATUS_STYLES[latestDraft.draftStatus]?.bg ?? "var(--bg-muted)",
            color: DRAFT_STATUS_STYLES[latestDraft.draftStatus]?.color ?? "var(--ink-secondary)",
          }}>
            {DRAFT_STATUS_STYLES[latestDraft.draftStatus]?.label ?? latestDraft.draftStatus}
          </span>
        </div>
      )}

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
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <button
            onClick={() => onDismiss(idea.id)}
            style={{
              padding: "5px 10px",
              fontSize: 11,
              background: "transparent",
              border: "1px solid var(--border-subtle)",
              borderRadius: 5,
              cursor: "pointer",
              color: "var(--ink-secondary)",
              fontWeight: 500,
              lineHeight: 1,
            }}
          >
            Dismiss
          </button>
          {latestDraft && onViewDraft ? (
            <button
              onClick={() => onViewDraft(latestDraft.draftId)}
              style={{
                padding: "5px 12px",
                fontSize: 11,
                background: "var(--accent)",
                color: "white",
                border: "none",
                borderRadius: 5,
                cursor: "pointer",
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                gap: 4,
                lineHeight: 1,
              }}
            >
              View Draft
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14" />
                <path d="M12 5l7 7-7 7" />
              </svg>
            </button>
          ) : (
            <div style={{ position: "relative" }}>
              <button
                onClick={() => setShowPopover(!showPopover)}
                style={{
                  padding: "5px 12px",
                  fontSize: 11,
                  background: "var(--accent)",
                  color: "white",
                  border: "none",
                  borderRadius: 5,
                  cursor: "pointer",
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  lineHeight: 1,
                }}
              >
                ✦ Generate
              </button>
              {showPopover && (
                <GeneratePopover
                  ideaFormats={idea.formats}
                  onGenerate={(opts) => {
                    setShowPopover(false);
                    onGenerate(idea.id, opts);
                  }}
                  isPending={!!generatePending}
                  anchor="right"
                  onClose={() => setShowPopover(false)}
                />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
