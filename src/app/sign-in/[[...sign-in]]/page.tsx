import { SignIn } from "@clerk/nextjs";
import { dark } from "@clerk/themes";

export default function SignInPage() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        padding: "40px",
        gap: 80,
        background: "linear-gradient(160deg, #0c1222 0%, #131c33 40%, #0f172a 100%)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: "radial-gradient(rgba(255,255,255,0.03) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: "10%",
          left: "30%",
          width: 500,
          height: 500,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(20,109,250,0.07) 0%, transparent 70%)",
        }}
      />

      <div style={{ position: "relative", zIndex: 1, maxWidth: 420, color: "white" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 32 }}>
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 9,
              background: "linear-gradient(135deg, #146dfa 0%, #6366f1 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
          </div>
          <span style={{ fontSize: 14, fontWeight: 600 }}>Content Intelligence</span>
        </div>

        <h1 style={{ fontSize: 36, fontWeight: 700, letterSpacing: "-0.03em", lineHeight: 1.15, margin: "0 0 14px" }}>
          Publish voice-faithful content at scale.
        </h1>
        <p style={{ fontSize: 15, color: "rgba(255,255,255,0.5)", lineHeight: 1.6, margin: "0 0 32px" }}>
          Ingest signals, generate drafts in your voice, grade on 7 dimensions, and publish to 15 channels.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 32 }}>
          {[
            { icon: "M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z", label: "Voice-faithful drafts", desc: "7-dimension grading keeps voice consistent" },
            { icon: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z", label: "62 anti-AI guardrails", desc: "Block, warn, suggest, or log" },
            { icon: "M22 12h-4l-3 9L9 3l-3 9H2", label: "15-channel publishing", desc: "Idempotent with audit trails" },
          ].map((f) => (
            <div key={f.label} style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: "rgba(20,109,250,0.1)",
                  color: "#6999fc",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d={f.icon} />
                </svg>
              </div>
              <div>
                <span style={{ fontSize: 13, fontWeight: 600 }}>{f.label}</span>
                <span style={{ fontSize: 12.5, color: "rgba(255,255,255,0.35)", marginLeft: 6 }}>{f.desc}</span>
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", gap: 24 }}>
          {[
            { value: "7-dim", label: "rubric" },
            { value: "15", label: "channels" },
            { value: "62", label: "guardrails" },
          ].map((s) => (
            <div key={s.label} style={{ display: "flex", alignItems: "baseline", gap: 5 }}>
              <span style={{ fontSize: 18, fontWeight: 700, color: "#6999fc" }}>{s.value}</span>
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.04em" }}>{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ position: "relative", zIndex: 1, flexShrink: 0 }}>
        <SignIn
          appearance={{
            baseTheme: dark,
            variables: { colorPrimary: "#146dfa", borderRadius: "0.75rem" },
            elements: {
              cardBox: { boxShadow: "0 12px 48px rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.06)" },
              footer: { "& a": { color: "rgba(255,255,255,0.4)" } },
            },
          }}
        />
      </div>
    </div>
  );
}
