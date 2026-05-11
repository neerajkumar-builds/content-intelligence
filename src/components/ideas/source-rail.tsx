"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";
import { AddSourceDialog } from "./add-source-dialog";

export function SourceRail() {
  const [showAdd, setShowAdd] = useState(false);
  const { data: sources } = trpc.signals.listSources.useQuery();
  const utils = trpc.useUtils();

  const toggleMut = trpc.signals.toggleSource.useMutation({
    onSuccess: (_, vars) => {
      toast.success(vars.enabled ? "Source enabled" : "Source paused");
      void utils.signals.listSources.invalidate();
    },
  });

  const deleteMut = trpc.signals.deleteSource.useMutation({
    onSuccess: () => {
      toast.success("Source removed");
      void utils.signals.listSources.invalidate();
    },
  });

  const sourceCounts = (sources ?? []).reduce(
    (acc, s) => {
      acc[s.source] = (acc[s.source] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  return (
    <>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {/* Sources panel */}
        <div style={{ borderRadius: 8, border: "1px solid var(--border-subtle)", background: "var(--bg-surface)", overflow: "hidden" }}>
          <div style={{ padding: "10px 12px", borderBottom: "1px solid var(--border-subtle)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <h4 style={{ margin: 0, fontSize: 12, fontWeight: 600 }}>Sources</h4>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 10, color: "var(--ink-tertiary)", fontFamily: "var(--font-mono)" }}>
                {sources?.length ?? 0} configured
              </span>
              <button
                onClick={() => setShowAdd(true)}
                style={{
                  padding: "2px 7px",
                  fontSize: 11,
                  fontWeight: 600,
                  borderRadius: 4,
                  border: "1px solid var(--accent)",
                  background: "rgba(99,102,241,0.08)",
                  color: "var(--accent)",
                  cursor: "pointer",
                  lineHeight: "16px",
                }}
              >
                +
              </button>
            </div>
          </div>
          {(!sources || sources.length === 0) ? (
            <div style={{ padding: 20, textAlign: "center" }}>
              <div style={{ fontSize: 11, color: "var(--ink-tertiary)", marginBottom: 10 }}>
                No signal sources configured yet.
              </div>
              <button
                onClick={() => setShowAdd(true)}
                style={{
                  padding: "6px 12px",
                  fontSize: 11,
                  fontWeight: 600,
                  borderRadius: 5,
                  border: "none",
                  background: "var(--accent)",
                  color: "white",
                  cursor: "pointer",
                }}
              >
                + Add first source
              </button>
            </div>
          ) : (
            sources.map((s, i) => (
              <div
                key={s.id}
                style={{
                  padding: "8px 12px",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  borderTop: i ? "1px solid var(--border-subtle)" : undefined,
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 11.5, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {s.label}
                  </div>
                  <div style={{ fontSize: 9.5, color: "var(--ink-tertiary)", fontFamily: "var(--font-mono)" }}>
                    {s.source}
                  </div>
                </div>
                <button
                  onClick={() => toggleMut.mutate({ sourceId: s.id, enabled: !s.enabled })}
                  title={s.enabled ? "Pause source" : "Enable source"}
                  style={{
                    fontSize: 9,
                    padding: "1px 5px",
                    borderRadius: 4,
                    border: "none",
                    cursor: "pointer",
                    background: s.enabled ? "rgba(34,197,94,0.1)" : "var(--bg-muted)",
                    color: s.enabled ? "#22c55e" : "var(--ink-tertiary)",
                  }}
                >
                  {s.enabled ? "live" : "paused"}
                </button>
                <button
                  onClick={() => {
                    if (confirm(`Remove "${s.label}"?`)) {
                      deleteMut.mutate({ sourceId: s.id });
                    }
                  }}
                  title="Remove source"
                  style={{
                    fontSize: 11,
                    padding: "0 3px",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "var(--ink-tertiary)",
                    opacity: 0.5,
                    lineHeight: 1,
                  }}
                >
                  &times;
                </button>
              </div>
            ))
          )}
        </div>

        {/* Summary stats */}
        <div style={{ borderRadius: 8, border: "1px solid var(--border-subtle)", background: "var(--bg-surface)", overflow: "hidden" }}>
          <div style={{ padding: "10px 12px", borderBottom: "1px solid var(--border-subtle)" }}>
            <h4 style={{ margin: 0, fontSize: 12, fontWeight: 600 }}>Source breakdown</h4>
          </div>
          <div style={{ padding: "10px 12px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {Object.entries(sourceCounts).length > 0 ? (
              Object.entries(sourceCounts).map(([source, count]) => (
                <div key={source} style={{ padding: 8, background: "var(--bg-muted)", borderRadius: 5 }}>
                  <div style={{ fontSize: 8.5, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--ink-tertiary)", marginBottom: 2 }}>
                    {source}
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 600, fontFamily: "var(--font-mono)" }}>{count}</div>
                </div>
              ))
            ) : (
              <div style={{ gridColumn: "1/-1", textAlign: "center", fontSize: 10, color: "var(--ink-tertiary)", padding: 4 }}>
                No sources yet
              </div>
            )}
          </div>
        </div>
      </div>

      <AddSourceDialog open={showAdd} onClose={() => setShowAdd(false)} />
    </>
  );
}
