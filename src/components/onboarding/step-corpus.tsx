"use client";

import { useState } from "react";
import { VOICE_TEMPLATES } from "./voice-templates";

export interface CorpusItem {
  content: string;
  sourceUrl?: string;
}

export interface CorpusFullState {
  tab: "paste" | "guided" | "template";
  pasteText: string;
  guidedAnswers: string[];
  selectedTemplate: string | null;
  templatePosts: string[];
}

const PROMPTS = [
  "Paste your single best-performing LinkedIn/social post",
  "Explain your product/service like you'd tell a friend at dinner",
  "What's a contrarian opinion you hold about your industry?",
  "Write the opening paragraph of your ideal newsletter",
  "List phrases you ALWAYS use, and phrases you NEVER use",
];

export function StepCorpus({
  voiceStyle,
  onSave,
  onSkip,
  initialState,
}: {
  voiceStyle: string;
  onSave: (items: CorpusItem[], fullState: CorpusFullState) => void;
  onSkip: () => void;
  initialItems?: CorpusItem[];
  initialState?: CorpusFullState | null;
}) {
  const [tab, setTab] = useState<"paste" | "guided" | "template">(initialState?.tab ?? "paste");
  const [pasteText, setPasteText] = useState(initialState?.pasteText ?? "");
  const [guidedAnswers, setGuidedAnswers] = useState<string[]>(initialState?.guidedAnswers ?? ["", "", "", "", ""]);
  const [templatePosts, setTemplatePosts] = useState<string[]>(initialState?.templatePosts ?? []);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(initialState?.selectedTemplate ?? null);

  const pastedPosts = pasteText.split(/\n\s*\n/).filter((p) => p.trim().length >= 10);
  const guidedItems = guidedAnswers.filter((a) => a.trim().length >= 10);
  const templateItems = templatePosts.filter((p) => p.trim().length >= 10);

  const totalItems =
    tab === "paste" ? pastedPosts.length : tab === "guided" ? guidedItems.length : templateItems.length;

  const progressColor = totalItems < 3 ? "var(--danger)" : totalItems < 5 ? "var(--warning)" : "var(--good)";

  function collectItems(): CorpusItem[] {
    if (tab === "paste") return pastedPosts.map((p) => ({ content: p.trim() }));
    if (tab === "guided") return guidedItems.map((a) => ({ content: a.trim() }));
    return templateItems.map((p) => ({ content: p.trim() }));
  }

  function selectTemplate(templateId: string) {
    setSelectedTemplate(templateId);
    const template = VOICE_TEMPLATES.find((t) => t.id === templateId);
    if (template) setTemplatePosts([...template.samplePosts]);
  }

  const textareaStyle = {
    width: "100%",
    padding: 10,
    fontSize: 13,
    border: "1px solid var(--border-subtle)",
    borderRadius: 6,
    background: "var(--bg-surface)",
    resize: "vertical" as const,
    fontFamily: "inherit",
    lineHeight: 1.5,
    color: "inherit",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", background: "var(--bg-muted)", borderRadius: 6 }}>
        <div style={{ fontSize: 12, fontWeight: 600 }}>{totalItems} of 5 recommended</div>
        <div style={{ flex: 1, height: 4, borderRadius: 2, background: "var(--bg-canvas)" }}>
          <div
            style={{
              width: `${Math.min(100, (totalItems / 5) * 100)}%`,
              height: "100%",
              borderRadius: 2,
              background: progressColor,
              transition: "width 0.3s",
            }}
          />
        </div>
      </div>

      <div style={{ fontSize: 12, color: "var(--ink-secondary)", fontStyle: "italic" }}>
        Choose one method below. You only need to use one tab — pick whichever is easiest for you.
      </div>

      <div style={{ display: "flex", gap: 4, borderBottom: "1px solid var(--border-subtle)" }}>
        {(["paste", "guided", "template"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="btn ghost sm"
            style={{
              borderRadius: 0,
              borderBottom: tab === t ? "2px solid var(--accent)" : "2px solid transparent",
              color: tab === t ? "var(--accent)" : "var(--ink-secondary)",
              padding: "8px 12px",
              fontWeight: tab === t ? 600 : 500,
            }}
          >
            {t === "paste" ? "Paste posts" : t === "guided" ? "Guided prompts" : "Templates"}
          </button>
        ))}
      </div>

      {tab === "paste" && (
        <div>
          <textarea
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            placeholder="Paste 10-20 of your best posts, separated by blank lines..."
            style={{ ...textareaStyle, minHeight: 200 }}
          />
          <div style={{ fontSize: 11, color: "var(--ink-tertiary)", marginTop: 4 }}>{pastedPosts.length} posts detected</div>
        </div>
      )}

      {tab === "guided" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {PROMPTS.map((prompt, i) => (
            <div key={i}>
              <label style={{ fontSize: 12, fontWeight: 500, display: "block", marginBottom: 4, color: "var(--ink-secondary)" }}>
                {i + 1}. {prompt}
              </label>
              <textarea
                value={guidedAnswers[i]}
                onChange={(e) => {
                  const copy = [...guidedAnswers];
                  copy[i] = e.target.value;
                  setGuidedAnswers(copy);
                }}
                placeholder="Your answer..."
                style={{ ...textareaStyle, minHeight: 80 }}
              />
            </div>
          ))}
        </div>
      )}

      {tab === "template" && (
        <div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10, marginBottom: 16 }}>
            {VOICE_TEMPLATES.map((t) => (
              <button
                key={t.id}
                onClick={() => selectTemplate(t.id)}
                style={{
                  textAlign: "left",
                  padding: 14,
                  border: `1.5px solid ${selectedTemplate === t.id ? "var(--accent)" : "var(--border-subtle)"}`,
                  borderRadius: 6,
                  background: selectedTemplate === t.id ? "var(--accent-soft)" : "var(--bg-surface)",
                  color: "inherit",
                  cursor: "pointer",
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>
                  {t.name}{" "}
                  {t.id === voiceStyle && (
                    <span className="pill accent" style={{ fontSize: 8.5 }}>your style</span>
                  )}
                </div>
                <div style={{ fontSize: 11, color: "var(--ink-secondary)" }}>{t.description}</div>
              </button>
            ))}
          </div>
          {templatePosts.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ fontSize: 12, fontWeight: 600 }}>Edit these sample posts to match your voice:</div>
              {templatePosts.map((post, i) => (
                <textarea
                  key={i}
                  value={post}
                  onChange={(e) => {
                    const copy = [...templatePosts];
                    copy[i] = e.target.value;
                    setTemplatePosts(copy);
                  }}
                  style={{ ...textareaStyle, minHeight: 60, fontSize: 12 }}
                />
              ))}
            </div>
          )}
        </div>
      )}

      <div className="card" style={{ padding: 12, background: "var(--bg-muted)", borderStyle: "dashed", opacity: 0.6 }}>
        <div style={{ fontSize: 12, fontWeight: 500 }}>
          Upload brand guidelines, case studies, or reference docs{" "}
          <span className="pill neutral" style={{ fontSize: 8.5, marginLeft: 6 }}>Coming soon</span>
        </div>
        <div style={{ fontSize: 11, color: "var(--ink-tertiary)", marginTop: 2 }}>File uploads available in the next update.</div>
      </div>

      <div className="card" style={{ padding: 12, background: "var(--bg-muted)", borderStyle: "dashed", fontSize: 11.5, color: "var(--ink-secondary)" }}>
        <strong style={{ color: "var(--ink-primary)" }}>Don't have a corpus yet?</strong> Skip and add later. Voice fidelity scoring stays disabled until you provide one. We'll re-prompt after you ship 5 posts.
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 8 }}>
        <button className="btn ghost sm" onClick={onSkip}>Skip for now</button>
        <button className="btn primary sm" disabled={totalItems === 0} onClick={() => onSave(collectItems(), { tab, pasteText, guidedAnswers, selectedTemplate, templatePosts })}>
          Save {totalItems} item{totalItems !== 1 ? "s" : ""} &rarr; Brand brief
        </button>
      </div>
    </div>
  );
}
