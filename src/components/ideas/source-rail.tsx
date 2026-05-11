"use client";

import { trpc } from "@/lib/trpc/client";

export function SourceRail() {
  const { data: sources } = trpc.signals.listSources.useQuery();

  const sourceCounts = (sources ?? []).reduce(
    (acc, s) => {
      acc[s.source] = (acc[s.source] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Sources panel */}
      <div style={{ borderRadius: 8, border: "1px solid var(--border-subtle)", background: "var(--bg-surface)", overflow: "hidden" }}>
        <div style={{ padding: "10px 12px", borderBottom: "1px solid var(--border-subtle)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h4 style={{ margin: 0, fontSize: 12, fontWeight: 600 }}>Sources</h4>
          <span style={{ fontSize: 10, color: "var(--ink-tertiary)", fontFamily: "var(--font-mono)" }}>
            {sources?.length ?? 0} configured
          </span>
        </div>
        {(!sources || sources.length === 0) ? (
          <div style={{ padding: 16, textAlign: "center", fontSize: 11, color: "var(--ink-tertiary)" }}>
            No signal sources configured yet.
          </div>
        ) : (
          sources.map((s, i) => (
            <div
              key={s.id}
              style={{
                padding: "8px 12px",
                display: "flex",
                alignItems: "center",
                gap: 9,
                borderTop: i ? "1px solid var(--border-subtle)" : 0,
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
              <span
                style={{
                  fontSize: 9,
                  padding: "1px 5px",
                  borderRadius: 4,
                  background: s.enabled ? "rgba(34,197,94,0.1)" : "var(--bg-muted)",
                  color: s.enabled ? "#22c55e" : "var(--ink-tertiary)",
                }}
              >
                {s.enabled ? "live" : "paused"}
              </span>
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
          {Object.entries(sourceCounts).map(([source, count]) => (
            <div key={source} style={{ padding: 8, background: "var(--bg-muted)", borderRadius: 5 }}>
              <div style={{ fontSize: 8.5, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--ink-tertiary)", marginBottom: 2 }}>
                {source}
              </div>
              <div style={{ fontSize: 16, fontWeight: 600, fontFamily: "var(--font-mono)" }}>{count}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
