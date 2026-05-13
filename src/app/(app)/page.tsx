"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { getChannelLabel } from "@/lib/config";

function DriveIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M12.01 1.485c-2.082 0-3.754.02-3.743.047.01.02 1.708 3.001 3.774 6.62l3.76 6.574h3.76c2.081 0 3.753-.02 3.742-.047-.005-.02-1.708-3.001-3.775-6.62l-3.76-6.574zm-4.76 1.73a789.828 789.861 0 0 0-3.63 6.319L0 15.868l1.89 3.298 1.885 3.297 3.62-6.335 3.618-6.33-1.88-3.287C8.1 4.704 7.255 3.22 7.25 3.214zm2.259 12.653-.203.348c-.114.198-.96 1.672-1.88 3.287a423.93 423.948 0 0 1-1.698 2.97c-.01.026 3.24.042 7.222.042h7.244l1.796-3.157c.992-1.734 1.85-3.23 1.906-3.323l.104-.167h-7.249z" fill="#4285F4" />
    </svg>
  );
}

function SlackIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313z" fill="#E01E5A" />
      <path d="M8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312z" fill="#36C5F0" />
      <path d="M18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312z" fill="#2EB67D" />
      <path d="M15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z" fill="#ECB22E" />
    </svg>
  );
}

const STATUS_BADGE_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  draft: { bg: "rgba(99,102,241,0.12)", color: "#6366f1", label: "Draft" },
  graded: { bg: "rgba(99,102,241,0.12)", color: "#6366f1", label: "Graded" },
  approved: { bg: "rgba(34,197,94,0.12)", color: "#22c55e", label: "Approved" },
  scheduled: { bg: "rgba(245,158,11,0.12)", color: "#f59e0b", label: "Scheduled" },
  publishing: { bg: "rgba(245,158,11,0.12)", color: "#f59e0b", label: "Publishing" },
  live: { bg: "rgba(22,163,74,0.15)", color: "#16a34a", label: "Live" },
  failed: { bg: "rgba(239,68,68,0.12)", color: "#ef4444", label: "Failed" },
};

const EXPORT_STATUS_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  pending: { bg: "rgba(245,158,11,0.12)", color: "#f59e0b", label: "Pending" },
  processing: { bg: "rgba(99,102,241,0.12)", color: "#6366f1", label: "Processing" },
  completed: { bg: "rgba(34,197,94,0.12)", color: "#22c55e", label: "Completed" },
  failed: { bg: "rgba(239,68,68,0.12)", color: "#ef4444", label: "Failed" },
};

