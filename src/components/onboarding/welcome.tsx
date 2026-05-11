"use client";

const STEPS = [
  {
    step: "01",
    label: "Brand identity",
    desc: "Name, industry, voice style",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
  {
    step: "02",
    label: "Voice corpus",
    desc: "Your writing samples",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
        <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
        <line x1="12" y1="19" x2="12" y2="23" />
        <line x1="8" y1="23" x2="16" y2="23" />
      </svg>
    ),
  },
  {
    step: "03",
    label: "Brand brief",
    desc: "Wedge, ICP, voice traits",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
      </svg>
    ),
  },
  {
    step: "04",
    label: "Guardrails",
    desc: "Anti-AI rules + strict mode",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
  },
];

export function Welcome({ onStart, onSkip }: { onStart: () => void; onSkip?: () => void }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        flex: 1,
        padding: "40px 20px",
        background: "linear-gradient(180deg, var(--accent-softer) 0%, var(--bg-canvas) 60%)",
        animation: "fadeIn 0.6s ease-out",
      }}
    >
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .step-card { transition: transform 0.2s, box-shadow 0.2s; cursor: default; }
        .step-card:hover { transform: translateY(-3px); box-shadow: 0 8px 24px rgba(0,0,0,0.08); }
        .get-started-btn { transition: transform 0.15s, box-shadow 0.15s; }
        .get-started-btn:hover { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(20, 109, 250, 0.35); }
        .get-started-btn:active { transform: translateY(0); }
      `}</style>

      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: 14,
          background: "linear-gradient(135deg, var(--accent) 0%, #4f8ffc 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 20,
          animation: "slideUp 0.5s ease-out",
        }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
        </svg>
      </div>

      <div
        className="eyebrow"
        style={{
          fontSize: 10,
          letterSpacing: "0.12em",
          color: "var(--accent)",
          marginBottom: 10,
          animation: "slideUp 0.5s ease-out 0.05s both",
        }}
      >
        FIRST-RUN ACTIVATION
      </div>

      <h1
        style={{
          fontSize: 36,
          fontWeight: 700,
          letterSpacing: "-0.025em",
          margin: "0 0 12px",
          background: "linear-gradient(135deg, var(--ink-primary) 0%, var(--ink-secondary) 100%)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          animation: "slideUp 0.5s ease-out 0.1s both",
        }}
      >
        Content Intelligence Agent
      </h1>

      <p
        style={{
          fontSize: 15,
          color: "var(--ink-secondary)",
          lineHeight: 1.6,
          maxWidth: 480,
          textAlign: "center",
          marginBottom: 36,
          animation: "slideUp 0.5s ease-out 0.15s both",
        }}
      >
        Voice-faithful B2B content automation. Set up your brand in about 5 minutes.
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 14,
          marginBottom: 40,
          maxWidth: 640,
          width: "100%",
        }}
      >
        {STEPS.map((s, i) => (
          <div
            key={s.step}
            className="step-card"
            style={{
              padding: "18px 16px",
              textAlign: "left",
              background: "var(--bg-surface)",
              borderRadius: 12,
              border: "1px solid var(--border-subtle)",
              animation: `slideUp 0.5s ease-out ${0.2 + i * 0.08}s both`,
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: "var(--accent-soft)",
                color: "var(--accent)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 12,
              }}
            >
              {s.icon}
            </div>
            <div className="mono tabular" style={{ fontSize: 10, color: "var(--accent)", marginBottom: 4, fontWeight: 600 }}>
              STEP {s.step}
            </div>
            <div style={{ fontSize: 13.5, fontWeight: 600, marginBottom: 3 }}>{s.label}</div>
            <div style={{ fontSize: 11.5, color: "var(--ink-tertiary)", lineHeight: 1.4 }}>{s.desc}</div>
          </div>
        ))}
      </div>

      <button
        className="get-started-btn"
        onClick={onStart}
        style={{
          padding: "12px 40px",
          fontSize: 15,
          fontWeight: 600,
          color: "white",
          background: "linear-gradient(135deg, var(--accent) 0%, #4f8ffc 100%)",
          border: "none",
          borderRadius: 10,
          cursor: "pointer",
          animation: "slideUp 0.5s ease-out 0.55s both",
        }}
      >
        Get started
      </button>

      <div
        style={{
          marginTop: 16,
          fontSize: 12,
          color: "var(--ink-tertiary)",
          animation: "slideUp 0.5s ease-out 0.6s both",
        }}
      >
        Takes about 5 minutes
      </div>

      {onSkip && (
        <button
          onClick={onSkip}
          style={{
            marginTop: 12,
            fontSize: 12,
            color: "var(--ink-secondary)",
            background: "transparent",
            border: "none",
            cursor: "pointer",
            textDecoration: "underline",
            animation: "slideUp 0.5s ease-out 0.65s both",
          }}
        >
          Skip to dashboard
        </button>
      )}
    </div>
  );
}
