"use client";

import { Icon, type IconName } from "@/components/primitives";

interface PlaceholderProps {
  title: string;
  description: string;
  icon?: IconName;
}

export function Placeholder({ title, description, icon = "sparkle" }: PlaceholderProps) {
  return (
    <div
      className="fade-in"
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        padding: 32,
      }}
    >
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: 12,
          background: "var(--accent-soft)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 8,
        }}
      >
        <Icon name={icon} size={26} style={{ color: "var(--accent)" }} />
      </div>
      <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600, letterSpacing: "-0.01em" }}>
        {title}
      </h2>
      <p
        style={{
          margin: 0,
          fontSize: 13,
          color: "var(--ink-secondary)",
          maxWidth: 420,
          textAlign: "center",
          lineHeight: 1.5,
        }}
      >
        {description}
      </p>
      <span className="pill muted" style={{ marginTop: 8, fontSize: 10 }}>
        Phase 1 · stub
      </span>
    </div>
  );
}
