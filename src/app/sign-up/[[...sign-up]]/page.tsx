import { SignUp } from "@clerk/nextjs";
import { dark } from "@clerk/themes";

export default function SignUpPage() {
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

      <div style={{ position: "relative", zIndex: 1, maxWidth: 400, color: "white" }}>
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
          Your voice. Every channel. Zero AI smell.
        </h1>
        <p style={{ fontSize: 15, color: "rgba(255,255,255,0.5)", lineHeight: 1.6, margin: "0 0 28px" }}>
          Get started free. Set up your brand, voice corpus, and guardrails in 5 minutes.
        </p>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {["Voice grading", "Anti-AI rules", "15 channels", "Glass-box AI", "Audit trails"].map((tag) => (
            <span
              key={tag}
              style={{
                padding: "5px 12px",
                borderRadius: 16,
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.07)",
                fontSize: 12,
                color: "rgba(255,255,255,0.5)",
              }}
            >
              {tag}
            </span>
          ))}
        </div>
      </div>

      <div style={{ position: "relative", zIndex: 1, flexShrink: 0 }}>
        <SignUp
          appearance={{
            baseTheme: dark,
            variables: { colorPrimary: "#146dfa", borderRadius: "0.75rem" },
            elements: {
              cardBox: { boxShadow: "0 12px 48px rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.06)" },
            },
          }}
        />
      </div>
    </div>
  );
}
