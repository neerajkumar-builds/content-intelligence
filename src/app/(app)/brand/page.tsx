"use client";

import { useState } from "react";
import { BriefCards } from "@/components/brand/brief-cards";

export default function BrandBriefPage() {
  const [tab, setTab] = useState<"current" | "history" | "diff">("current");

  const brief = {
    version: 2,
    wedge: 'We do voice-faithful B2B ghostwriting with anti-AI guardrails — for operators whose credibility takes a hit when their content sounds like everyone else\'s.',
    icp: 'VP/Director of Marketing at B2B SaaS (50-500 employees), focused on pipeline generation. Post personally on LinkedIn 2-5x/week.',
    voiceTraits: 'Direct · skeptical of frameworks · uses specific numbers · contractions · zero em-dashes · short paragraphs · ends with a question or contrarian assertion.',
    antiPositioning: 'We are not a generic AI writer. We are not a scheduler. We do not optimize for "polish" — we optimize for sounding like you.',
  };

  const tabs = [
    { key: "current" as const, label: `Current · v${brief.version}` },
    { key: "history" as const, label: "Version history" },
    { key: "diff" as const, label: `Diff vs v${brief.version - 1}` },
  ];

  const fields = [
    { label: "WEDGE", body: brief.wedge, meta: "Last edited · 4 days ago by Neeraj" },
    { label: "ICP", body: brief.icp, meta: "Embedded → vector store · 1,536 dims" },
    { label: "VOICE TRAITS", body: brief.voiceTraits, meta: "7 traits · cosine centroid recomputed nightly" },
    { label: "ANTI-POSITIONING", body: brief.antiPositioning, meta: "Used as negative prompt context" },
  ];

  return (
    <div className="fade-in" style={{ height: "100%", overflow: "auto" }}>
      <div style={{ padding: "20px 28px 8px", borderBottom: "1px solid var(--border-subtle)", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 24, position: "sticky", top: 0, background: "var(--bg-canvas)", zIndex: 5 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 600, margin: 0, letterSpacing: "-0.012em" }}>Brand brief</h1>
          <p style={{ fontSize: 12.5, color: "var(--ink-secondary)", margin: "3px 0 12px", maxWidth: 720 }}>The single source of truth that feeds every prompt. Versioned, diff-able, embedded into voice scoring.</p>
        </div>
        <div style={{ display: "flex", gap: 8, paddingTop: 2 }}>
          <button className="btn ghost sm">View history</button>
          <button className="btn primary sm">Edit brief</button>
        </div>
      </div>

      <div style={{ padding: "20px 28px 32px" }}>
        <div style={{ display: "flex", gap: 4, marginBottom: 16, borderBottom: "1px solid var(--border-subtle)" }}>
          {tabs.map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)} className="btn ghost sm" style={{ borderRadius: 0, borderBottom: tab === t.key ? "2px solid var(--accent)" : "2px solid transparent", color: tab === t.key ? "var(--accent)" : "var(--ink-secondary)", padding: "8px 12px", fontWeight: tab === t.key ? 600 : 500 }}>
              {t.label}
            </button>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 20 }}>
          <BriefCards fields={fields} />

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div className="card" style={{ padding: 14 }}>
              <div className="eyebrow" style={{ fontSize: 9.5, marginBottom: 8 }}>VOICE FIDELITY</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 6 }}>
                <span className="tabular" style={{ fontSize: 28, fontWeight: 600, fontFamily: "Montserrat" }}>0.91</span>
                <span style={{ fontSize: 11, color: "var(--good)" }}>↑ 0.04 vs last brief</span>
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

            <div className="card" style={{ padding: 14, background: "var(--bg-muted)" }}>
              <div className="eyebrow" style={{ fontSize: 9.5, marginBottom: 8 }}>VERSIONING</div>
              <div style={{ fontSize: 11.5, lineHeight: 1.7, color: "var(--ink-secondary)" }}>
                <div>v2 · 2026-05-11 · Neeraj · Updated ICP with pipeline focus</div>
                <div>v1 · 2026-05-11 · Neeraj · Initial brand brief</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
