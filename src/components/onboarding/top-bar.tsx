"use client";

import { UserMenu } from "@/components/shell/user-menu";

export function OnboardingTopBar() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "8px 16px",
        borderBottom: "1px solid var(--border-subtle)",
        flexShrink: 0,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 14, fontWeight: 700, fontFamily: "var(--font-display)" }}>
          Content Intelligence
        </span>
        <span style={{ fontSize: 10, color: "var(--ink-tertiary)", padding: "1px 6px", borderRadius: 4, background: "var(--bg-muted)" }}>
          Setup
        </span>
      </div>
      <UserMenu />
    </div>
  );
}
