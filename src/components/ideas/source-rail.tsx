"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";
import { AddSourceDialog } from "./add-source-dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

interface EditingState {
  id: string;
  label: string;
  configUrl: string;
}

export function SourceRail() {
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<EditingState | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; label: string } | null>(null);
  const [linkingSourceId, setLinkingSourceId] = useState<string | null>(null);
  const { data: sources } = trpc.signals.listSources.useQuery();
  const { data: profilesList } = trpc.profiles.list.useQuery({});
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

  const linkProfileMut = trpc.signals.updateSource.useMutation({
    onSuccess: () => {
      toast.success("Profile linked");
      setLinkingSourceId(null);
      void utils.signals.listSources.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const [cooldownUntil, setCooldownUntil] = useState<number>(0);
  const isCoolingDown = Date.now() < cooldownUntil;

  const syncMut = trpc.signals.triggerSync.useMutation({
    onSuccess: () => {
      toast.success("Signal sync triggered — new ideas will appear shortly");
      setCooldownUntil(Date.now() + 2 * 60 * 1000);
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
                onClick={() => syncMut.mutate()}
                disabled={syncMut.isPending || isCoolingDown}
                title={isCoolingDown ? "Sync cooling down (2 min)" : "Trigger signal sync now"}
                style={{
                  padding: "3px 10px",
                  fontSize: 11,
                  fontWeight: 600,
                  borderRadius: 5,
                  border: "1px solid var(--border-subtle)",
                  background: syncMut.isPending ? "var(--bg-muted)" : "transparent",
                  color: isCoolingDown ? "var(--ink-tertiary)" : "var(--ink-secondary)",
                  cursor: isCoolingDown || syncMut.isPending ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                  <path d="M3 3v5h5" />
                  <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
                  <path d="M16 16h5v5" />
                </svg>
                {syncMut.isPending ? "Syncing..." : "Sync"}
              </button>
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
                      <div style={{ display: "flex", gap: 2, alignItems: "center" }}>
                        <button
                          onClick={() => setEditing({ id: s.id, label: s.label, configUrl: s.configUrl })}
                          title="Edit source"
                          style={{ padding: 4, background: "none", border: "none", cursor: "pointer", color: "var(--ink-tertiary)", borderRadius: 4, display: "flex", alignItems: "center" }}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 20h9" />
                            <path d="M16.376 3.622a1 1 0 0 1 3.002 3.002L7.368 18.635a2 2 0 0 1-.855.506l-2.872.838.838-2.872a2 2 0 0 1 .506-.855z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => setDeleteTarget({ id: s.id, label: s.label })}
                          title="Remove source"
                          style={{ padding: 4, background: "none", border: "none", cursor: "pointer", color: "var(--ink-tertiary)", borderRadius: 4, display: "flex", alignItems: "center" }}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M3 6h18" />
                            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                          </svg>
                        </button>
                        {!s.profileId && (profilesList ?? []).length > 0 && (
                          <div style={{ position: "relative", marginLeft: 4 }}>
                            <button
                              onClick={() => setLinkingSourceId(linkingSourceId === s.id ? null : s.id)}
                              title="Link to a profile"
                              style={{
                                padding: "2px 6px",
                                fontSize: 9.5,
                                fontWeight: 500,
                                borderRadius: 3,
                                border: "1px dashed var(--border-subtle)",
                                background: "transparent",
                                color: "var(--ink-tertiary)",
                                cursor: "pointer",
                                whiteSpace: "nowrap",
                              }}
                            >
                              Link profile
                            </button>
                            {linkingSourceId === s.id && (
                              <div style={{
                                position: "absolute",
                                top: "100%",
                                left: 0,
                                marginTop: 4,
                                zIndex: 20,
                                minWidth: 180,
                                maxHeight: 200,
                                overflowY: "auto",
                                background: "var(--bg-surface)",
                                border: "1px solid var(--border-subtle)",
                                borderRadius: 6,
                                boxShadow: "var(--shadow-md)",
                                padding: 4,
                              }}>
                                {(profilesList ?? []).map((p) => (
                                  <button
                                    key={p.id}
                                    onClick={() => linkProfileMut.mutate({ sourceId: s.id, profileId: p.id })}
                                    disabled={linkProfileMut.isPending}
                                    style={{
                                      display: "block",
                                      width: "100%",
                                      textAlign: "left",
                                      padding: "5px 8px",
                                      fontSize: 11,
                                      fontWeight: 500,
                                      border: "none",
                                      borderRadius: 4,
                                      background: "transparent",
                                      color: "var(--ink-primary)",
                                      cursor: "pointer",
                                    }}
                                    onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg-muted)"; }}
                                    onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                                  >
                                    <span>{p.name}</span>
                                    <span style={{ fontSize: 9, marginLeft: 6, color: "var(--ink-tertiary)" }}>
                                      {p.type === "competitor" ? "Competitor" : p.type === "thought_leader" ? "Leader" : "Creator"}
                                    </span>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                        {s.profileId && (
                          <span
                            style={{
                              fontSize: 9,
                              padding: "1px 5px",
                              borderRadius: 3,
                              background: "rgba(139,92,246,0.1)",
                              color: "#8B5CF6",
                              fontWeight: 500,
                              marginLeft: 4,
                              whiteSpace: "nowrap",
                            }}
                            title="Linked to a profile"
                          >
                            Linked
                          </span>
                        )}
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
      <ConfirmDialog
        open={!!deleteTarget}
        title="Remove source"
        message={`Remove "${deleteTarget?.label}" from your signal sources? New signals from this source will stop being fetched.`}
        confirmLabel="Remove"
        destructive
        onConfirm={() => {
          if (deleteTarget) deleteMut.mutate({ sourceId: deleteTarget.id });
          setDeleteTarget(null);
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  );
}
