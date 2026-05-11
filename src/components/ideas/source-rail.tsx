"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";
import { AddSourceDialog } from "./add-source-dialog";

interface EditingState {
  id: string;
  label: string;
  configUrl: string;
}

export function SourceRail() {
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<EditingState | null>(null);
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

  const updateMut = trpc.signals.updateSource.useMutation({
    onSuccess: () => {
      toast.success("Source updated");
      setEditing(null);
      void utils.signals.listSources.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const sourceCounts = (sources ?? []).reduce(
    (acc, s) => {
      acc[s.source] = (acc[s.source] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  function handleSaveEdit() {
    if (!editing) return;
    updateMut.mutate({
      sourceId: editing.id,
      label: editing.label,
      configUrl: editing.configUrl,
    });
  }

  return (
    <>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {/* Sources panel */}
        <div style={{ borderRadius: 10, border: "1px solid var(--border-subtle)", background: "var(--bg-surface)", overflow: "hidden" }}>
          <div style={{ padding: "12px 14px", borderBottom: "1px solid var(--border-subtle)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <h4 style={{ margin: 0, fontSize: 13, fontWeight: 600 }}>Signal Sources</h4>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 11, color: "var(--ink-tertiary)" }}>
                {sources?.length ?? 0}
              </span>
              <button
                onClick={() => setShowAdd(true)}
                style={{
                  padding: "3px 10px",
                  fontSize: 11,
                  fontWeight: 600,
                  borderRadius: 5,
                  border: "1px solid var(--accent)",
                  background: "rgba(99,102,241,0.08)",
                  color: "var(--accent)",
                  cursor: "pointer",
                }}
              >
                + Add
              </button>
            </div>
          </div>

          {(!sources || sources.length === 0) ? (
            <div style={{ padding: 24, textAlign: "center" }}>
              <div style={{ fontSize: 28, marginBottom: 8, opacity: 0.3 }}>+</div>
              <div style={{ fontSize: 12, color: "var(--ink-tertiary)", marginBottom: 12 }}>
                No signal sources yet
              </div>
              <button
                onClick={() => setShowAdd(true)}
                style={{
                  padding: "7px 14px",
                  fontSize: 12,
                  fontWeight: 600,
                  borderRadius: 6,
                  border: "none",
                  background: "var(--accent)",
                  color: "white",
                  cursor: "pointer",
                }}
              >
                Add first source
              </button>
            </div>
          ) : (
            sources.map((s) => {
              const isEditing = editing?.id === s.id;

              return (
                <div
                  key={s.id}
                  style={{
                    padding: "10px 14px",
                    borderTop: "1px solid var(--border-subtle)",
                  }}
                >
                  {isEditing ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      <input
                        value={editing.label}
                        onChange={(e) => setEditing({ ...editing, label: e.target.value })}
                        style={{
                          padding: "5px 8px",
                          fontSize: 12,
                          borderRadius: 4,
                          border: "1px solid var(--accent)",
                          background: "var(--bg-canvas)",
                          color: "var(--ink-primary)",
                          outline: "none",
                        }}
                      />
                      <input
                        value={editing.configUrl}
                        onChange={(e) => setEditing({ ...editing, configUrl: e.target.value })}
                        style={{
                          padding: "5px 8px",
                          fontSize: 11,
                          fontFamily: "var(--font-mono)",
                          borderRadius: 4,
                          border: "1px solid var(--accent)",
                          background: "var(--bg-canvas)",
                          color: "var(--ink-primary)",
                          outline: "none",
                        }}
                      />
                      <div style={{ display: "flex", gap: 4, justifyContent: "flex-end" }}>
                        <button
                          onClick={() => setEditing(null)}
                          style={{ padding: "3px 8px", fontSize: 10, borderRadius: 4, border: "1px solid var(--border-subtle)", background: "transparent", color: "var(--ink-tertiary)", cursor: "pointer" }}
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleSaveEdit}
                          disabled={updateMut.isPending}
                          style={{ padding: "3px 8px", fontSize: 10, borderRadius: 4, border: "none", background: "var(--accent)", color: "white", cursor: "pointer", fontWeight: 600 }}
                        >
                          {updateMut.isPending ? "..." : "Save"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {s.label}
                          </div>
                        </div>
                        <button
                          onClick={() => toggleMut.mutate({ sourceId: s.id, enabled: !s.enabled })}
                          title={s.enabled ? "Pause source" : "Enable source"}
                          style={{
                            fontSize: 10,
                            padding: "2px 8px",
                            borderRadius: 10,
                            border: "none",
                            cursor: "pointer",
                            fontWeight: 500,
                            background: s.enabled ? "rgba(34,197,94,0.12)" : "var(--bg-muted)",
                            color: s.enabled ? "#16a34a" : "var(--ink-tertiary)",
                          }}
                        >
                          {s.enabled ? "live" : "paused"}
                        </button>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                        <span style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--ink-tertiary)", background: "var(--bg-muted)", padding: "1px 6px", borderRadius: 3 }}>
                          {s.source}
                        </span>
                        <span
                          style={{ fontSize: 10, color: "var(--ink-tertiary)", fontFamily: "var(--font-mono)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}
                          title={s.configUrl}
                        >
                          {s.configUrl.replace(/^https?:\/\//, "").slice(0, 40)}
                        </span>
                      </div>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button
                          onClick={() => setEditing({ id: s.id, label: s.label, configUrl: s.configUrl })}
                          style={{ fontSize: 10, color: "var(--ink-tertiary)", background: "none", border: "none", cursor: "pointer", padding: 0, textDecoration: "underline", textUnderlineOffset: 2 }}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Remove "${s.label}"?`)) {
                              deleteMut.mutate({ sourceId: s.id });
                            }
                          }}
                          style={{ fontSize: 10, color: "#ef4444", background: "none", border: "none", cursor: "pointer", padding: 0, textDecoration: "underline", textUnderlineOffset: 2 }}
                        >
                          Remove
                        </button>
                      </div>
                    </>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Summary stats */}
        <div style={{ borderRadius: 10, border: "1px solid var(--border-subtle)", background: "var(--bg-surface)", overflow: "hidden" }}>
          <div style={{ padding: "12px 14px", borderBottom: "1px solid var(--border-subtle)" }}>
            <h4 style={{ margin: 0, fontSize: 13, fontWeight: 600 }}>Breakdown</h4>
          </div>
          <div style={{ padding: "12px 14px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {Object.entries(sourceCounts).length > 0 ? (
              Object.entries(sourceCounts).map(([source, count]) => (
                <div key={source} style={{ padding: 10, background: "var(--bg-muted)", borderRadius: 6 }}>
                  <div style={{ fontSize: 9, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--ink-tertiary)", marginBottom: 3 }}>
                    {source}
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 600, fontFamily: "var(--font-mono)" }}>{count}</div>
                </div>
              ))
            ) : (
              <div style={{ gridColumn: "1/-1", textAlign: "center", fontSize: 11, color: "var(--ink-tertiary)", padding: 8 }}>
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
