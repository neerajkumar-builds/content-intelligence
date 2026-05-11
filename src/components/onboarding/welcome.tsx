"use client";

export function Welcome({ onStart }: { onStart: () => void }) {
  return (
    <div style={{ maxWidth: 600, margin: "0 auto", textAlign: "center", padding: "60px 20px" }}>
      <div className="eyebrow" style={{ fontSize: 9.5, marginBottom: 8 }}>FIRST-RUN ACTIVATION</div>
      <h1 style={{ fontSize: 32, fontWeight: 600, letterSpacing: "-0.02em", margin: "0 0 12px" }}>
        Welcome to Content Intelligence Agent
      </h1>
      <p style={{ fontSize: 14, color: "var(--ink-secondary)", lineHeight: 1.6, marginBottom: 32 }}>
        Voice-faithful B2B content automation. We'll set up your brand identity, voice corpus, and content guardrails in about 5 minutes.
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 40 }}>
        {[
          { step: "01", label: "Brand identity", desc: "Name, industry, voice style" },
          { step: "02", label: "Voice corpus", desc: "Your writing samples" },
          { step: "03", label: "Brand brief", desc: "Wedge, ICP, voice traits" },
          { step: "04", label: "Guardrails", desc: "Anti-AI rules + strict mode" },
        ].map((s) => (
          <div key={s.step} className="card" style={{ padding: 14, textAlign: "left" }}>
            <div className="mono tabular" style={{ fontSize: 10, color: "var(--accent)", marginBottom: 4 }}>{s.step}</div>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>{s.label}</div>
            <div style={{ fontSize: 11, color: "var(--ink-tertiary)" }}>{s.desc}</div>
          </div>
        ))}
      </div>
      <button className="btn primary" onClick={onStart} style={{ padding: "10px 32px", fontSize: 14 }}>
        Get started
      </button>
    </div>
  );
}
