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
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <path d="M8.01 18.26L2 8.66l4-6.86h8l-5.99 10.46z" fill="#0066DA" />
      <path d="M22 8.66l-4-6.86h-8l6 10.46 6-3.6z" fill="#00AC47" />
      <path d="M8.01 18.26h12L22 8.66l-6 3.6-7.99 6z" fill="#EA4335" />
      <path d="M8.01 18.26l2 3.46h8l2-3.46h-12z" fill="#00832D" />
      <path d="M2 8.66l2 3.46 4.01 6.14L14 8.66H2z" fill="#2684FC" />
      <path d="M14 8.66L8.01 18.26h12L22 8.66H14z" fill="#FFBA00" />
    </svg>
  );
}

function SlackIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <path d="M5.042 15.166a2.126 2.126 0 0 1-2.126 2.125A2.126 2.126 0 0 1 .79 15.166a2.126 2.126 0 0 1 2.126-2.125h2.126v2.125zm1.063 0a2.126 2.126 0 0 1 2.125-2.125 2.126 2.126 0 0 1 2.126 2.125v5.315A2.126 2.126 0 0 1 8.23 22.61a2.126 2.126 0 0 1-2.125-2.129v-5.315z" fill="#E01E5A" />
      <path d="M8.23 5.042a2.126 2.126 0 0 1-2.125-2.126A2.126 2.126 0 0 1 8.23.79a2.126 2.126 0 0 1 2.126 2.126v2.126H8.23zm0 1.078a2.126 2.126 0 0 1 2.126 2.11 2.126 2.126 0 0 1-2.126 2.126H2.916A2.126 2.126 0 0 1 .79 8.23a2.126 2.126 0 0 1 2.126-2.11H8.23z" fill="#36C5F0" />
      <path d="M18.958 8.23a2.126 2.126 0 0 1 2.126-2.11A2.126 2.126 0 0 1 23.21 8.23a2.126 2.126 0 0 1-2.126 2.126h-2.126V8.23zm-1.063 0a2.126 2.126 0 0 1-2.125 2.126 2.126 2.126 0 0 1-2.126-2.126V2.916A2.126 2.126 0 0 1 15.77.79a2.126 2.126 0 0 1 2.125 2.126V8.23z" fill="#2EB67D" />
      <path d="M15.77 18.958a2.126 2.126 0 0 1 2.125 2.126A2.126 2.126 0 0 1 15.77 23.21a2.126 2.126 0 0 1-2.126-2.126v-2.126h2.126zm0-1.063a2.126 2.126 0 0 1-2.126-2.125 2.126 2.126 0 0 1 2.126-2.126h5.314A2.126 2.126 0 0 1 23.21 15.77a2.126 2.126 0 0 1-2.126 2.125H15.77z" fill="#ECB22E" />
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

  const statsLoading = ideasLoading || draftsLoading || signalsLoading || exportsLoading;

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
