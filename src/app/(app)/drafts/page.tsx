"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

type StatusFilter = "all" | "draft" | "approved" | "live" | "failed";

const STATUS_FILTERS: StatusFilter[] = ["all", "draft", "approved", "live", "failed"];

const CHANNEL_LABELS: Record<string, string> = {
  linkedin: "LinkedIn",
  twitter: "X / Twitter",
  instagram: "Instagram",
  threads: "Threads",
  facebook: "Facebook",
  newsletter: "Newsletter",
  blog: "Blog",
  tiktok: "TikTok",
  youtube: "YouTube",
  reddit: "Reddit",
  bluesky: "Bluesky",
  beehiiv: "Beehiiv",
};

const STATUS_BADGE_STYLES: Record<
  string,
  { bg: string; color: string; label: string }
> = {
  draft: { bg: "rgba(99,102,241,0.12)", color: "#6366f1", label: "Draft" },
  graded: { bg: "rgba(99,102,241,0.12)", color: "#6366f1", label: "Graded" },
  approved: { bg: "rgba(34,197,94,0.12)", color: "#22c55e", label: "Approved" },
  scheduled: { bg: "rgba(245,158,11,0.12)", color: "#f59e0b", label: "Scheduled" },
  publishing: { bg: "rgba(245,158,11,0.12)", color: "#f59e0b", label: "Publishing" },
  live: { bg: "rgba(22,163,74,0.15)", color: "#16a34a", label: "Live" },
  failed: { bg: "rgba(239,68,68,0.12)", color: "#ef4444", label: "Failed" },
};

function StatusBadge({ status }: { status: string }) {
  const style = STATUS_BADGE_STYLES[status] ?? STATUS_BADGE_STYLES.draft;
  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 8px",
        borderRadius: 4,
        fontSize: 11,
        fontWeight: 600,
        background: style.bg,
        color: style.color,
        textTransform: "capitalize",
      }}
    >
      {style.label}
    </span>
  );
}

export default function DraftsPage() {
  const [filter, setFilter] = useState<StatusFilter>("all");
  const router = useRouter();

  const { data, isLoading } = trpc.drafts.list.useQuery(
    filter === "all" ? undefined : { status: filter },
  );

  const utils = trpc.useUtils();
  const deleteMut = trpc.drafts.delete.useMutation({
    onSuccess: () => {
      toast.success("Draft deleted");
      void utils.drafts.list.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);

  const items = data?.items ?? [];

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
      {/* Header */}
      <div
        style={{
          padding: "16px 24px",
          borderBottom: "1px solid var(--border-subtle)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexShrink: 0,
        }}
      >
        <h1 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Drafts</h1>
        <span style={{ fontSize: 12, color: "var(--ink-tertiary)" }}>
          {items.length} draft{items.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Filter bar */}
      <div
        style={{
          padding: "12px 24px",
          display: "flex",
          gap: 6,
          flexShrink: 0,
        }}
      >
        {STATUS_FILTERS.map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            style={{
              padding: "5px 12px",
              fontSize: 12,
              fontWeight: 500,
              borderRadius: 6,
              border: "1px solid",
              borderColor:
                filter === s ? "var(--accent)" : "var(--border-subtle)",
              background:
                filter === s ? "var(--accent)" : "transparent",
              color: filter === s ? "#fff" : "var(--ink-secondary)",
              cursor: "pointer",
              textTransform: "capitalize",
            }}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: "auto", padding: "12px 24px 60px" }}>
        {isLoading ? (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
              gap: 12,
            }}
          >
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                style={{
                  height: 140,
                  borderRadius: 8,
                  background: "var(--bg-muted)",
                  animation: "pulse 1.5s ease-in-out infinite",
                }}
              />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div style={{ textAlign: "center", padding: "80px 20px" }}>
            <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.5 }}>
              {/* pen icon */}
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--ink-tertiary)" }}>
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
              </svg>
            </div>
            <h3
              style={{
                margin: "0 0 8px",
                fontSize: 18,
                fontWeight: 600,
              }}
            >
              No drafts yet
            </h3>
            <p
              style={{
                fontSize: 13,
                color: "var(--ink-tertiary)",
                margin: "0 0 20px",
                maxWidth: 400,
                marginLeft: "auto",
                marginRight: "auto",
              }}
            >
              Go to the Idea Wall and click Generate to create your first draft.
            </p>
            <button
              onClick={() => router.push("/ideas")}
              style={{
                padding: "8px 16px",
                fontSize: 12,
                background: "var(--accent)",
                color: "white",
                border: "none",
                borderRadius: 6,
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              Go to Idea Wall
            </button>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
              gap: 12,
            }}
          >
            {items.map((draft) => (
              <div
                key={draft.id}
                onClick={() => router.push(`/drafts/${draft.id}`)}
                style={{
                  padding: 16,
                  borderRadius: 8,
                  border: "1px solid var(--border-subtle)",
                  background: "var(--bg-surface)",
                  cursor: "pointer",
                  transition: "border-color 0.15s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "var(--accent)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "var(--border-subtle)";
                }}
              >
                {/* Title */}
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    marginBottom: 8,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {draft.title ||
                    (draft.content
                      ? draft.content.slice(0, 60) + (draft.content.length > 60 ? "..." : "")
                      : "Untitled draft")}
                </div>

                {/* Meta row */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    flexWrap: "wrap",
                  }}
                >
                  <StatusBadge status={draft.status} />

                  <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 4, background: "var(--bg-muted)", color: "var(--ink-secondary)", fontWeight: 500 }}>
                    {CHANNEL_LABELS[draft.channel] ?? draft.channel}
                  </span>

                  {draft.format && (
                    <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 4, border: "1px solid var(--border-subtle)", color: "var(--ink-tertiary)" }}>
                      {draft.format.replace(/-/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase())}
                    </span>
                  )}

                  {draft.modelId && (
                    <span style={{ fontSize: 10, color: "var(--ink-tertiary)", fontFamily: "var(--font-mono)" }}>
                      {draft.modelId.split("/").pop()?.split("-").slice(0, 2).join(" ") ?? draft.modelId}
                    </span>
                  )}

                  <span
                    style={{
                      fontSize: 11,
                      color: "var(--ink-tertiary)",
                      marginLeft: "auto",
                    }}
                  >
                    {new Date(draft.updatedAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                </div>

                {/* Content preview */}
                {draft.content && (
                  <p
                    style={{
                      fontSize: 12,
                      color: "var(--ink-secondary)",
                      margin: "10px 0 0",
                      lineHeight: 1.5,
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}
                  >
                    {draft.content}
                  </p>
                )}

                {/* Actions */}
                <div style={{ display: "flex", gap: 8, marginTop: 10, justifyContent: "flex-end" }}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteTarget({ id: draft.id, title: draft.title || "Untitled draft" });
                    }}
                    title="Delete draft"
                    style={{ padding: 4, background: "none", border: "none", cursor: "pointer", color: "var(--ink-tertiary)", borderRadius: 4, display: "flex", alignItems: "center" }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 6h18" />
                      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete draft"
        message={`Are you sure you want to delete "${deleteTarget?.title}"? This action cannot be undone.`}
        confirmLabel="Delete"
        destructive
        onConfirm={() => {
          if (deleteTarget) {
            deleteMut.mutate({ draftId: deleteTarget.id });
          }
          setDeleteTarget(null);
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
