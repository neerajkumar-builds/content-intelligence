"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { ProfileCard } from "@/components/profiles/profile-card";
import type { ProfileListItem } from "@/components/profiles/profile-card";
import { AddProfileDialog } from "@/components/profiles/add-profile-dialog";

const IMPORTANCE_FILTERS = ["all", "high", "medium", "low"] as const;
type ImportanceFilter = (typeof IMPORTANCE_FILTERS)[number];

const filterLabel: Record<ImportanceFilter, string> = {
  all: "All",
  high: "High",
  medium: "Medium",
  low: "Low",
};

export default function CompetitorsPage() {
  const [filter, setFilter] = useState<ImportanceFilter>("all");
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  const { data, isLoading } = trpc.profiles.list.useQuery({
    type: "competitor",
  });

  const profiles: ProfileListItem[] = (data ?? []) as ProfileListItem[];

  const filtered =
    filter === "all"
      ? profiles
      : profiles.filter((p) => p.importance === filter);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        minHeight: 0,
      }}
    >
      {/* Page header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "24px 24px 0",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div>
          <h1
            style={{
              fontSize: 22,
              fontWeight: 700,
              color: "var(--ink-primary)",
              margin: 0,
            }}
          >
            Competitors
          </h1>
          <p
            style={{
              fontSize: 13,
              color: "var(--ink-secondary)",
              margin: "4px 0 0",
            }}
          >
            Track competitor content and stay ahead of the conversation
          </p>
        </div>
        <button
          onClick={() => setAddDialogOpen(true)}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "8px 16px",
            borderRadius: 6,
            border: "none",
            background: "var(--accent, #6366f1)",
            color: "#fff",
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          <span style={{ fontSize: 16, lineHeight: 1 }}>+</span>
          Add Competitor
        </button>
      </div>

      {/* Filter chips */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          padding: "16px 24px",
          borderBottom: "1px solid var(--border-subtle)",
          gap: 6,
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {IMPORTANCE_FILTERS.map((f) => {
            const isActive = filter === f;
            const count =
              f === "all"
                ? profiles.length
                : profiles.filter((p) => p.importance === f).length;

            return (
              <button
                key={f}
                onClick={() => setFilter(f)}
                style={{
                  padding: "6px 14px",
                  fontSize: 12,
                  fontWeight: 600,
                  borderRadius: 6,
                  border: "1px solid",
                  borderColor: isActive
                    ? "var(--accent)"
                    : "var(--border-subtle)",
                  background: isActive ? "var(--accent)" : "transparent",
                  color: isActive ? "#fff" : "var(--ink-secondary)",
                  cursor: "pointer",
                  transition: "all 0.15s",
                }}
              >
                {filterLabel[f]}
                {!isLoading && (
                  <span
                    style={{
                      marginLeft: 4,
                      opacity: 0.7,
                      fontSize: 11,
                    }}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

      </div>

      {/* Content area */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "16px 24px 60px",
        }}
      >
        {isLoading ? (
          /* Skeleton loader */
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
              gap: 12,
            }}
          >
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                style={{
                  height: 200,
                  borderRadius: 10,
                  background: "var(--bg-muted)",
                  animation: "pulse 1.5s ease-in-out infinite",
                }}
              />
            ))}
          </div>
        ) : filtered.length === 0 && profiles.length === 0 ? (
          /* Empty state — no competitors at all */
          <div style={{ textAlign: "center", padding: "80px 20px" }}>
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: "50%",
                background: "var(--bg-muted)",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 24,
                marginBottom: 16,
              }}
            >
              &#x2691;
            </div>
            <h3
              style={{
                margin: "0 0 8px",
                fontSize: 18,
                fontWeight: 600,
                color: "var(--ink-primary)",
              }}
            >
              Track what competitors are publishing
            </h3>
            <p
              style={{
                fontSize: 13,
                color: "var(--ink-tertiary)",
                margin: "0 0 20px",
                maxWidth: 420,
                marginLeft: "auto",
                marginRight: "auto",
                lineHeight: 1.5,
              }}
            >
              Add your first competitor to discover their content sources, track
              signals, and stay ahead of the conversation.
            </p>
            <button
              onClick={() => setAddDialogOpen(true)}
              style={{
                padding: "10px 20px",
                fontSize: 13,
                fontWeight: 600,
                background: "var(--accent)",
                color: "#fff",
                border: "none",
                borderRadius: 6,
                cursor: "pointer",
              }}
            >
              + Add your first competitor
            </button>
          </div>
        ) : filtered.length === 0 ? (
          /* Empty filtered state — competitors exist but none match filter */
          <div style={{ textAlign: "center", padding: "60px 20px" }}>
            <p
              style={{
                fontSize: 13,
                color: "var(--ink-tertiary)",
                margin: 0,
              }}
            >
              No competitors match the &ldquo;{filterLabel[filter]}&rdquo;
              importance filter.
            </p>
          </div>
        ) : (
          /* Card grid */
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
              gap: 12,
            }}
          >
            {filtered.map((profile) => (
              <ProfileCard key={profile.id} profile={profile} />
            ))}
          </div>
        )}
      </div>

      <AddProfileDialog
        open={addDialogOpen}
        onClose={() => setAddDialogOpen(false)}
        defaultType="competitor"
      />
    </div>
  );
}
