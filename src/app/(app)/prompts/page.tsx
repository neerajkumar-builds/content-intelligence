"use client";

import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";

interface Variable {
  name: string;
  description?: string;
  required?: boolean;
}

export default function PromptStudioPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editSystem, setEditSystem] = useState("");
  const [editUser, setEditUser] = useState("");
  const [dirty, setDirty] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const utils = trpc.useUtils();
  const { data: promptsList, isLoading } = trpc.prompts.list.useQuery();

  const updateMut = trpc.prompts.update.useMutation({
    onSuccess: (data) => {
      toast.success(`Prompt saved — v${data.version}`);
      setDirty(false);
      void utils.prompts.list.invalidate();
      void utils.prompts.get.invalidate({ promptId: data.id });
    },
    onError: (err) => toast.error(err.message),
  });

  const selected = promptsList?.find((p) => p.id === selectedId) ?? promptsList?.[0] ?? null;

  useEffect(() => {
    if (selected && !dirty) {
      setSelectedId(selected.id);
      setEditSystem(selected.systemPrompt);
      const vars = (selected.variables ?? []) as Variable[];
      const userEntry = vars.find((v) => v.name === "user_prompt_template");
      setEditUser(userEntry?.description ?? "");
    }
  }, [selected?.id, selected?.version]);

  const variables = ((selected?.variables ?? []) as Variable[]).filter(
    (v) => v.name !== "user_prompt_template",
  );

  function handleSave() {
    if (!selected) return;
    updateMut.mutate({
      promptId: selected.id,
      systemPrompt: editSystem,
      userPromptTemplate: editUser,
    });
  }

  function handleReset() {
    if (!selected) return;
    setEditSystem(selected.systemPrompt);
    const vars = (selected.variables ?? []) as Variable[];
    const userEntry = vars.find((v) => v.name === "user_prompt_template");
    setEditUser(userEntry?.description ?? "");
    setDirty(false);
  }

  if (isLoading) {
    return (
      <div className="fade-in" style={{ height: "100%", overflow: "auto", padding: "20px 28px" }}>
        <div style={{ height: 24, width: 200, background: "var(--bg-muted)", borderRadius: 4, marginBottom: 16 }} />
        <div style={{ height: 300, background: "var(--bg-muted)", borderRadius: 8 }} />
      </div>
    );
  }

  if (!selected) {
    return (
      <div className="fade-in" style={{ height: "100%", overflow: "auto", padding: "20px 28px" }}>
        <h1 style={{ fontSize: 20, fontWeight: 600, margin: 0 }}>Prompt Studio</h1>
        <p style={{ fontSize: 13, color: "var(--ink-tertiary)", marginTop: 8 }}>No prompts found.</p>
      </div>
    );
  }

  return (
    <div className="fade-in" style={{ height: "100%", overflow: "auto" }}>
      {/* Header */}
      <div style={{ padding: "20px 28px 8px", borderBottom: "1px solid var(--border-subtle)", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 24, position: "sticky", top: 0, background: "var(--bg-canvas)", zIndex: 5 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 600, margin: 0, letterSpacing: "-0.012em" }}>Prompt Studio</h1>
          <p style={{ fontSize: 12.5, color: "var(--ink-secondary)", margin: "3px 0 12px", maxWidth: 720 }}>
            Glass-box prompt editor. Every template variable, every instruction — visible and editable.
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, paddingTop: 2 }}>
          {dirty && (
            <button className="btn ghost sm" onClick={handleReset}>Discard</button>
          )}
          <button
            className="btn primary sm"
            onClick={handleSave}
            disabled={!dirty || updateMut.isPending}
          >
            {updateMut.isPending ? "Saving..." : `Save (v${(selected.version ?? 1) + 1})`}
          </button>
        </div>
      </div>

      <div style={{ padding: "20px 28px 32px" }}>
        {/* Prompt selector (tabs for future multi-prompt) */}
        <div style={{ display: "flex", gap: 4, marginBottom: 16, borderBottom: "1px solid var(--border-subtle)" }}>
          {promptsList?.map((p) => (
            <button
              key={p.id}
              onClick={() => { setSelectedId(p.id); setDirty(false); }}
              className="btn ghost sm"
              style={{
                borderRadius: 0,
                borderBottom: selected.id === p.id ? "2px solid var(--accent)" : "2px solid transparent",
                color: selected.id === p.id ? "var(--accent)" : "var(--ink-secondary)",
                padding: "8px 12px",
                fontWeight: selected.id === p.id ? 600 : 500,
              }}
            >
              {p.name} · v{p.version}
            </button>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 20 }}>
          {/* Left — editors */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* System prompt */}
            <div className="card" style={{ padding: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <div className="eyebrow" style={{ fontSize: 9.5 }}>SYSTEM PROMPT</div>
                <span style={{ fontSize: 10, color: "var(--ink-tertiary)", fontFamily: "var(--font-mono)" }}>
                  {editSystem.length} chars
                </span>
              </div>
              <textarea
                value={editSystem}
                onChange={(e) => { setEditSystem(e.target.value); setDirty(true); }}
                rows={12}
                style={{
                  width: "100%",
                  fontSize: 13,
                  lineHeight: 1.6,
                  color: "var(--ink-primary)",
                  background: "var(--bg-canvas)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: 6,
                  padding: "12px 14px",
                  resize: "vertical",
                  fontFamily: "var(--font-mono)",
                }}
              />
            </div>

            {/* User prompt template */}
            <div className="card" style={{ padding: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <div className="eyebrow" style={{ fontSize: 9.5 }}>USER PROMPT TEMPLATE</div>
                <span style={{ fontSize: 10, color: "var(--ink-tertiary)", fontFamily: "var(--font-mono)" }}>
                  {editUser.length} chars
                </span>
              </div>
              <textarea
                value={editUser}
                onChange={(e) => { setEditUser(e.target.value); setDirty(true); }}
                rows={16}
                style={{
                  width: "100%",
                  fontSize: 13,
                  lineHeight: 1.6,
                  color: "var(--ink-primary)",
                  background: "var(--bg-canvas)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: 6,
                  padding: "12px 14px",
                  resize: "vertical",
                  fontFamily: "var(--font-mono)",
                }}
              />
            </div>

            {/* Preview toggle */}
            <button
              className="btn ghost sm"
              onClick={() => setShowPreview(!showPreview)}
              style={{ alignSelf: "flex-start" }}
            >
              {showPreview ? "Hide preview" : "Show interpolated preview"}
            </button>
            {showPreview && (
              <div className="card" style={{ padding: 16, background: "var(--bg-muted)" }}>
                <div className="eyebrow" style={{ fontSize: 9.5, marginBottom: 8 }}>PREVIEW (sample values)</div>
                <pre style={{ fontSize: 11.5, lineHeight: 1.6, color: "var(--ink-secondary)", fontFamily: "var(--font-mono)", whiteSpace: "pre-wrap", margin: 0 }}>
                  {editSystem
                    .replace(/\{brand_name\}/g, "FullFunnel.co")
                    .replace(/\{voice_traits\}/g, "expert, strategic, data-driven")
                    .replace(/\{wedge\}/g, "GTM + RevOps integration for B2B")
                    .replace(/\{icp\}/g, "B2B leaders facing stalled growth")
                    .replace(/\{anti_ai_rules\}/g, "No buzzwords, no fluff")}
                </pre>
                <hr style={{ border: "none", borderTop: "1px dashed var(--border-subtle)", margin: "12px 0" }} />
                <pre style={{ fontSize: 11.5, lineHeight: 1.6, color: "var(--ink-secondary)", fontFamily: "var(--font-mono)", whiteSpace: "pre-wrap", margin: 0 }}>
                  {editUser
                    .replace(/\{format\}/g, "LinkedIn long-form post")
                    .replace(/\{channel\}/g, "LinkedIn")
                    .replace(/\{format_guidelines\}/g, "1,500-3,000 chars, hook first line")
                    .replace(/\{idea_hook\}/g, "Why B2B companies fail at PLG")
                    .replace(/\{idea_angle\}/g, "Operational readiness > product readiness")
                    .replace(/\{source_content\}/g, "[source article excerpt...]")
                    .replace(/\{corpus_matches\}/g, "[3 similar brand posts...]")}
                </pre>
              </div>
            )}
          </div>

          {/* Right sidebar — variable reference */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div className="card" style={{ padding: 14 }}>
              <div className="eyebrow" style={{ fontSize: 9.5, marginBottom: 10 }}>TEMPLATE VARIABLES</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {variables.map((v) => (
                  <div key={v.name} style={{ padding: "6px 0", borderBottom: "1px dashed var(--border-subtle)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <code style={{ fontSize: 11.5, color: "var(--accent)", fontFamily: "var(--font-mono)" }}>
                        {`{${v.name}}`}
                      </code>
                      {v.required && (
                        <span style={{ fontSize: 9, fontWeight: 600, color: "var(--warn, #f59e0b)", textTransform: "uppercase" }}>req</span>
                      )}
                    </div>
                    {v.description && (
                      <div style={{ fontSize: 11, color: "var(--ink-tertiary)", marginTop: 2 }}>{v.description}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="card" style={{ padding: 14 }}>
              <div className="eyebrow" style={{ fontSize: 9.5, marginBottom: 8 }}>PROMPT INFO</div>
              <div style={{ fontSize: 11.5, lineHeight: 1.7, color: "var(--ink-secondary)" }}>
                <div>Slug: <code style={{ fontFamily: "var(--font-mono)", fontSize: 10.5 }}>{selected.slug}</code></div>
                <div>Version: v{selected.version}</div>
                <div>Status: {selected.isActive ? "Active" : "Inactive"}</div>
                <div>Updated: {new Date(selected.updatedAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}</div>
              </div>
            </div>

            <div className="card" style={{ padding: 14, background: "var(--bg-muted)" }}>
              <div className="eyebrow" style={{ fontSize: 9.5, marginBottom: 8 }}>HOW IT WORKS</div>
              <div style={{ fontSize: 11, lineHeight: 1.6, color: "var(--ink-tertiary)" }}>
                Variables in {"{braces}"} are replaced at generation time with real data from your brand brief, idea, and corpus. Edit the templates to change how AI drafts are generated.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
