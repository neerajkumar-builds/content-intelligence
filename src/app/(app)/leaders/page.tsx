"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { ProfileCard } from "@/components/profiles/profile-card";
import type { ProfileListItem } from "@/components/profiles/profile-card";
import { AddProfileDialog } from "@/components/profiles/add-profile-dialog";

// ---------------------------------------------------------------------------
// Type filter chips
// ---------------------------------------------------------------------------

type LeaderFilter = "all" | "thought_leader" | "content_creator";

const FILTER_CHIPS: { value: LeaderFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "thought_leader", label: "Thought Leader" },
  { value: "content_creator", label: "Content Creator" },
];

// ---------------------------------------------------------------------------
// Skeleton card (matches ProfileCard dimensions)
// ---------------------------------------------------------------------------

function SkeletonCard() {
  return (
    <div
      style={{
        padding: 20,
        borderRadius: 10,
        border: "1px solid var(--border-subtle)",
        background: "var(--bg-surface)",
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      {/* Header skeleton: avatar + name */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: "50%",
            background: "var(--bg-muted)",
          }}
        />
        <div style={{ flex: 1 }}>
          <div
            style={{
              width: "60%",
              height: 14,
              borderRadius: 4,
              background: "var(--bg-muted)",
            }}
          />
          <div
            style={{
              width: "40%",
              height: 10,
              borderRadius: 4,
              background: "var(--bg-muted)",
              marginTop: 6,
            }}
          />
        </div>
      </div>
      {/* Description skeleton */}
      <div
        style={{
          width: "100%",
          height: 10,
          borderRadius: 4,
          background: "var(--bg-muted)",
        }}
      />
      <div
        style={{
          width: "80%",
          height: 10,
          borderRadius: 4,
          background: "var(--bg-muted)",
        }}
      />
      {/* Stats skeleton */}
      <div
        style={{
          display: "flex",
          gap: 16,
          borderTop: "1px solid var(--border-subtle)",
          paddingTop: 10,
          marginTop: "auto",
        }}
      >
        <div
          style={{
            width: 60,
            height: 10,
            borderRadius: 4,
            background: "var(--bg-muted)",
          }}
        />
        <div
          style={{
            width: 50,
            height: 10,
            borderRadius: 4,
            background: "var(--bg-muted)",
          }}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function ThoughtLeadersPage() {
  const [filter, setFilter] = useState<LeaderFilter>("all");
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  // Query all person-type profiles: thought_leader + content_creator
  // When filter === "all", fetch both types (no type filter sent)
  // When specific, filter to that type
  const thoughtLeaders = trpc.profiles.list.useQuery(
    filter === "all" ? undefined : { type: filter },
  );

  // Filter client-side when "all" — only show people, not competitors
  const profiles: ProfileListItem[] = (
    (thoughtLeaders.data ?? []) as ProfileListItem[]
  ).filter(
    (p) => p.type === "thought_leader" || p.type === "content_creator",
  );

  const isLoading = thoughtLeaders.isLoading;

  return (
    <div style={{ padding: "32px 32px 64px" }}>
      {/* Page header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 24,
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
            Thought Leaders
          </h1>
          <p
            style={{
              fontSize: 13,
              color: "var(--ink-secondary)",
              margin: "4px 0 0",
            }}
          >
            Track thought leaders and content creators in your space
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
          Add Thought Leader
        </button>
      </div>

      {/* Filter chips */}
      <div
        style={{
          display: "flex",
          gap: 8,
          marginBottom: 20,
          flexWrap: "wrap",
        }}
      >
        {FILTER_CHIPS.map((chip) => {
          const active = filter === chip.value;
          return (
            <button
              key={chip.value}
              onClick={() => setFilter(chip.value)}
              style={{
                padding: "6px 14px",
                borderRadius: 20,
                border: `1px solid ${active ? "var(--accent, #6366f1)" : "var(--border-subtle)"}`,
                background: active
                  ? "var(--accent, #6366f1)"
                  : "var(--bg-surface)",
                color: active ? "#fff" : "var(--ink-secondary)",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.15s",
              }}
            >
              {chip.label}
            </button>
          );
        })}
      </div>

      {/* Loading skeletons */}
      {isLoading && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
            gap: 16,
          }}
        >
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && profiles.length === 0 && (
        <div
          style={{
            textAlign: "center",
            padding: "80px 24px",
            color: "var(--ink-tertiary)",
          }}
        >
          <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.4 }}>
            &#10024;
          </div>
          <div
            style={{
              fontSize: 15,
              fontWeight: 600,
              color: "var(--ink-secondary)",
              marginBottom: 8,
            }}
          >
            Track thought leaders in your space
          </div>
          <div style={{ fontSize: 13, maxWidth: 360, margin: "0 auto" }}>
            Add your first thought leader to start monitoring their content and
            surfacing relevant signals.
          </div>
          <button
            onClick={() => setAddDialogOpen(true)}
            style={{
              marginTop: 20,
              padding: "8px 20px",
              borderRadius: 6,
              border: "none",
              background: "var(--accent, #6366f1)",
              color: "#fff",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Add Thought Leader
          </button>
        </div>
      )}

      {/* Card grid */}
      {!isLoading && profiles.length > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
            gap: 16,
          }}
        >
          {profiles.map((profile) => (
            <ProfileCard key={profile.id} profile={profile} />
          ))}
        </div>
      )}

      <AddProfileDialog
        open={addDialogOpen}
        onClose={() => setAddDialogOpen(false)}
        defaultType="thought_leader"
      />
    </div>
  );
}
