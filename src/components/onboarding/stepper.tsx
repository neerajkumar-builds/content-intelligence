"use client";

const STEPS = [
  { n: 1, label: "Brand identity", time: "30s" },
  { n: 2, label: "Voice corpus", time: "2-3 min", critical: true },
  { n: 3, label: "Brand brief", time: "1-2 min" },
  { n: 4, label: "Guardrails", time: "30s" },
];

export function Stepper({ currentStep }: { currentStep: number }) {
  return (
    <div style={{ padding: "20px 32px", borderBottom: "1px solid var(--border-subtle)", background: "var(--bg-surface)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div>
          <div className="eyebrow" style={{ fontSize: 9.5 }}>FIRST-RUN ACTIVATION</div>
          <div style={{ fontSize: 18, fontWeight: 600, letterSpacing: "-0.012em", marginTop: 2 }}>
            Welcome to Content Intelligence Agent
          </div>
        </div>
        <div style={{ fontSize: 11, color: "var(--ink-tertiary)" }}>
          ~5 min · Step {currentStep + 1} of 4
        </div>
      </div>
      <div style={{ display: "flex", gap: 4 }}>
        {STEPS.map((s, i) => (
          <div key={s.n} style={{ flex: s.critical ? 1.4 : 1 }}>
            <div
              style={{
                height: 4,
                borderRadius: 2,
                marginBottom: 6,
                background: i < currentStep ? "var(--good)" : i === currentStep ? "var(--accent)" : "var(--bg-muted)",
              }}
            />
            <div style={{ display: "flex", alignItems: "baseline", gap: 6, fontSize: 10.5 }}>
              <span className="mono tabular" style={{ color: "var(--ink-tertiary)" }}>0{s.n}</span>
              <span
                style={{
                  fontWeight: i === currentStep ? 600 : 500,
                  color: i === currentStep ? "var(--accent)" : i < currentStep ? "var(--ink-primary)" : "var(--ink-tertiary)",
                }}
              >
                {s.label}
              </span>
              {s.critical && <span className="pill bad" style={{ fontSize: 8.5, marginLeft: "auto" }}>CRITICAL</span>}
            </div>
            <div style={{ fontSize: 9.5, color: "var(--ink-quaternary)", marginTop: 1 }}>{s.time}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
