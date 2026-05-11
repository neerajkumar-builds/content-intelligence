import { SignIn } from "@clerk/nextjs";
import { dark } from "@clerk/themes";

export default function SignInPage() {
  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        background: "linear-gradient(160deg, #0c1222 0%, #131c33 40%, #0f172a 100%)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "radial-gradient(rgba(255,255,255,0.03) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: "-10%",
          right: "20%",
          width: 400,
          height: 400,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(20,109,250,0.1) 0%, transparent 70%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: "5%",
          left: "10%",
          width: 250,
          height: 250,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(99,102,241,0.07) 0%, transparent 70%)",
        }}
      />

      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "48px 56px",
          color: "white",
          position: "relative",
          zIndex: 1,
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: "linear-gradient(135deg, #146dfa 0%, #6366f1 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
              </svg>
            </div>
            <span style={{ fontSize: 15, fontWeight: 600 }}>Content Intelligence</span>
          </div>
        </div>

        <div style={{ maxWidth: 440 }}>
          <h1 style={{ fontSize: 38, fontWeight: 700, letterSpacing: "-0.03em", lineHeight: 1.15, margin: "0 0 16px" }}>
            Publish voice-faithful content at scale.
          </h1>
          <p style={{ fontSize: 16, color: "rgba(255,255,255,0.55)", lineHeight: 1.65, margin: "0 0 40px" }}>
            Ingest signals, generate drafts in your voice, grade on 7 dimensions, and publish to 15 channels — with full transparency.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {[
              { d: "M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3zM19 10v2a7 7 0 0 1-14 0v-2M12 19v4", label: "Voice-faithful drafts", desc: "7-dimension grading rubric keeps your voice consistent" },
              { d: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z", label: "62 anti-AI guardrails", desc: "Block, warn, suggest, or log — operator-configurable" },
              { d: "M2 3h20v14H2zM8 21h8M12 17v4", label: "15-channel publishing", desc: "Idempotent delivery with audit trails and ghost detection" },
            ].map((f) => (
              <div
                key={f.label}
                style={{
                  display: "flex",
                  gap: 14,
                  alignItems: "flex-start",
                  padding: "14px 16px",
                  borderRadius: 12,
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 9,
                    background: "rgba(20,109,250,0.12)",
                    color: "#6999fc",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d={f.d} />
                  </svg>
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{f.label}</div>
                  <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", lineHeight: 1.4 }}>{f.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", gap: 32 }}>
          {[
            { value: "7-dim", label: "grading rubric" },
            { value: "15", label: "channels" },
            { value: "62", label: "guardrails" },
          ].map((s) => (
            <div key={s.label}>
              <div style={{ fontSize: 22, fontWeight: 700, color: "#6999fc" }}>{s.value}</div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div
        style={{
          width: 460,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "40px 32px",
          flexShrink: 0,
          position: "relative",
          zIndex: 1,
        }}
      >
        <SignIn
          appearance={{
            baseTheme: dark,
            variables: { colorPrimary: "#146dfa", borderRadius: "0.75rem" },
            elements: {
              cardBox: { boxShadow: "0 8px 40px rgba(0,0,0,0.5)" },
            },
          }}
        />
      </div>
    </div>
  );
}
