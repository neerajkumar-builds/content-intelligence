"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";
import { BriefCards } from "@/components/brand/brief-cards";

type Tab = "current" | "history" | "diff";

export default function BrandBriefPage() {
  const [tab, setTab] = useState<Tab>("current");
  const [isEditing, setIsEditing] = useState(false);
  const [viewingVersion, setViewingVersion] = useState<number | null>(null);

  // --- Edit form state ---
  const [editWedge, setEditWedge] = useState("");
  const [editIcp, setEditIcp] = useState("");
  const [editVoiceTraits, setEditVoiceTraits] = useState("");
  const [editAntiPositioning, setEditAntiPositioning] = useState("");
  const [editChangelog, setEditChangelog] = useState("");

  const utils = trpc.useUtils();

  // --- Queries ---
  const { data: brands, isLoading: brandsLoading } = trpc.brand.list.useQuery();
  const brandId = brands?.[0]?.id;

  const { data: brief, isLoading: briefLoading } = trpc.brief.get.useQuery(
    { brandId: brandId! },
    { enabled: !!brandId },
  );

  const { data: versions, isLoading: versionsLoading } = trpc.brief.list.useQuery(
    { brandId: brandId! },
    { enabled: !!brandId },
  );

  const hasTwoVersions = (versions?.length ?? 0) >= 2;
  const diffVersionA = hasTwoVersions ? versions![1]!.version : undefined;
  const diffVersionB = hasTwoVersions ? versions![0]!.version : undefined;

  const { data: diffData } = trpc.brief.diff.useQuery(
    { brandId: brandId!, versionA: diffVersionA!, versionB: diffVersionB! },
    { enabled: !!brandId && hasTwoVersions && tab === "diff" },
  );

  // Fetch a specific version when viewing history detail
  const { data: versionDetail, isLoading: versionDetailLoading } = trpc.brief.get.useQuery(
    { brandId: brandId!, version: viewingVersion! },
    { enabled: !!brandId && viewingVersion !== null },
  );

  // --- Mutations ---
  const createBrief = trpc.brief.create.useMutation({
    onSuccess: () => {
      toast.success("Brief updated — new version saved");
      void utils.brief.get.invalidate();
      void utils.brief.list.invalidate();
      void utils.brief.diff.invalidate();
      setIsEditing(false);
      setEditChangelog("");
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  // --- Handlers ---
  function startEditing() {
    if (!brief) return;
    setEditWedge(brief.wedge);
    setEditIcp(brief.icp);
    setEditVoiceTraits(brief.voiceTraits);
    setEditAntiPositioning(brief.antiPositioning);
    setEditChangelog("");
    setIsEditing(true);
  }

  function cancelEditing() {
    setIsEditing(false);
  }

  function saveBrief() {
    if (!brandId) return;
    createBrief.mutate({
      brandId,
      wedge: editWedge,
      icp: editIcp,
      voiceTraits: editVoiceTraits,
      antiPositioning: editAntiPositioning,
      changelog: editChangelog || undefined,
    });
  }

  // --- Loading state ---
  if (brandsLoading) {
    return (
      <div className="fade-in" style={{ height: "100%", overflow: "auto" }}>
        <div style={{ padding: "20px 28px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="card" style={{ padding: 16, height: 100 }}>
                <div style={{ width: "30%", height: 10, background: "var(--bg-muted)", borderRadius: 4, marginBottom: 12 }} />
                <div style={{ width: "80%", height: 10, background: "var(--bg-muted)", borderRadius: 4, marginBottom: 8 }} />
                <div style={{ width: "60%", height: 10, background: "var(--bg-muted)", borderRadius: 4 }} />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // --- No brands state ---
  if (!brandId) {
    return (
      <div className="fade-in" style={{ height: "100%", overflow: "auto" }}>
        <div style={{ padding: "20px 28px 8px", borderBottom: "1px solid var(--border-subtle)" }}>
          <h1 style={{ fontSize: 20, fontWeight: 600, margin: 0, letterSpacing: "-0.012em" }}>Brand brief</h1>
        </div>
        <div style={{ padding: "60px 28px", textAlign: "center" }}>
          <p style={{ fontSize: 14, color: "var(--ink-secondary)" }}>Set up your brand via onboarding</p>
        </div>
      </div>
    );
  }

  // --- Brief data for display ---
  const activeBrief = viewingVersion !== null ? versionDetail : brief;
  const isViewingOldVersion = viewingVersion !== null && viewingVersion !== brief?.version;

  function formatDate(d: Date | string | null | undefined) {
    if (!d) return "";
    const date = typeof d === "string" ? new Date(d) : d;
    return date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
  }

  function formatRelative(d: Date | string | null | undefined) {
    if (!d) return "";
    const date = typeof d === "string" ? new Date(d) : d;
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (days === 0) return "today";
    if (days === 1) return "yesterday";
    return `${days} days ago`;
  }

  const fields = activeBrief
    ? [
        { label: "WEDGE", body: activeBrief.wedge, meta: `Last edited · ${formatRelative(activeBrief.createdAt)}` },
        { label: "ICP", body: activeBrief.icp, meta: "Embedded in vector store · 3,072 dims" },
        { label: "VOICE TRAITS", body: activeBrief.voiceTraits, meta: `${activeBrief.voiceTraits.split("·").length} traits · cosine centroid recomputed nightly` },
        { label: "ANTI-POSITIONING", body: activeBrief.antiPositioning, meta: "Used as negative prompt context" },
      ]
    : [];

  // --- Tab labels ---
  const tabs: Array<{ key: Tab; label: string }> = [
    { key: "current", label: `Current${brief ? ` · v${brief.version}` : ""}` },
    { key: "history", label: "Version history" },
    { key: "diff", label: brief && brief.version > 1 ? `Diff vs v${brief.version - 1}` : "Diff" },
  ];

  // --- Diff fields ---
  const diffFields = diffData
    ? (["wedge", "icp", "voiceTraits", "antiPositioning"] as const).map((key) => {
        const labelMap = { wedge: "WEDGE", icp: "ICP", voiceTraits: "VOICE TRAITS", antiPositioning: "ANTI-POSITIONING" } as const;
        return {
          label: labelMap[key],
          oldText: diffData.a[key],
          newText: diffData.b[key],
          changed: diffData.a[key] !== diffData.b[key],
        };
      })
    : [];

  return (
    <div className="fade-in" style={{ height: "100%", overflow: "auto" }}>
      {/* Header */}
      <div style={{ padding: "20px 28px 8px", borderBottom: "1px solid var(--border-subtle)", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 24, position: "sticky", top: 0, background: "var(--bg-canvas)", zIndex: 5 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 600, margin: 0, letterSpacing: "-0.012em" }}>Brand brief</h1>
          <p style={{ fontSize: 12.5, color: "var(--ink-secondary)", margin: "3px 0 12px", maxWidth: 720 }}>
            The single source of truth that feeds every prompt. Versioned, diff-able, embedded into voice scoring.
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, paddingTop: 2 }}>
          {isEditing ? (
            <>
              <button className="btn ghost sm" onClick={cancelEditing}>Cancel</button>
              <button className="btn primary sm" onClick={saveBrief} disabled={createBrief.isPending}>
                {createBrief.isPending ? "Saving..." : "Save brief"}
              </button>
            </>
          ) : (
            <>
              <button
                className="btn ghost sm"
                onClick={() => { setTab("history"); setViewingVersion(null); }}
              >
                View history
              </button>
              <button
                className="btn primary sm"
                onClick={startEditing}
                disabled={!brief}
              >
                Edit brief
              </button>
            </>
          )}
        </div>
      </div>

      {/* Version banner when viewing old version */}
      {isViewingOldVersion && !isEditing && (
        <div style={{ padding: "8px 28px", background: "var(--bg-muted)", borderBottom: "1px solid var(--border-subtle)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: 12, color: "var(--ink-secondary)" }}>
            Viewing v{viewingVersion} (read-only) — current is v{brief?.version}
          </span>
          <button
            className="btn ghost sm"
            style={{ fontSize: 11 }}
            onClick={() => { setViewingVersion(null); setTab("current"); }}
          >
            Back to current
          </button>
        </div>
      )}

      <div style={{ padding: "20px 28px 32px" }}>
        {/* Tabs */}
        {!isEditing && (
          <div style={{ display: "flex", gap: 4, marginBottom: 16, borderBottom: "1px solid var(--border-subtle)" }}>
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => { setTab(t.key); if (t.key === "current") setViewingVersion(null); }}
                className="btn ghost sm"
                style={{
                  borderRadius: 0,
                  borderBottom: tab === t.key ? "2px solid var(--accent)" : "2px solid transparent",
                  color: tab === t.key ? "var(--accent)" : "var(--ink-secondary)",
                  padding: "8px 12px",
                  fontWeight: tab === t.key ? 600 : 500,
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 20 }}>
          {/* Left column */}
          <div>
            {/* Edit mode */}
            {isEditing && (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {([
                  { key: "wedge" as const, label: "WEDGE", value: editWedge, set: setEditWedge },
                  { key: "icp" as const, label: "ICP", value: editIcp, set: setEditIcp },
                  { key: "voiceTraits" as const, label: "VOICE TRAITS", value: editVoiceTraits, set: setEditVoiceTraits },
                  { key: "antiPositioning" as const, label: "ANTI-POSITIONING", value: editAntiPositioning, set: setEditAntiPositioning },
                ]).map((f) => (
                  <div key={f.key} className="card" style={{ padding: 16 }}>
                    <div className="eyebrow" style={{ fontSize: 9.5, marginBottom: 6 }}>{f.label}</div>
                    <textarea
                      value={f.value}
                      onChange={(e) => f.set(e.target.value)}
                      rows={4}
                      style={{
                        width: "100%",
                        fontSize: 13.5,
                        lineHeight: 1.55,
                        color: "var(--ink-primary)",
                        background: "var(--bg-canvas)",
                        border: "1px solid var(--border-subtle)",
                        borderRadius: 6,
                        padding: "10px 12px",
                        resize: "vertical",
                        fontFamily: "inherit",
                      }}
                    />
                  </div>
                ))}
                <div className="card" style={{ padding: 16 }}>
                  <div className="eyebrow" style={{ fontSize: 9.5, marginBottom: 6 }}>CHANGELOG (optional)</div>
                  <input
                    type="text"
                    value={editChangelog}
                    onChange={(e) => setEditChangelog(e.target.value)}
                    placeholder="What changed and why?"
                    style={{
                      width: "100%",
                      fontSize: 13,
                      color: "var(--ink-primary)",
                      background: "var(--bg-canvas)",
                      border: "1px solid var(--border-subtle)",
                      borderRadius: 6,
                      padding: "8px 12px",
                      fontFamily: "inherit",
                    }}
                  />
                </div>
              </div>
            )}

            {/* Current tab — view mode */}
            {!isEditing && tab === "current" && (
              <>
                {briefLoading || versionDetailLoading ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="card" style={{ padding: 16, height: 100 }}>
                        <div style={{ width: "30%", height: 10, background: "var(--bg-muted)", borderRadius: 4, marginBottom: 12 }} />
                        <div style={{ width: "80%", height: 10, background: "var(--bg-muted)", borderRadius: 4, marginBottom: 8 }} />
                        <div style={{ width: "60%", height: 10, background: "var(--bg-muted)", borderRadius: 4 }} />
                      </div>
                    ))}
                  </div>
                ) : !activeBrief ? (
                  <div className="card" style={{ padding: 24, textAlign: "center" }}>
                    <p style={{ fontSize: 13, color: "var(--ink-secondary)", margin: "0 0 12px" }}>No brief created yet.</p>
                    <button className="btn primary sm" onClick={startEditing}>Create first brief</button>
                  </div>
                ) : (
                  <BriefCards fields={fields} />
                )}
              </>
            )}

            {/* History tab */}
            {!isEditing && tab === "history" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {versionsLoading ? (
                  <div className="card" style={{ padding: 16 }}>
                    <div style={{ width: "60%", height: 10, background: "var(--bg-muted)", borderRadius: 4 }} />
                  </div>
                ) : !versions?.length ? (
                  <div className="card" style={{ padding: 16, textAlign: "center" }}>
                    <p style={{ fontSize: 13, color: "var(--ink-secondary)" }}>No versions yet</p>
                  </div>
                ) : (
                  versions.map((v) => (
                    <button
                      key={v.id}
                      onClick={() => { setViewingVersion(v.version); setTab("current"); }}
                      className="card"
                      style={{
                        padding: 14,
                        textAlign: "left",
                        cursor: "pointer",
                        border: viewingVersion === v.version ? "1px solid var(--accent)" : undefined,
                        width: "100%",
                        background: "transparent",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                        <span style={{ fontSize: 13, fontWeight: 600 }}>v{v.version}</span>
                        <span style={{ fontSize: 11, color: "var(--ink-tertiary)" }}>{formatDate(v.createdAt)}</span>
                      </div>
                      {v.changelog && (
                        <div style={{ fontSize: 12, color: "var(--ink-secondary)", marginTop: 2 }}>{v.changelog}</div>
                      )}
                      <div style={{ fontSize: 10.5, color: "var(--ink-tertiary)", marginTop: 4 }}>
                        Editor: {v.editorClerkId}
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}

            {/* Diff tab */}
            {!isEditing && tab === "diff" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {!hasTwoVersions ? (
                  <div className="card" style={{ padding: 16, textAlign: "center" }}>
                    <p style={{ fontSize: 13, color: "var(--ink-secondary)" }}>Need at least 2 versions to diff</p>
                  </div>
                ) : !diffData ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="card" style={{ padding: 16, height: 80 }}>
                        <div style={{ width: "30%", height: 10, background: "var(--bg-muted)", borderRadius: 4, marginBottom: 12 }} />
                        <div style={{ width: "90%", height: 10, background: "var(--bg-muted)", borderRadius: 4 }} />
                      </div>
                    ))}
                  </div>
                ) : (
                  <>
                    <div style={{ fontSize: 12, color: "var(--ink-tertiary)", marginBottom: 4 }}>
                      Comparing v{diffData.a.version} → v{diffData.b.version}
                    </div>
                    {diffFields.map((df) => (
                      <div key={df.label} className="card" style={{ padding: 16 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                          <div className="eyebrow" style={{ fontSize: 9.5 }}>{df.label}</div>
                          {df.changed ? (
                            <span className="pill warn" style={{ fontSize: 9 }}>changed</span>
                          ) : (
                            <span className="pill" style={{ fontSize: 9, background: "var(--bg-muted)", color: "var(--ink-tertiary)" }}>unchanged</span>
                          )}
                        </div>
                        {df.changed ? (
                          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                            <div style={{ fontSize: 13, lineHeight: 1.55, color: "var(--ink-tertiary)", textDecoration: "line-through", padding: "8px 10px", background: "var(--bg-muted)", borderRadius: 4 }}>
                              {df.oldText}
                            </div>
                            <div style={{ fontSize: 13, lineHeight: 1.55, color: "var(--ink-primary)", padding: "8px 10px", background: "color-mix(in srgb, var(--good) 8%, transparent)", borderRadius: 4, border: "1px solid color-mix(in srgb, var(--good) 20%, transparent)" }}>
                              {df.newText}
                            </div>
                          </div>
                        ) : (
                          <div style={{ fontSize: 13, lineHeight: 1.55, color: "var(--ink-secondary)" }}>
                            {df.newText}
                          </div>
                        )}
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}
          </div>

          {/* Right sidebar */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div className="card" style={{ padding: 14 }}>
              <div className="eyebrow" style={{ fontSize: 9.5, marginBottom: 8 }}>VOICE FIDELITY</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 6 }}>
                <span className="tabular" style={{ fontSize: 28, fontWeight: 600, fontFamily: "Montserrat" }}>0.91</span>
                <span style={{ fontSize: 11, color: "var(--good)" }}>&#8593; 0.04 vs last brief</span>
              </div>
              <div style={{ fontSize: 10.5, color: "var(--ink-tertiary)", marginTop: 8 }}>Cosine vs 247-post corpus · last 7 drafts</div>
            </div>

            <div className="card" style={{ padding: 14 }}>
              <div className="eyebrow" style={{ fontSize: 9.5, marginBottom: 8 }}>FED INTO</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12 }}>
                {[["Hook generator", "POST /v1/drafts/hook"], ["Body draft", "POST /v1/drafts/body"], ["Voice scorer", "POST /v1/drafts/score"], ["Anti-AI rules", "POST /v1/drafts/audit"], ["Idea ranker", "POST /v1/ideas/rank"]].map(([name, endpoint]) => (
                  <div key={name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "5px 0", borderBottom: "1px dashed var(--border-subtle)" }}>
                    <div>
                      <div style={{ fontWeight: 500 }}>{name}</div>
                      <div className="mono" style={{ fontSize: 9.5, color: "var(--ink-tertiary)" }}>{endpoint}</div>
                    </div>
                    <span className="pill good">active</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Versioning sidebar — dynamic */}
            <div className="card" style={{ padding: 14, background: "var(--bg-muted)" }}>
              <div className="eyebrow" style={{ fontSize: 9.5, marginBottom: 8 }}>VERSIONING</div>
              <div style={{ fontSize: 11.5, lineHeight: 1.7, color: "var(--ink-secondary)" }}>
                {versionsLoading ? (
                  <div style={{ width: "80%", height: 10, background: "var(--border-subtle)", borderRadius: 4 }} />
                ) : !versions?.length ? (
                  <div>No versions yet</div>
                ) : (
                  versions.slice(0, 5).map((v) => (
                    <div key={v.id}>
                      v{v.version} · {formatDate(v.createdAt)} · {v.editorClerkId}{v.changelog ? ` · ${v.changelog}` : ""}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
