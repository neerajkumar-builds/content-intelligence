"use client";

import { useState, useRef, useEffect } from "react";
import { ModelSelect, MODELS } from "@/components/ai/model-select";

const CHANNELS = [
  { id: "linkedin", label: "LinkedIn", icon: "in" },
  { id: "twitter", label: "X / Twitter", icon: "𝕏" },
  { id: "newsletter", label: "Newsletter", icon: "✉" },
  { id: "instagram", label: "Instagram", icon: "◻" },
  { id: "threads", label: "Threads", icon: "@" },
  { id: "blog", label: "Blog", icon: "¶" },
] as const;

const CHANNEL_FORMATS: Record<string, Array<{ id: string; label: string }>> = {
  linkedin: [
    { id: "linkedin-long", label: "Long post" },
    { id: "linkedin-short", label: "Short post" },
  ],
  twitter: [
    { id: "twitter-tweet", label: "Tweet" },
    { id: "twitter-thread", label: "Thread" },
  ],
  newsletter: [
    { id: "newsletter", label: "Article" },
    { id: "newsletter-digest", label: "Digest" },
  ],
  instagram: [
    { id: "instagram-caption", label: "Caption" },
    { id: "carousel-script", label: "Carousel script" },
  ],
  threads: [
    { id: "threads-post", label: "Post" },
  ],
  blog: [
    { id: "blog-article", label: "Article" },
  ],
};

interface GeneratePopoverProps {
  ideaFormats: string[];
  onGenerate: (opts: { channel: string; format: string; modelId: string }) => void;
  isPending: boolean;
  anchor: "left" | "right";
  onClose: () => void;
}

export function GeneratePopover({
  ideaFormats,
  onGenerate,
  isPending,
  anchor,
  onClose,
}: GeneratePopoverProps) {
  const ref = useRef<HTMLDivElement>(null);

  const [channel, setChannel] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("cia.lastChannel") ?? "linkedin";
    }
    return "linkedin";
  });

  const [modelId, setModelId] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("cia.preferredModel");
      if (saved && MODELS.find((m) => m.id === saved)) return saved;
    }
    return "gemini-2.0-flash";
  });

  const formats = CHANNEL_FORMATS[channel] ?? CHANNEL_FORMATS.linkedin;
  const defaultFormat = ideaFormats.find((f) =>
    formats.some((cf) => cf.id === f),
  ) ?? formats[0].id;
  const [format, setFormat] = useState(defaultFormat);

  useEffect(() => {
    const newFormats = CHANNEL_FORMATS[channel] ?? CHANNEL_FORMATS.linkedin;
    const match = ideaFormats.find((f) => newFormats.some((cf) => cf.id === f));
    setFormat(match ?? newFormats[0].id);
  }, [channel, ideaFormats]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onClose]);

  function handleGenerate() {
    if (typeof window !== "undefined") {
      localStorage.setItem("cia.lastChannel", channel);
      localStorage.setItem("cia.preferredModel", modelId);
    }
    onGenerate({ channel, format, modelId });
  }

  return (
    <div
      ref={ref}
      style={{
        position: "absolute",
        bottom: "calc(100% + 6px)",
        [anchor === "right" ? "right" : "left"]: 0,
        zIndex: 100,
        width: 300,
        borderRadius: 10,
        border: "1px solid var(--border-subtle)",
        background: "var(--bg-surface)",
        boxShadow: "0 8px 30px rgba(0,0,0,0.18)",
        padding: 16,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 14, color: "var(--ink-primary)" }}>
        Generate Draft
      </div>

      {/* Channel selector */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--ink-tertiary)", marginBottom: 6 }}>
          Channel
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
          {CHANNELS.map((ch) => (
            <button
              key={ch.id}
              onClick={() => setChannel(ch.id)}
              style={{
                padding: "4px 10px",
                fontSize: 11,
                fontWeight: channel === ch.id ? 600 : 400,
                borderRadius: 5,
                border: channel === ch.id ? "1px solid var(--accent)" : "1px solid var(--border-subtle)",
                background: channel === ch.id ? "rgba(99,102,241,0.08)" : "transparent",
                color: channel === ch.id ? "var(--accent)" : "var(--ink-secondary)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              <span style={{ fontSize: 10 }}>{ch.icon}</span>
              {ch.label}
            </button>
          ))}
        </div>
      </div>

      {/* Format selector */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--ink-tertiary)", marginBottom: 6 }}>
          Format
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
          {formats.map((f) => {
            const recommended = ideaFormats.includes(f.id);
            return (
              <button
                key={f.id}
                onClick={() => setFormat(f.id)}
                style={{
                  padding: "4px 10px",
                  fontSize: 11,
                  fontWeight: format === f.id ? 600 : 400,
                  borderRadius: 5,
                  border: format === f.id ? "1px solid var(--accent)" : "1px solid var(--border-subtle)",
                  background: format === f.id ? "rgba(99,102,241,0.08)" : "transparent",
                  color: format === f.id ? "var(--accent)" : "var(--ink-secondary)",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                {f.label}
                {recommended && (
                  <span style={{ fontSize: 8, color: "#22c55e" }} title="Recommended for this idea">●</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Model selector */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--ink-tertiary)", marginBottom: 6 }}>
          Model
        </div>
        <ModelSelect value={modelId} onChange={setModelId} compact />
      </div>

      {/* Generate button */}
      <button
        onClick={handleGenerate}
        disabled={isPending}
        style={{
          width: "100%",
          padding: "8px 16px",
          fontSize: 13,
          fontWeight: 600,
          borderRadius: 6,
          border: "none",
          background: "var(--accent)",
          color: "white",
          cursor: isPending ? "not-allowed" : "pointer",
          opacity: isPending ? 0.6 : 1,
        }}
      >
        {isPending ? "Generating..." : "Generate Draft"}
      </button>
    </div>
  );
}
