"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "@/server/routers/_app";

// ---------------------------------------------------------------------------
// Types — inferred from tRPC router output types
// ---------------------------------------------------------------------------

type RouterOutput = inferRouterOutputs<AppRouter>;
type ProfileData = NonNullable<RouterOutput["profiles"]["getById"]>;
type PlatformLink = ProfileData["platformLinks"][number];
type SourceConfig = ProfileData["sourceConfigs"][number];
type SignalItem = RouterOutput["profiles"]["getProfileSignals"]["items"][number];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const PLATFORM_LABELS: Record<string, string> = {
  website: "Website",
  linkedin: "LinkedIn",
  twitter: "X/Twitter",
  youtube: "YouTube",
  instagram: "Instagram",
  tiktok: "TikTok",
  reddit: "Reddit",
  substack: "Substack",
  medium: "Medium",
  podcast: "Podcast",
};

function platformStatusColor(link: PlatformLink): string {
  if (link.feedUrl && link.enabled) return "#22c55e";
  if (link.fetchMethod === "apify") return "#f59e0b";
  return "#ef4444";
}

function platformStatusLabel(link: PlatformLink, sourceConfig?: SourceConfig): string {
  if (link.feedUrl && link.enabled) return "Active";
  if (link.fetchMethod === "apify") return "Apify needed";
  if (sourceConfig?.lastErrorMessage) return sourceConfig.lastErrorMessage;
  return "No feed";
}

function importanceBadge(importance: "high" | "medium" | "low"): { label: string; color: string; bg: string } {
  switch (importance) {
    case "high":
      return { label: "High", color: "#22c55e", bg: "rgba(34,197,94,0.1)" };
    case "medium":
      return { label: "Medium", color: "#f59e0b", bg: "rgba(245,158,11,0.1)" };
    case "low":
      return { label: "Low", color: "var(--ink-tertiary)", bg: "var(--bg-muted)" };
  }
}

function typeBadge(type: string): { label: string; color: string; bg: string } {
  switch (type) {
    case "competitor":
      return { label: "Competitor", color: "#6366f1", bg: "rgba(99,102,241,0.1)" };
    case "thought_leader":
      return { label: "Thought Leader", color: "#8b5cf6", bg: "rgba(139,92,246,0.1)" };
    case "content_creator":
      return { label: "Content Creator", color: "#ec4899", bg: "rgba(236,72,153,0.1)" };
    default:
      return { label: type, color: "var(--ink-secondary)", bg: "var(--bg-muted)" };
  }
}

