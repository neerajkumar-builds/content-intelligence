"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";

type SourceType = "rss" | "reddit" | "linkedin" | "twitter" | "apify" | "competitor" | "thought_leader";

interface SourceTypeOption {
  value: SourceType;
  label: string;
  description: string;
  placeholder: string;
  urlLabel: string;
  available: boolean;
  hint?: string;
}

const SOURCE_TYPES: SourceTypeOption[] = [
  {
    value: "rss",
    label: "RSS Feed",
    description: "Blog, newsletter, or news RSS/Atom feed",
    placeholder: "https://example.com/feed.xml",
    urlLabel: "Feed URL",
    available: true,
    hint: "n8n fetches this every 30 min during business hours",
  },
  {
    value: "reddit",
    label: "Reddit",
    description: "Subreddit to monitor for discussions",
    placeholder: "https://reddit.com/r/saas",
    urlLabel: "Subreddit URL",
    available: false,
    hint: "Coming soon — n8n workflow not yet deployed",
  },
  {
    value: "linkedin",
    label: "LinkedIn",
    description: "Company page or thought leader to track",
    placeholder: "https://linkedin.com/company/example",
    urlLabel: "LinkedIn URL",
    available: false,
    hint: "Coming soon — requires Apify scraper workflow",
  },
  {
    value: "twitter",
    label: "X / Twitter",
    description: "Account or hashtag to monitor",
    placeholder: "https://x.com/example",
    urlLabel: "X Profile or Hashtag URL",
    available: false,
    hint: "Coming soon — requires Apify scraper workflow",
  },
  {
    value: "competitor",
    label: "Competitor",
    description: "Competitor website or blog to track",
    placeholder: "https://competitor.com/blog",
    urlLabel: "Website URL",
    available: false,
    hint: "Coming soon — requires Firecrawl workflow",
  },
  {
    value: "thought_leader",
    label: "Thought Leader",
    description: "Industry expert to follow across platforms",
    placeholder: "https://linkedin.com/in/expert",
    urlLabel: "Profile URL",
    available: false,
    hint: "Coming soon — multi-platform tracking",
  },
];

interface Props {
  open: boolean;
  onClose: () => void;
}

export function AddSourceDialog({ open, onClose }: Props) {
  const [sourceType, setSourceType] = useState<SourceType>("rss");
  const [url, setUrl] = useState("");
  const [label, setLabel] = useState("");

  const utils = trpc.useUtils();

  const addMut = trpc.signals.addSource.useMutation({
    onSuccess: () => {
      toast.success("Source added — n8n will fetch on next run");
      void utils.signals.listSources.invalidate();
      setUrl("");
      setLabel("");
      setSourceType("rss");
      onClose();
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const selected = SOURCE_TYPES.find((s) => s.value === sourceType)!;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim() || !label.trim()) return;

    try {
      new URL(url.trim());
    } catch {
      toast.error("Enter a valid URL");
      return;
    }

    addMut.mutate({
      source: sourceType,
      label: label.trim(),
      configUrl: url.trim(),
    });
  }

  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.5)",
        backdropFilter: "blur(4px)",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          background: "var(--bg-surface)",
          borderRadius: 12,
          border: "1px solid var(--border-subtle)",
          width: 480,
          maxHeight: "80vh",
          overflow: "auto",
          boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)",
        }}
      >
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border-subtle)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>Add Signal Source</h3>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: "var(--ink-tertiary)", lineHeight: 1 }}
          >
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: 20 }}>
          {/* Source type picker */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 11, fontWeight: 600, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--ink-secondary)" }}>
              Source Type
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
              {SOURCE_TYPES.map((st) => (
                <button
                  key={st.value}
                  type="button"
                  onClick={() => {
                    if (st.available) setSourceType(st.value);
                  }}
                  style={{
                    padding: "8px 10px",
                    borderRadius: 6,
                    border: `1.5px solid ${sourceType === st.value ? "var(--accent)" : "var(--border-subtle)"}`,
                    background: sourceType === st.value ? "rgba(99,102,241,0.08)" : "transparent",
                    cursor: st.available ? "pointer" : "not-allowed",
                    opacity: st.available ? 1 : 0.45,
                    textAlign: "left",
                  }}
                >
                  <div style={{ fontSize: 12, fontWeight: 600 }}>{st.label}</div>
                  <div style={{ fontSize: 10, color: "var(--ink-tertiary)", marginTop: 1 }}>
                    {st.available ? st.description : "Coming soon"}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* URL field */}
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: "block", fontSize: 11, fontWeight: 600, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--ink-secondary)" }}>
              {selected.urlLabel}
            </label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder={selected.placeholder}
              required
              style={{
                width: "100%",
                padding: "8px 10px",
                borderRadius: 6,
                border: "1px solid var(--border-subtle)",
                background: "var(--bg-canvas)",
                color: "var(--ink-primary)",
                fontSize: 13,
                fontFamily: "var(--font-mono)",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>

          {/* Label field */}
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: "block", fontSize: 11, fontWeight: 600, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--ink-secondary)" }}>
              Display Name
            </label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. SaaStr Blog, r/startups, Competitor X"
              required
              maxLength={200}
              style={{
                width: "100%",
                padding: "8px 10px",
                borderRadius: 6,
                border: "1px solid var(--border-subtle)",
                background: "var(--bg-canvas)",
                color: "var(--ink-primary)",
                fontSize: 13,
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>

          {/* Hint */}
          {selected.hint && (
            <div style={{ fontSize: 11, color: "var(--ink-tertiary)", marginBottom: 16, padding: "6px 8px", borderRadius: 4, background: "var(--bg-muted)" }}>
              {selected.hint}
            </div>
          )}

          {/* Actions */}
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: "8px 14px",
                borderRadius: 6,
                border: "1px solid var(--border-subtle)",
                background: "transparent",
                color: "var(--ink-secondary)",
                fontSize: 12,
                cursor: "pointer",
                fontWeight: 500,
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={addMut.isPending || !selected.available}
              style={{
                padding: "8px 16px",
                borderRadius: 6,
                border: "none",
                background: "var(--accent)",
                color: "white",
                fontSize: 12,
                cursor: addMut.isPending ? "wait" : "pointer",
                fontWeight: 600,
                opacity: addMut.isPending ? 0.7 : 1,
              }}
            >
              {addMut.isPending ? "Adding..." : "Add Source"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
