"use client";

import { useState } from "react";

const DEMO_RULES = [
  { id: "1", phrase: 'em-dash (—)', cat: "punctuation", action: "block", hits: 47, severity: "block", patternType: "phrase", enabled: true },
  { id: "2", phrase: "Furthermore", cat: "transition", action: "block", hits: 23, severity: "block", patternType: "phrase", enabled: true },
  { id: "3", phrase: "In conclusion", cat: "transition", action: "block", hits: 18, severity: "block", patternType: "phrase", enabled: true },
  { id: "4", phrase: "It is important to note", cat: "filler", action: "block", hits: 31, severity: "warn", patternType: "phrase", enabled: true },
  { id: "5", phrase: "leverage", cat: "corporate", action: "rewrite", hits: 12, severity: "warn", patternType: "phrase", enabled: true },
  { id: "6", phrase: "synergy", cat: "corporate", action: "block", hits: 4, severity: "block", patternType: "phrase", enabled: true },
  { id: "7", phrase: "unlock", cat: "cliche", action: "flag", hits: 38, severity: "suggest", patternType: "phrase", enabled: true },
  { id: "8", phrase: "\\b(leverage|leveraging)\\b", cat: "corporate", action: "rewrite", hits: 19, severity: "warn", patternType: "regex", enabled: true },
  { id: "9", phrase: "\\b(utilize|utilizing)\\b", cat: "corporate", action: "rewrite", hits: 7, severity: "warn", patternType: "regex", enabled: true },
  { id: "10", phrase: "\\bin order to\\b", cat: "filler", action: "flag", hits: 5, severity: "suggest", patternType: "regex", enabled: true },
];

export default function AntiAIRulesPage() {
  const [strict, setStrict] = useState(true);
  const rules = DEMO_RULES;

  const phraseCount = rules.filter((r) => r.patternType === "phrase").length;
  const regexCount = rules.filter((r) => r.patternType === "regex").length;
  const totalHits = rules.reduce((sum, r) => sum + r.hits, 0);

  const actionColor = (action: string) =>
    action === "block" ? "bad" : action === "rewrite" ? "mid" : "neutral";

  const severityLabel = (sev: string) =>
    sev === "block" ? "high" : sev === "warn" ? "mid" : "low";

  const severityColor = (sev: string) =>
    sev === "block" ? "bad" : sev === "warn" ? "mid" : "neutral";

  return (
    <div className="fade-in" style={{ height: "100%", overflow: "auto" }}>
      <div style={{ padding: "20px 28px 8px", borderBottom: "1px solid var(--border-subtle)", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 24, position: "sticky", top: 0, background: "var(--bg-canvas)", zIndex: 5 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 600, margin: 0, letterSpacing: "-0.012em" }}>Anti-AI rules</h1>
          <p style={{ fontSize: 12.5, color: "var(--ink-secondary)", margin: "3px 0 12px", maxWidth: 720 }}>Deterministic regex + phrase matching. Runs before scoring, blocks publish if strict mode is on.</p>
        </div>
        <div style={{ display: "flex", gap: 8, paddingTop: 2 }}>
          <button className="btn ghost sm">Import preset</button>
          <button className="btn primary sm">+ Add rule</button>
        </div>
      </div>

      <div style={{ padding: "20px 28px 32px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 18 }}>
          {[
            { l: "Strict mode", v: strict ? "ON" : "OFF", sub: "Per-brand enforcement", tone: strict ? "good" : "bad" },
            { l: "Active rules", v: String(rules.length), sub: `${phraseCount} phrase · ${regexCount} regex`, tone: "neutral" },
            { l: "Catches last 30d", v: String(totalHits), sub: `Avg ${(totalHits / 50).toFixed(1)} / draft`, tone: "neutral" },
            { l: "Categories", v: "6", sub: "punctuation · transition · filler · corporate · cliche · custom", tone: "neutral" },
          ].map((k) => (
            <div key={k.l} className="card" style={{ padding: 12 }}>
              <div className="eyebrow" style={{ fontSize: 9.5 }}>{k.l}</div>
              <div className="tabular" style={{ fontSize: 22, fontWeight: 600, fontFamily: "Montserrat", marginTop: 4, color: k.tone === "bad" ? "var(--danger)" : k.tone === "good" ? "var(--good)" : "var(--ink-primary)" }}>{k.v}</div>
              <div style={{ fontSize: 10.5, color: "var(--ink-tertiary)", marginTop: 2 }}>{k.sub}</div>
            </div>
          ))}
        </div>

        <div className="card" style={{ padding: 12, display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, background: strict ? "var(--accent-soft)" : "var(--bg-surface)", borderColor: strict ? "var(--accent)" : "var(--border-subtle)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 18, color: strict ? "var(--accent)" : "var(--ink-tertiary)" }}>&#x1F6E1;</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>Strict mode {strict ? "enabled" : "disabled"}</div>
              <div style={{ fontSize: 11, color: "var(--ink-secondary)" }}>{strict ? "Drafts with violations cannot be published. Rewrite suggestions surface inline." : "Violations are flagged but publish is allowed."}</div>
            </div>
          </div>
          <button className="btn ghost sm" onClick={() => setStrict(!strict)}>{strict ? "Disable" : "Enable"}</button>
        </div>

        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ background: "var(--bg-muted)", borderBottom: "1px solid var(--border-subtle)" }}>
                {["Phrase / pattern", "Category", "Type", "Action", "Hits 30d", "Severity", ""].map((h) => (
                  <th key={h} className="eyebrow" style={{ fontSize: 9.5, padding: "8px 12px", textAlign: "left", fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rules.map((r) => (
                <tr key={r.id} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                  <td style={{ padding: "8px 12px" }}><span className="mono" style={{ fontSize: 11.5 }}>{r.patternType === "regex" ? r.phrase : `"${r.phrase}"`}</span></td>
                  <td style={{ padding: "8px 12px", color: "var(--ink-secondary)" }}>{r.cat}</td>
                  <td style={{ padding: "8px 12px" }}><span className={`pill ${r.patternType === "regex" ? "accent" : "neutral"}`}>{r.patternType}</span></td>
                  <td style={{ padding: "8px 12px" }}><span className={`pill ${actionColor(r.action)}`}>{r.action}</span></td>
                  <td style={{ padding: "8px 12px" }} className="tabular mono">{r.hits}</td>
                  <td style={{ padding: "8px 12px" }}><span className={`pill ${severityColor(r.severity)}`}>{severityLabel(r.severity)}</span></td>
                  <td style={{ padding: "8px 12px", textAlign: "right" }}><button className="btn ghost sm">···</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