function relativeTime(date: Date | string | null): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  const now = Date.now();
  const diffMs = now - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 30) return `${diffDay}d ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function truncateUrl(url: string, maxLen = 40): string {
  const clean = url.replace(/^https?:\/\//, "").replace(/\/$/, "");
  if (clean.length <= maxLen) return clean;
  return clean.slice(0, maxLen - 3) + "...";
}

// Content classification badge colors
const CLASSIFICATION_COLORS: Record<string, { color: string; bg: string }> = {
  "Product Launch": { color: "#6366f1", bg: "rgba(99,102,241,0.1)" },
  "Thought Leadership": { color: "#8b5cf6", bg: "rgba(139,92,246,0.1)" },
  "Case Study": { color: "#22c55e", bg: "rgba(34,197,94,0.1)" },
  "Industry News": { color: "#0ea5e9", bg: "rgba(14,165,233,0.1)" },
  "How-to": { color: "#f59e0b", bg: "rgba(245,158,11,0.1)" },
  "Opinion": { color: "#ec4899", bg: "rgba(236,72,153,0.1)" },
  "Research": { color: "#14b8a6", bg: "rgba(20,184,166,0.1)" },
};

function getClassificationStyle(classification: string): { color: string; bg: string } {
  return CLASSIFICATION_COLORS[classification] ?? {
    color: "var(--ink-secondary)",
    bg: "var(--bg-muted)",
  };
}

// ---------------------------------------------------------------------------
// Toggle component (reused from settings page pattern)
// ---------------------------------------------------------------------------

function Toggle({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={(e) => {
        e.stopPropagation();
        if (!disabled) onChange(!checked);
      }}
      style={{
        position: "relative",
        width: 32,
        height: 18,
        borderRadius: 9,
        border: "none",
        background: checked ? "var(--accent)" : "var(--bg-muted)",
        cursor: disabled ? "not-allowed" : "pointer",
        transition: "background 0.15s",
        flexShrink: 0,
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <span
        style={{
          position: "absolute",
          top: 2,
          left: checked ? 16 : 2,
          width: 14,
          height: 14,
          borderRadius: "50%",
          background: "#fff",
          transition: "left 0.15s",
          boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
        }}
      />
    </button>
  );
}

// ---------------------------------------------------------------------------
// Source filter chip options
// ---------------------------------------------------------------------------

const SOURCE_FILTERS = ["all", "website", "youtube", "reddit", "linkedin", "twitter"] as const;
type SourceFilter = (typeof SOURCE_FILTERS)[number];

const SOURCE_FILTER_LABELS: Record<SourceFilter, string> = {
  all: "All",
  website: "Blog",
  youtube: "YouTube",
  reddit: "Reddit",
  linkedin: "LinkedIn",
  twitter: "News",
};

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

const PLATFORM_OPTIONS = [
  "website", "linkedin", "twitter", "youtube", "instagram",
  "tiktok", "reddit", "substack", "medium", "podcast",
] as const;

export function ProfileDetailPage({
  profileId,
  backUrl,
  backLabel,
}: {
  profileId: string;
  backUrl: string;
  backLabel: string;
}) {
  const router = useRouter();
  const utils = trpc.useUtils();

  const [activeTab, setActiveTab] = useState<"content" | "ideas">("content");
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("all");
  const [notes, setNotes] = useState("");
  const [notesDirty, setNotesDirty] = useState(false);
  const notesRef = useRef<HTMLTextAreaElement>(null);

  // Add platform link state
  const [addLinkOpen, setAddLinkOpen] = useState(false);
  const [addLinkPlatform, setAddLinkPlatform] = useState<string>("website");
  const [addLinkUrl, setAddLinkUrl] = useState("");

  // ── Data queries ──
  const { data: profile, isLoading } = trpc.profiles.getById.useQuery(
    { id: profileId },
    { enabled: !!profileId },
  );

  const { data: signalsData } = trpc.profiles.getProfileSignals.useQuery(
    { profileId, limit: 50 },
    { enabled: !!profileId },
  );

  // ── Mutations ──
  const toggleLinkMut = trpc.profiles.togglePlatformLink.useMutation({
    onSuccess: () => {
      void utils.profiles.getById.invalidate({ id: profileId });
      toast.success("Platform link updated");
    },
    onError: (err) => toast.error(err.message),
  });

  const updateMut = trpc.profiles.update.useMutation({
    onSuccess: () => {
      setNotesDirty(false);
      toast.success("Notes saved");
      void utils.profiles.getById.invalidate({ id: profileId });
    },
    onError: (err) => toast.error(err.message),
  });

  const addLinkMut = trpc.profiles.addPlatformLink.useMutation({
    onSuccess: (data) => {
      setAddLinkOpen(false);
      setAddLinkUrl("");
      setAddLinkPlatform("website");
      void utils.profiles.getById.invalidate({ id: profileId });
      const status = data.discovery?.status ?? "unknown";
      if (status === "active") {
        toast.success("Platform link added — feed discovered");
      } else if (status === "apify_needed") {
        toast.success("Platform link added — requires Apify scraper");
      } else {
        toast.success("Platform link added — no feed found");
      }
    },
    onError: (err) => toast.error(err.message),
  });

  // ── Sync notes from server ──
  useEffect(() => {
    if (profile && !notesDirty) {
      setNotes(profile.notes ?? "");
    }
  }, [profile, notesDirty]);

  const handleNotesBlur = useCallback(() => {
    if (!notesDirty || !profile) return;
    updateMut.mutate({ id: profileId, notes: notes || null });
  }, [notesDirty, notes, profileId, profile, updateMut]);

  // ── Derived data ──
  const platformLinks = profile?.platformLinks ?? [];
  const sourceConfigs = profile?.sourceConfigs ?? [];
  const signalItems = signalsData?.items ?? [];

  // Build source config lookup by profileId + feedUrl for status display
  const sourceConfigByFeedUrl = new Map<string, SourceConfig>();
  for (const sc of sourceConfigs) {
    if (sc.configUrl) sourceConfigByFeedUrl.set(sc.configUrl, sc);
  }

  // Count signals per platform link (approximate — by source field matching)
  const signalCountBySource = new Map<string, number>();
  for (const sig of signalItems) {
    const key = sig.source;
    signalCountBySource.set(key, (signalCountBySource.get(key) ?? 0) + 1);
  }

  // Filter signals by fetchMethod from metadata (more accurate than source enum)
  const filteredSignals =
    sourceFilter === "all"
      ? signalItems
      : signalItems.filter((s) => {
          const meta = (s.metadata ?? {}) as Record<string, unknown>;
          const fetchMethod = meta.fetchMethod as string | undefined;
          if (sourceFilter === "website") {
            return fetchMethod === "rss" || fetchMethod === "rss_discovery"
              || (!fetchMethod && s.source === "rss" && !s.sourceUrl?.includes("youtube") && !s.sourceUrl?.includes("reddit"));
          }
          if (sourceFilter === "youtube") {
            return fetchMethod === "youtube_rss"
              || (!fetchMethod && s.source === "rss" && s.sourceUrl?.includes("youtube"));
          }
          if (sourceFilter === "reddit") {
            return fetchMethod === "reddit_rss"
              || (!fetchMethod && (s.source === "reddit" || (s.source === "rss" && s.sourceUrl?.includes("reddit"))));
          }
          if (sourceFilter === "linkedin") {
            return fetchMethod === "apify" && s.sourceUrl?.includes("linkedin")
              || (!fetchMethod && s.source === "linkedin");
          }
          if (sourceFilter === "twitter") {
            return fetchMethod === "google_news"
              || (!fetchMethod && (s.source === "twitter" || s.source === "thought_leader"));
          }
          return true;
        });

  // ── Loading state ──
  if (isLoading) {
    return (
      <div style={{ padding: 24 }}>
        <div
          style={{
            height: 32,
            width: 200,
            borderRadius: 6,
            background: "var(--bg-muted)",
            animation: "pulse 1.5s ease-in-out infinite",
            marginBottom: 16,
          }}
        />
        <div
          style={{
            height: 400,
            borderRadius: 8,
            background: "var(--bg-muted)",
            animation: "pulse 1.5s ease-in-out infinite",
          }}
        />
      </div>
    );
  }

  // ── Not found ──
  if (!profile) {
    return (
      <div style={{ padding: 24, textAlign: "center", marginTop: 60 }}>
        <p style={{ fontSize: 14, color: "var(--ink-tertiary)" }}>Profile not found.</p>
        <button
          onClick={() => router.push(backUrl)}
          style={{
            marginTop: 12,
            padding: "6px 14px",
            fontSize: 12,
            background: "var(--accent)",
            color: "#fff",
            border: "none",
            borderRadius: 6,
            cursor: "pointer",
          }}
        >
          Back to {backLabel}
        </button>
      </div>
    );
  }

  const tBadge = typeBadge(profile.type);
  const iBadge = importanceBadge(profile.importance);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
      {/* ── Header bar ── */}
      <div
        style={{
          padding: "12px 24px",
          borderBottom: "1px solid var(--border-subtle)",
          display: "flex",
          alignItems: "center",
          gap: 12,
          flexShrink: 0,
          flexWrap: "wrap",
        }}
      >
        <button
          onClick={() => router.push(backUrl)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            padding: "4px 10px",
            fontSize: 12,
            color: "var(--ink-secondary)",
            background: "transparent",
            border: "1px solid var(--border-subtle)",
            borderRadius: 6,
            cursor: "pointer",
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5" />
            <path d="M12 19l-7-7 7-7" />
          </svg>
          {backLabel}
        </button>

        <h1
          style={{
            margin: 0,
            fontSize: 18,
            fontWeight: 700,
            color: "var(--ink-primary)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            maxWidth: 400,
          }}
        >
          {profile.name}
        </h1>

        {/* Type badge */}
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            fontSize: 11,
            fontWeight: 600,
            padding: "3px 8px",
            borderRadius: 4,
            background: tBadge.bg,
            color: tBadge.color,
          }}
        >
          {tBadge.label}
        </span>

        {/* Importance badge */}
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            fontSize: 11,
            fontWeight: 600,
            padding: "3px 8px",
            borderRadius: 4,
            background: iBadge.bg,
            color: iBadge.color,
          }}
        >
          {iBadge.label}
        </span>

        {/* Website link */}
        {profile.website && (
          <a
            href={profile.website}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontSize: 12,
              color: "var(--accent)",
              textDecoration: "none",
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
            {truncateUrl(profile.website, 30)}
          </a>
        )}

        {/* Signal count */}
        <span
          style={{
            marginLeft: "auto",
            fontSize: 12,
            color: "var(--ink-tertiary)",
            fontFamily: "var(--font-mono)",
          }}
        >
          {profile.signalCount} signal{profile.signalCount !== 1 ? "s" : ""}
        </span>
      </div>

      {/* ── Two-column layout ── */}
      <div style={{ display: "flex", flex: 1, minHeight: 0, overflow: "hidden" }}>
        {/* ── Left panel ── */}
        <aside
          style={{
            width: 280,
            flexShrink: 0,
            borderRight: "1px solid var(--border-subtle)",
            background: "var(--bg-canvas)",
            padding: 20,
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: 20,
          }}
        >
          {/* Platform Links section */}
          <div>
            <div
              style={{
                fontSize: 10,
                fontWeight: 600,
                color: "var(--ink-tertiary)",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                marginBottom: 10,
              }}
            >
              Platform Links
            </div>

            {platformLinks.length === 0 ? (
              <p style={{ fontSize: 12, color: "var(--ink-tertiary)", margin: 0 }}>
                No platform links configured.
              </p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {platformLinks.map((link) => {
                  const sc = link.feedUrl ? sourceConfigByFeedUrl.get(link.feedUrl) : undefined;
                  const statusColor = platformStatusColor(link);
                  const statusLabel = platformStatusLabel(link, sc);

                  return (
                    <div
                      key={link.id}
                      style={{
                        padding: "10px 12px",
                        borderRadius: 8,
                        border: "1px solid var(--border-subtle)",
                        background: "var(--bg-surface)",
                        display: "flex",
                        flexDirection: "column",
                        gap: 6,
                      }}
                    >
                      {/* Top row: platform name + toggle */}
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <span
                            style={{
                              width: 7,
                              height: 7,
                              borderRadius: "50%",
                              background: statusColor,
                              flexShrink: 0,
                            }}
                          />
                          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--ink-primary)" }}>
                            {PLATFORM_LABELS[link.platform] ?? link.platform}
                          </span>
                        </div>
                        <Toggle
                          checked={link.enabled}
                          onChange={(v) =>
                            toggleLinkMut.mutate({ linkId: link.id, enabled: v })
                          }
                          disabled={toggleLinkMut.isPending}
                        />
                      </div>

                      {/* URL (truncated, clickable) */}
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          fontSize: 11,
                          color: "var(--accent)",
                          textDecoration: "none",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          display: "block",
                        }}
                        title={link.url}
                      >
                        {truncateUrl(link.url, 35)}
                      </a>

                      {/* Status + signal count */}
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <span
                          style={{
                            fontSize: 10,
                            color: statusColor,
                            fontWeight: 500,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            maxWidth: 160,
                          }}
                          title={statusLabel}
                        >
                          {statusLabel}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Add platform link */}
            {!addLinkOpen ? (
              <button
                onClick={() => setAddLinkOpen(true)}
                style={{
                  width: "100%",
                  marginTop: 8,
                  padding: "8px 12px",
                  fontSize: 11,
                  color: "var(--ink-secondary)",
                  background: "transparent",
                  border: "1px dashed var(--border-default)",
                  borderRadius: 6,
                  cursor: "pointer",
                }}
              >
                + Add platform link
              </button>
            ) : (
              <div
                style={{
                  marginTop: 8,
                  padding: 10,
                  borderRadius: 8,
                  border: "1px solid var(--border-default)",
                  background: "var(--bg-surface)",
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}
              >
                <select
                  value={addLinkPlatform}
                  onChange={(e) => setAddLinkPlatform(e.target.value)}
                  style={{
                    width: "100%",
                    height: 30,
                    fontSize: 12,
                    padding: "0 8px",
                    borderRadius: 6,
                    border: "1px solid var(--border-subtle)",
                    background: "var(--bg-canvas)",
                    color: "var(--ink-primary)",
                  }}
                >
                  {PLATFORM_OPTIONS.map((p) => (
                    <option key={p} value={p}>
                      {PLATFORM_LABELS[p] ?? p}
                    </option>
                  ))}
                </select>
                <input
                  type="url"
                  value={addLinkUrl}
                  onChange={(e) => setAddLinkUrl(e.target.value)}
                  placeholder="https://..."
                  style={{
                    width: "100%",
                    height: 30,
                    fontSize: 12,
                    padding: "0 8px",
                    borderRadius: 6,
                    border: "1px solid var(--border-subtle)",
                    background: "var(--bg-canvas)",
                    color: "var(--ink-primary)",
                    boxSizing: "border-box",
                  }}
                />
                <div style={{ display: "flex", gap: 6 }}>
                  <button
                    onClick={() => {
                      if (!addLinkUrl.trim()) return;
                      addLinkMut.mutate({
                        profileId,
                        platform: addLinkPlatform as typeof PLATFORM_OPTIONS[number],
                        url: addLinkUrl.trim(),
                      });
                    }}
                    disabled={!addLinkUrl.trim() || addLinkMut.isPending}
                    style={{
                      flex: 1,
                      padding: "6px 12px",
                      fontSize: 11,
                      fontWeight: 600,
                      color: "#fff",
                      background: addLinkMut.isPending ? "var(--ink-tertiary)" : "var(--accent)",
                      border: "none",
                      borderRadius: 6,
                      cursor: !addLinkUrl.trim() || addLinkMut.isPending ? "not-allowed" : "pointer",
                      opacity: !addLinkUrl.trim() ? 0.5 : 1,
                    }}
                  >
                    {addLinkMut.isPending ? "Adding..." : "Add"}
                  </button>
                  <button
                    onClick={() => {
                      setAddLinkOpen(false);
                      setAddLinkUrl("");
                    }}
                    style={{
                      padding: "6px 12px",
                      fontSize: 11,
                      color: "var(--ink-secondary)",
                      background: "transparent",
                      border: "1px solid var(--border-subtle)",
                      borderRadius: 6,
                      cursor: "pointer",
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Description */}
          {profile.description && (
            <div>
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  color: "var(--ink-tertiary)",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  marginBottom: 6,
                }}
              >
                Description
              </div>
              <p
                style={{
                  margin: 0,
                  fontSize: 12,
                  color: "var(--ink-secondary)",
                  lineHeight: 1.5,
                }}
              >
                {profile.description}
              </p>
            </div>
          )}

          {/* Notes section */}
          <div>
            <div
              style={{
                fontSize: 10,
                fontWeight: 600,
                color: "var(--ink-tertiary)",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                marginBottom: 6,
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              Notes
              {notesDirty && (
                <span style={{ fontSize: 9, color: "var(--accent)", fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>
                  (unsaved)
                </span>
              )}
              {updateMut.isPending && (
                <span
                  style={{
                    display: "inline-block",
                    width: 10,
                    height: 10,
                    border: "2px solid var(--border-subtle)",
                    borderTopColor: "var(--accent)",
                    borderRadius: "50%",
                    animation: "spin 0.6s linear infinite",
                  }}
                />
              )}
            </div>
            <textarea
              ref={notesRef}
              value={notes}
              onChange={(e) => {
                setNotes(e.target.value);
                setNotesDirty(true);
              }}
              onBlur={handleNotesBlur}
              placeholder="Add notes about this profile..."
              rows={4}
              style={{
                width: "100%",
                fontSize: 12,
                lineHeight: 1.5,
                color: "var(--ink-primary)",
                background: "var(--bg-canvas)",
                border: "1px solid var(--border-default)",
                borderRadius: 6,
                padding: "8px 10px",
                resize: "vertical",
                outline: "none",
                fontFamily: "inherit",
                boxSizing: "border-box",
              }}
            />
          </div>

          {/* Created / Updated */}
          <div style={{ fontSize: 11, color: "var(--ink-tertiary)", display: "flex", flexDirection: "column", gap: 4 }}>
            <span>Created {relativeTime(profile.createdAt)}</span>
            <span>Updated {relativeTime(profile.updatedAt)}</span>
          </div>
        </aside>

        {/* ── Right panel ── */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, overflow: "hidden" }}>
          {/* Tab bar */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 0,
              borderBottom: "1px solid var(--border-subtle)",
              padding: "0 24px",
              flexShrink: 0,
            }}
          >
            {(["content", "ideas"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  padding: "10px 16px",
                  fontSize: 13,
                  fontWeight: activeTab === tab ? 600 : 400,
                  color: activeTab === tab ? "var(--accent)" : "var(--ink-secondary)",
                  background: "transparent",
                  border: "none",
                  borderBottom: activeTab === tab ? "2px solid var(--accent)" : "2px solid transparent",
                  cursor: "pointer",
                  marginBottom: -1,
                }}
              >
                {tab === "content" ? "Their Content" : "Your Ideas"}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div style={{ flex: 1, overflowY: "auto", padding: 24 }}>
            {activeTab === "content" && (
              <ContentTab
                signals={filteredSignals}
                totalSignals={signalItems.length}
                sourceFilter={sourceFilter}
                onSourceFilterChange={setSourceFilter}
                hasSourceConfigs={sourceConfigs.length > 0}
              />
            )}
            {activeTab === "ideas" && <IdeasTab profileId={profileId} />}
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Their Content tab
// ---------------------------------------------------------------------------

function ContentTab({
  signals,
  totalSignals,
  sourceFilter,
  onSourceFilterChange,
  hasSourceConfigs,
}: {
  signals: SignalItem[];
  totalSignals: number;
  sourceFilter: SourceFilter;
  onSourceFilterChange: (f: SourceFilter) => void;
  hasSourceConfigs: boolean;
}) {
  return (
    <div>
      {/* Source sub-filters */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          marginBottom: 16,
          flexWrap: "wrap",
        }}
      >
        {SOURCE_FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => onSourceFilterChange(f)}
            style={{
              padding: "5px 12px",
              fontSize: 11,
              fontWeight: sourceFilter === f ? 600 : 400,
              color: sourceFilter === f ? "#fff" : "var(--ink-secondary)",
              background: sourceFilter === f ? "var(--accent)" : "var(--bg-surface)",
              border: sourceFilter === f ? "none" : "1px solid var(--border-subtle)",
              borderRadius: 6,
              cursor: "pointer",
            }}
          >
            {SOURCE_FILTER_LABELS[f]}
            {f === "all" && totalSignals > 0 && (
              <span style={{ marginLeft: 4, opacity: 0.7 }}>({totalSignals})</span>
            )}
          </button>
        ))}
      </div>

      {/* Signal list */}
      {signals.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "60px 20px",
            color: "var(--ink-tertiary)",
          }}
        >
          <svg
            width="40"
            height="40"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--border-default)"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ margin: "0 auto 12px" }}
          >
            <path d="M4 11a9 9 0 0 1 9 9" />
            <path d="M4 4a16 16 0 0 1 16 16" />
            <circle cx="5" cy="19" r="1" />
          </svg>
          <p style={{ fontSize: 13, margin: "0 0 4px" }}>
            {hasSourceConfigs
              ? "Sources configured. Signals will appear after the next sync."
              : "No signals yet. Add platform links to start monitoring."}
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {signals.map((sig) => {
            const classification = (sig.metadata as Record<string, unknown>)?.contentType as string | undefined;
            const clsStyle = classification ? getClassificationStyle(classification) : null;

            return (
              <div
                key={sig.id}
                style={{
                  padding: "12px 14px",
                  borderRadius: 8,
                  border: "1px solid var(--border-subtle)",
                  background: "var(--bg-surface)",
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                }}
              >
                {/* Top row: classification badge + source label + timestamp */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    flexWrap: "wrap",
                  }}
                >
                  {clsStyle && classification && (
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 600,
                        padding: "2px 8px",
                        borderRadius: 4,
                        background: clsStyle.bg,
                        color: clsStyle.color,
                      }}
                    >
                      {classification}
                    </span>
                  )}
                  <span
                    style={{
                      fontSize: 10,
                      color: "var(--ink-tertiary)",
                      textTransform: "uppercase",
                      letterSpacing: "0.04em",
                      fontWeight: 500,
                    }}
                  >
                    {sig.source}
                  </span>
                  <span
                    style={{
                      fontSize: 10,
                      color: "var(--ink-tertiary)",
                      marginLeft: "auto",
                    }}
                  >
                    {relativeTime(sig.publishedAt || sig.createdAt)}
                  </span>
                </div>

                {/* Title (bold) */}
                {sig.title && (
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: "var(--ink-primary)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {sig.sourceUrl ? (
                      <a
                        href={sig.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: "inherit", textDecoration: "none" }}
                      >
                        {sig.title}
                      </a>
                    ) : (
                      sig.title
                    )}
                  </div>
                )}

                {/* Excerpt — first 150 chars of body */}
                {sig.body && (
                  <div
                    style={{
                      fontSize: 12,
                      color: "var(--ink-secondary)",
                      lineHeight: 1.5,
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}
                  >
                    {sig.body.slice(0, 150)}
                    {sig.body.length > 150 ? "..." : ""}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Your Ideas tab — shows ideas generated from this profile's signals
// ---------------------------------------------------------------------------

function IdeasTab({ profileId }: { profileId: string }) {
  const { data: ideas, isLoading } = trpc.ideas.listByProfile.useQuery(
    { profileId, limit: 50 },
    { enabled: !!profileId },
  );

  if (isLoading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            style={{
              height: 72,
              borderRadius: 8,
              background: "var(--bg-muted)",
              animation: "pulse 1.5s ease-in-out infinite",
            }}
          />
        ))}
      </div>
    );
  }

  if (!ideas || ideas.length === 0) {
    return (
      <div
        style={{
          textAlign: "center",
          padding: "60px 20px",
          color: "var(--ink-tertiary)",
        }}
      >
        <svg
          width="40"
          height="40"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--border-default)"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ margin: "0 auto 12px" }}
        >
          <path d="M12 2v1" />
          <path d="M12 21v1" />
          <path d="M4.93 4.93l.7.7" />
          <path d="M18.36 18.36l.7.7" />
          <path d="M2 12h1" />
          <path d="M21 12h1" />
          <path d="M4.93 19.07l.7-.7" />
          <path d="M18.36 5.64l.7-.7" />
          <circle cx="12" cy="12" r="4" />
        </svg>
        <p style={{ fontSize: 14, fontWeight: 600, margin: "0 0 4px", color: "var(--ink-secondary)" }}>
          No ideas yet
        </p>
        <p style={{ fontSize: 12, margin: 0 }}>
          Ideas generated from this profile&apos;s signals will appear here once signals are processed.
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {ideas.map((idea) => {
        const icpPct = Math.round(Number(idea.icpFit) * 100);
        return (
          <div
            key={idea.id}
            style={{
              padding: "12px 14px",
              borderRadius: 8,
              border: "1px solid var(--border-subtle)",
              background: "var(--bg-surface)",
              display: "flex",
              flexDirection: "column",
              gap: 6,
            }}
          >
            {/* Top row: score + ICP + timestamp */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  padding: "2px 8px",
                  borderRadius: 4,
                  background: "rgba(99,102,241,0.1)",
                  color: "#6366f1",
                }}
              >
                Score: {idea.score}
              </span>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  padding: "2px 8px",
                  borderRadius: 4,
                  background: icpPct >= 60
                    ? "rgba(34,197,94,0.1)"
                    : icpPct >= 30
                      ? "rgba(245,158,11,0.1)"
                      : "var(--bg-muted)",
                  color: icpPct >= 60
                    ? "#22c55e"
                    : icpPct >= 30
                      ? "#f59e0b"
                      : "var(--ink-tertiary)",
                }}
              >
                ICP: {icpPct}%
              </span>
              <span
                style={{
                  fontSize: 10,
                  color: "var(--ink-tertiary)",
                  marginLeft: "auto",
                }}
              >
                {relativeTime(idea.publishedAt ?? idea.createdAt)}
              </span>
            </div>

            {/* Hook (bold) */}
            <div
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: "var(--ink-primary)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {idea.sourceUrl ? (
                <a
                  href={idea.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: "inherit", textDecoration: "none" }}
                >
                  {idea.hook}
                </a>
              ) : (
                idea.hook
              )}
            </div>

            {/* Angle */}
            <div
              style={{
                fontSize: 12,
                color: "var(--ink-secondary)",
                lineHeight: 1.5,
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}
            >
              {idea.angle}
            </div>

            {/* Tags */}
            {idea.tags.length > 0 && (
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                {idea.tags.slice(0, 5).map((tag) => (
                  <span
                    key={tag}
                    style={{
                      fontSize: 10,
                      padding: "1px 6px",
                      borderRadius: 3,
                      background: "var(--bg-muted)",
                      color: "var(--ink-tertiary)",
                    }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
