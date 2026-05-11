"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";
import { IdeaCard } from "@/components/ideas/idea-card";
import { SourceRail } from "@/components/ideas/source-rail";
import { FilterBar } from "@/components/ideas/filter-bar";

export default function IdeaWallPage() {
  const [filter, setFilter] = useState("all");
  const [sort, setSort] = useState<"hot" | "icp" | "fresh">("hot");

  const utils = trpc.useUtils();

  const { data, isLoading } = trpc.ideas.list.useQuery({
    source: filter === "all" ? undefined : filter,
    sort,
    limit: 50,
  });

  const dismissMut = trpc.ideas.dismiss.useMutation({
    onSuccess: () => {
      toast.success("Idea dismissed");
      void utils.ideas.list.invalidate();
    },
  });

  const items = data?.items ?? [];

  function handleGenerate(ideaId: string) {
    toast.info("Draft generation coming in next update");
    void ideaId;
  }

  function handleDismiss(ideaId: string) {
    dismissMut.mutate({ ideaId });
  }

  function handleAddIdea() {
    toast.info("Manual idea entry coming soon");
  }

  return (
    <div style={{ display: "flex", height: "100%", minHeight: 0 }}>
      {/* Main area */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, overflow: "hidden" }}>
        <FilterBar
          filter={filter}
          sort={sort}
          count={items.length}
          onFilterChange={setFilter}
          onSortChange={(s) => setSort(s as "hot" | "icp" | "fresh")}
          onAddIdea={handleAddIdea}
        />

        <div style={{ flex: 1, overflowY: "auto", padding: "16px 24px 60px" }}>
          {isLoading ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))", gap: 12 }}>
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  style={{
                    height: 220,
                    borderRadius: 8,
                    background: "var(--bg-muted)",
                    animation: "pulse 1.5s ease-in-out infinite",
                  }}
                />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div style={{ textAlign: "center", padding: "80px 20px" }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>✦</div>
              <h3 style={{ margin: "0 0 8px", fontSize: 18, fontWeight: 600 }}>No ideas yet</h3>
              <p style={{ fontSize: 13, color: "var(--ink-tertiary)", margin: "0 0 20px", maxWidth: 400, marginLeft: "auto", marginRight: "auto" }}>
                Configure signal sources to start ingesting content ideas from RSS feeds, Reddit, and more.
              </p>
              <button
                onClick={handleAddIdea}
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
                + Add idea manually
              </button>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))", gap: 12 }}>
              {items.map((idea) => (
                <IdeaCard key={idea.id} idea={idea} onGenerate={handleGenerate} onDismiss={handleDismiss} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right rail */}
      <aside
        style={{
          width: 280,
          flexShrink: 0,
          borderLeft: "1px solid var(--border-subtle)",
          background: "var(--bg-canvas)",
          padding: 16,
          overflowY: "auto",
        }}
      >
        <SourceRail />
      </aside>
    </div>
  );
}
