"use client";

import { useState } from "react";
import { RULE_CATEGORIES } from "@/lib/rules/default-rules";

export function StepGuardrails({
  onSave,
  onSkip,
}: {
  onSave: (data: { strictMode: boolean; enabledCategories: string[] }) => void;
  onSkip: () => void;
}) {
  const [strict, setStrict] = useState(true);
  const [categories, setCategories] = useState<Record<string, boolean>>(
    Object.fromEntries(RULE_CATEGORIES.map((c) => [c.id, c.defaultEnabled])),
  );

  const toggleCategory = (id: string) =>
    setCategories((prev) => ({ ...prev, [id]: !prev[id] }));

  const enabledCategories = Object.entries(categories)
    .filter(([, v]) => v)
    .map(([k]) => k);

  const totalRules = RULE_CATEGORIES.filter((c) => categories[c.id]).reduce(
    (sum, c) => sum + c.count,
    0,
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div
        className="card"
        style={{
          padding: 12,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: strict ? "var(--accent-soft)" : "var(--bg-surface)",
          borderColor: strict ? "var(--accent)" : "var(--border-subtle)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 18, color: strict ? "var(--accent)" : "var(--ink-tertiary)" }}>
            &#x1F6E1;
          </span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>Strict mode {strict ? "enabled" : "disabled"}</div>
            <div style={{ fontSize: 11, color: "var(--ink-secondary)" }}>
              {strict
                ? "Drafts with violations cannot be published."
                : "Violations are flagged but publish is allowed."}
            </div>
          </div>
        </div>
        <button className="btn ghost sm" onClick={() => setStrict(!strict)}>
          {strict ? "Disable" : "Enable"}
        </button>
      </div>

      <div>
        <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8 }}>
          Rule categories ({totalRules} rules selected)
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {RULE_CATEGORIES.map((c) => (
            <label
              key={c.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "8px 12px",
                background: "var(--bg-surface)",
                borderRadius: 6,
                border: "1px solid var(--border-subtle)",
                cursor: "pointer",
              }}
            >
              <input type="checkbox" checked={categories[c.id]} onChange={() => toggleCategory(c.id)} />
              <div style={{ flex: 1 }}>
                <span style={{ fontSize: 13, fontWeight: 500 }}>{c.label}</span>
                <span style={{ fontSize: 11, color: "var(--ink-tertiary)", marginLeft: 8 }}>{c.count} rules</span>
              </div>
            </label>
          ))}
        </div>
      </div>

      <div style={{ fontSize: 11, color: "var(--ink-tertiary)" }}>
        You can fine-tune individual rules anytime at the Rules page.
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 8 }}>
        <button className="btn ghost sm" onClick={onSkip}>Skip (safe defaults)</button>
        <button className="btn primary sm" onClick={() => onSave({ strictMode: strict, enabledCategories })}>
          Save guardrails &rarr; Finish
        </button>
      </div>
    </div>
  );
}