function StatusBadge({ status, styles }: { status: string; styles: Record<string, { bg: string; color: string; label: string }> }) {
  const style = styles[status] ?? styles.draft ?? { bg: "var(--bg-muted)", color: "var(--ink-secondary)", label: status };
  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 8px",
        borderRadius: 4,
        fontSize: 10,
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

function SkeletonCard({ height = 80 }: { height?: number }) {
  return (
    <div
      style={{
        height,
        borderRadius: 8,
        background: "var(--bg-muted)",
        animation: "pulse 1.5s ease-in-out infinite",
      }}
    />
  );
}

function StatCard({
  label,
  value,
  loading,
}: {
  label: string;
  value: number | string;
  loading: boolean;
}) {
  return (
    <div
      style={{
        padding: 16,
        borderRadius: 8,
        border: "1px solid var(--border-subtle)",
        background: "var(--bg-surface)",
      }}
    >
      {loading ? (
        <div
          style={{
            width: 48,
            height: 28,
            borderRadius: 4,
            background: "var(--bg-muted)",
            animation: "pulse 1.5s ease-in-out infinite",
            marginBottom: 6,
          }}
        />
      ) : (
        <div style={{ fontSize: 28, fontWeight: 700, lineHeight: 1.1, marginBottom: 4 }}>
          {value}
        </div>
      )}
      <div style={{ fontSize: 12, color: "var(--ink-tertiary)", fontWeight: 500 }}>{label}</div>
    </div>
  );
}

export default function HomePage() {
  const { user } = useUser();
  const router = useRouter();

  const { data: brands, isLoading: brandsLoading } = trpc.brand.list.useQuery();
  const { data: ideaCounts, isLoading: ideasLoading } = trpc.ideas.countByStatus.useQuery();
  const { data: recentDrafts, isLoading: draftsLoading } = trpc.drafts.listRecent.useQuery({ limit: 20 });
  const { data: signalCount, isLoading: signalsLoading } = trpc.signals.countRecent.useQuery();
  const { data: exports, isLoading: exportsLoading } = trpc.integrations.listExports.useQuery({ limit: 5 });
  const { data: profilesList, isLoading: profilesLoading } = trpc.profiles.list.useQuery({});

  const syncMut = trpc.signals.triggerSync.useMutation({
    onSuccess: () => toast.success("Signal sync triggered"),
    onError: (err) => toast.error(err.message),
  });

  const approveMut = trpc.drafts.approve.useMutation({
    onSuccess: () => toast.success("Draft approved"),
    onError: (err) => toast.error(err.message),
  });

  const brandName = brands?.[0]?.name;
  const firstName = user?.firstName ?? "there";

  const pendingApprovals = useMemo(() => {
    if (!recentDrafts) return [];
    return recentDrafts
      .filter((d) => d.status === "draft" && d.content && d.content.trim() !== "")
      .slice(0, 5);
  }, [recentDrafts]);

  const approvedCount = useMemo(() => {
    if (!recentDrafts) return 0;
    return recentDrafts.filter((d) => d.status === "approved").length;
  }, [recentDrafts]);

  const exportCount = exports?.length ?? 0;

  const recentExports = useMemo(() => {
    if (!exports) return [];
    return exports.slice(0, 5);
  }, [exports]);

  const profileCount = profilesList?.length ?? 0;
  const statsLoading = ideasLoading || draftsLoading || signalsLoading || exportsLoading || profilesLoading;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
      <div
        style={{
          padding: "16px 24px",
          borderBottom: "1px solid var(--border-subtle)",
          flexShrink: 0,
        }}
      >
        <h1 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>
          Welcome back, {firstName}.
        </h1>
        {!brandsLoading && brandName && (
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--ink-tertiary)" }}>
            {brandName} workspace
          </p>
        )}
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px 60px" }}>
        {/* Stats row */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
            gap: 12,
            marginBottom: 24,
          }}
        >
          <StatCard label="Ideas" value={ideaCounts?.total ?? 0} loading={statsLoading} />
          <StatCard label="Approved" value={approvedCount} loading={statsLoading} />
          <StatCard label="Exports" value={exportCount} loading={statsLoading} />
          <StatCard label="Signals (7d)" value={signalCount ?? 0} loading={statsLoading} />
          <StatCard label="Profiles" value={profileCount} loading={statsLoading} />
        </div>

        {/* Pending Approvals */}
        <div style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 14, fontWeight: 600, margin: "0 0 12px" }}>
            Pending Approvals
          </h2>
          {draftsLoading ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <SkeletonCard height={52} />
              <SkeletonCard height={52} />
              <SkeletonCard height={52} />
            </div>
          ) : pendingApprovals.length === 0 ? (
            <div
              style={{
                padding: "24px 16px",
                textAlign: "center",
                borderRadius: 8,
                border: "1px solid var(--border-subtle)",
                background: "var(--bg-surface)",
              }}
            >
              <p style={{ fontSize: 13, color: "var(--ink-tertiary)", margin: 0 }}>
                No drafts ready to approve
              </p>
            </div>
          ) : (
            <div
              style={{
                borderRadius: 8,
                border: "1px solid var(--border-subtle)",
                background: "var(--bg-surface)",
                overflow: "hidden",
              }}
            >
              {pendingApprovals.map((draft, i) => (
                <div
                  key={draft.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "10px 14px",
                    borderBottom:
                      i < pendingApprovals.length - 1
                        ? "1px solid var(--border-subtle)"
                        : "none",
                    cursor: "pointer",
                    transition: "background 0.1s",
                  }}
                  onClick={() => router.push(`/drafts/${draft.id}`)}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "var(--bg-muted)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 500,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {draft.title || "Untitled draft"}
                    </div>
                  </div>
                  <span
                    style={{
                      fontSize: 10,
                      padding: "2px 7px",
                      borderRadius: 4,
                      background: "var(--bg-muted)",
                      color: "var(--ink-secondary)",
                      fontWeight: 500,
                      flexShrink: 0,
                    }}
                  >
                    {getChannelLabel(draft.channel)}
                  </span>
                  <StatusBadge status={draft.status} styles={STATUS_BADGE_STYLES} />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      approveMut.mutate({ draftId: draft.id });
                    }}
                    disabled={approveMut.isPending}
                    style={{
                      padding: "4px 10px",
                      fontSize: 11,
                      fontWeight: 600,
                      background: "var(--accent)",
                      color: "#fff",
                      border: "none",
                      borderRadius: 4,
                      cursor: approveMut.isPending ? "not-allowed" : "pointer",
                      opacity: approveMut.isPending ? 0.6 : 1,
                      flexShrink: 0,
                    }}
                  >
                    Approve
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Exports */}
        <div style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 14, fontWeight: 600, margin: "0 0 12px" }}>
            Recent Exports
          </h2>
          {exportsLoading ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <SkeletonCard height={44} />
              <SkeletonCard height={44} />
            </div>
          ) : recentExports.length === 0 ? (
            <div
              style={{
                padding: "24px 16px",
                textAlign: "center",
                borderRadius: 8,
                border: "1px solid var(--border-subtle)",
                background: "var(--bg-surface)",
              }}
            >
              <p style={{ fontSize: 13, color: "var(--ink-tertiary)", margin: 0 }}>
                No exports yet — approve a draft and export it
              </p>
            </div>
          ) : (
            <div
              style={{
                borderRadius: 8,
                border: "1px solid var(--border-subtle)",
                background: "var(--bg-surface)",
                overflow: "hidden",
              }}
            >
              {recentExports.map((exp, i) => (
                <div
                  key={exp.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "10px 14px",
                    borderBottom:
                      i < recentExports.length - 1
                        ? "1px solid var(--border-subtle)"
                        : "none",
                  }}
                >
                  <span style={{ flexShrink: 0, display: "flex", alignItems: "center" }}>
                    {exp.destination === "google_drive" ? <DriveIcon /> : <SlackIcon />}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 500,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        display: "block",
                      }}
                    >
                      {exp.destination === "google_drive" ? "Google Drive" : "Slack"} export
                    </span>
                  </div>
                  <span style={{ fontSize: 11, color: "var(--ink-tertiary)", flexShrink: 0 }}>
                    {formatDistanceToNow(new Date(exp.createdAt), { addSuffix: true })}
                  </span>
                  <StatusBadge status={exp.status} styles={EXPORT_STATUS_STYLES} />
                  {exp.status === "completed" && exp.externalUrl && (
                    <a
                      href={exp.externalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        color: "var(--accent)",
                        textDecoration: "none",
                        flexShrink: 0,
                      }}
                    >
                      Open
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div>
          <h2 style={{ fontSize: 14, fontWeight: 600, margin: "0 0 12px" }}>
            Quick Actions
          </h2>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button
              onClick={() => syncMut.mutate()}
              disabled={syncMut.isPending}
              style={{
                padding: "8px 16px",
                fontSize: 12,
                fontWeight: 600,
                background: "var(--accent)",
                color: "#fff",
                border: "none",
                borderRadius: 6,
                cursor: syncMut.isPending ? "not-allowed" : "pointer",
                opacity: syncMut.isPending ? 0.6 : 1,
              }}
            >
              {syncMut.isPending ? "Syncing..." : "Sync Signals"}
            </button>
            <Link
              href="/ideas"
              style={{
                padding: "8px 16px",
                fontSize: 12,
                fontWeight: 600,
                border: "1px solid var(--border-subtle)",
                borderRadius: 6,
                color: "var(--ink-primary)",
                textDecoration: "none",
                background: "var(--bg-surface)",
              }}
            >
              View Ideas
            </Link>
            <Link
              href="/drafts"
              style={{
                padding: "8px 16px",
                fontSize: 12,
                fontWeight: 600,
                border: "1px solid var(--border-subtle)",
                borderRadius: 6,
                color: "var(--ink-primary)",
                textDecoration: "none",
                background: "var(--bg-surface)",
              }}
            >
              View Drafts
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
