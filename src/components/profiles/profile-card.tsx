"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// ---------------------------------------------------------------------------
// Types — matches shape returned by trpc.profiles.list
// ---------------------------------------------------------------------------

type PlatformLink = {
  id: string;
  profileId: string;
  platform: string;
  url: string;
  feedUrl: string | null;
  fetchMethod: string;
  enabled: boolean;
  lastFetchedAt: Date | string | null;
  metadata: Record<string, unknown>;
  createdAt: Date | string;
  updatedAt: Date | string;
};

export type ProfileListItem = {
  id: string;
  workspaceId: string;
  name: string;
  type: "competitor" | "thought_leader" | "content_creator";
  website: string | null;
  description: string | null;
  importance: "high" | "medium" | "low";
  notes: string | null;
  metadata: Record<string, unknown>;
  archivedAt: Date | string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  platformLinks: PlatformLink[];
  signalCount: number;
  sourceCount: number;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function importanceBadge(importance: "high" | "medium" | "low"): {
  label: string;
  color: string;
  bg: string;
} {
  switch (importance) {
    case "high":
      return { label: "High", color: "#22c55e", bg: "rgba(34,197,94,0.1)" };
    case "medium":
      return { label: "Medium", color: "#f59e0b", bg: "rgba(245,158,11,0.1)" };
    case "low":
      return {
        label: "Low",
        color: "var(--ink-tertiary)",
        bg: "var(--bg-muted)",
      };
  }
}

function platformStatusColor(link: PlatformLink): string {
  if (link.feedUrl && link.enabled) return "#22c55e"; // active — green
  if (link.fetchMethod === "apify") return "#f59e0b"; // needs Apify — amber
  return "#ef4444"; // error / no feed — red
}

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

function relativeTime(date: Date | string | null): string {
  if (!date) return "No activity";
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
  return d.toLocaleDateString();
}

/** Compute initials from a name: "Pam Didner" -> "PD", "Neeraj" -> "N" */
function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return (parts[0]?.[0] ?? "?").toUpperCase();
}

/** Whether this profile represents a person (not a company) */
function isPerson(type: ProfileListItem["type"]): boolean {
  return type === "thought_leader" || type === "content_creator";
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ProfileCard({ profile }: { profile: ProfileListItem }) {
  const router = useRouter();
  const [hovered, setHovered] = useState(false);

  const badge = importanceBadge(profile.importance);
  const detailPath =
    profile.type === "competitor"
      ? `/competitors/${profile.id}`
      : `/leaders/${profile.id}`;

  const activeSources = profile.platformLinks.filter(
    (l) => l.feedUrl && l.enabled,
  ).length;
  const totalSources = profile.platformLinks.length;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => router.push(detailPath)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          router.push(detailPath);
        }
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: 20,
        borderRadius: 10,
        border: `1px solid ${hovered ? "var(--accent)" : "var(--border-subtle)"}`,
        background: "var(--bg-surface)",
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        gap: 12,
        transition: "border-color 0.15s, box-shadow 0.15s",
        boxShadow: hovered ? "0 2px 8px rgba(0,0,0,0.08)" : "none",
      }}
    >
      {/* Header: avatar (people) + name + importance badge */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 8,
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10, minWidth: 0 }}>
          {isPerson(profile.type) && (
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: "50%",
                background: "var(--accent, #6366f1)",
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 13,
                fontWeight: 700,
                flexShrink: 0,
                letterSpacing: 0.5,
              }}
            >
              {getInitials(profile.name)}
            </div>
          )}
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontSize: 15,
                fontWeight: 700,
                color: "var(--ink-primary)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {profile.name}
            </div>
            {/* Person: show title @ company from metadata */}
            {isPerson(profile.type) &&
              ((profile.metadata as Record<string, string>).title ||
                (profile.metadata as Record<string, string>).company) && (
                <div
                  style={{
                    fontSize: 11,
                    color: "var(--ink-secondary)",
                    marginTop: 2,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {[
                    (profile.metadata as Record<string, string>).title,
                    (profile.metadata as Record<string, string>).company,
                  ]
                    .filter(Boolean)
                    .join(" at ")}
                </div>
              )}
            {/* Competitor / fallback: show website */}
            {!isPerson(profile.type) && profile.website && (
              <div
                style={{
                  fontSize: 11,
                  color: "var(--ink-tertiary)",
                  marginTop: 2,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {profile.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}
              </div>
            )}
            {/* People with website but no title/company — show website too */}
            {isPerson(profile.type) &&
              !(profile.metadata as Record<string, string>).title &&
              !(profile.metadata as Record<string, string>).company &&
              profile.website && (
                <div
                  style={{
                    fontSize: 11,
                    color: "var(--ink-tertiary)",
                    marginTop: 2,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {profile.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                </div>
              )}
          </div>
        </div>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            fontSize: 11,
            fontWeight: 600,
            padding: "3px 8px",
            borderRadius: 4,
            background: badge.bg,
            color: badge.color,
            flexShrink: 0,
          }}
        >
          {badge.label}
        </span>
      </div>

      {/* Description */}
      {profile.description && (
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
          {profile.description}
        </div>
      )}

      {/* Platform status dots */}
      {profile.platformLinks.length > 0 && (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 8,
          }}
        >
          {profile.platformLinks.map((link) => (
            <span
              key={link.id}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                fontSize: 10,
                color: "var(--ink-tertiary)",
              }}
            >
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  background: platformStatusColor(link),
                  flexShrink: 0,
                }}
              />
              {PLATFORM_LABELS[link.platform] ?? link.platform}
            </span>
          ))}
        </div>
      )}

      {/* Stats bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          fontSize: 11,
          color: "var(--ink-tertiary)",
          borderTop: "1px solid var(--border-subtle)",
          paddingTop: 10,
          marginTop: "auto",
        }}
      >
        <span>
          {profile.signalCount} signal{profile.signalCount !== 1 ? "s" : ""}
        </span>
        <span>
          {activeSources}/{totalSources} source
          {totalSources !== 1 ? "s" : ""}
        </span>
        <span style={{ marginLeft: "auto" }}>
          {relativeTime(profile.updatedAt)}
        </span>
      </div>
    </div>
  );
}
