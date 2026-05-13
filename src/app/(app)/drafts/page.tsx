"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { getChannelLabel } from "@/lib/config";

function MiniDriveIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M12.01 1.485c-2.082 0-3.754.02-3.743.047.01.02 1.708 3.001 3.774 6.62l3.76 6.574h3.76c2.081 0 3.753-.02 3.742-.047-.005-.02-1.708-3.001-3.775-6.62l-3.76-6.574zm-4.76 1.73a789.828 789.861 0 0 0-3.63 6.319L0 15.868l1.89 3.298 1.885 3.297 3.62-6.335 3.618-6.33-1.88-3.287C8.1 4.704 7.255 3.22 7.25 3.214zm2.259 12.653-.203.348c-.114.198-.96 1.672-1.88 3.287a423.93 423.948 0 0 1-1.698 2.97c-.01.026 3.24.042 7.222.042h7.244l1.796-3.157c.992-1.734 1.85-3.23 1.906-3.323l.104-.167h-7.249z" fill="#4285F4" />
    </svg>
  );
}

function MiniSlackIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313z" fill="#E01E5A" />
      <path d="M8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312z" fill="#36C5F0" />
      <path d="M18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312z" fill="#2EB67D" />
      <path d="M15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z" fill="#ECB22E" />
    </svg>
  );
}

type StatusFilter = "all" | "draft" | "approved" | "live" | "failed";

const STATUS_FILTERS: StatusFilter[] = ["all", "draft", "approved", "live", "failed"];

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

  const { data: allExports } = trpc.integrations.listExports.useQuery({ limit: 100 });
  const exportsByDraft = useMemo(() => {
    const map = new Map<string, Set<string>>();
    if (!allExports) return map;
    for (const exp of allExports) {
      if (exp.status !== "completed" || !exp.draftId) continue;
      if (!map.has(exp.draftId)) map.set(exp.draftId, new Set());
      map.get(exp.draftId)!.add(exp.destination);
    }
    return map;
  }, [allExports]);

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

                  {exportsByDraft.has(draft.id) && (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
                      {exportsByDraft.get(draft.id)!.has("google_drive") && <MiniDriveIcon />}
                      {exportsByDraft.get(draft.id)!.has("slack") && <MiniSlackIcon />}
                    </span>
                  )}

                  <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 4, background: "var(--bg-muted)", color: "var(--ink-secondary)", fontWeight: 500 }}>
                    {getChannelLabel(draft.channel)}
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
