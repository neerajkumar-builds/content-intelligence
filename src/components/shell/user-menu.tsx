"use client";

import { useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/primitives";
import { Avatar } from "@/components/primitives";

const WORKSPACES = [
  { id: "ws_fullfunnel", name: "FullFunnel LLC", plan: "Creator", active: true },
  { id: "ws_gtminds", name: "GTMinds Pvt Ltd", plan: "Creator", active: false },
  { id: "ws_personal", name: "say2neeraj", plan: "Starter", active: false },
];

export function UserMenu() {
  const [open, setOpen] = useState(false);

  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "4px 6px 4px 4px",
          border: 0,
          background: open ? "var(--bg-muted)" : "transparent",
          borderRadius: 6,
          cursor: "pointer",
          color: "inherit",
        }}
      >
        <Avatar name="Neeraj Kumar" size={26} />
        <Icon name="chevDown" size={11} style={{ color: "var(--ink-tertiary)" }} />
      </button>

      {open && (
        <div
          onMouseLeave={() => setOpen(false)}
          style={{
            position: "absolute",
            top: "100%",
            right: 0,
            marginTop: 6,
            width: 280,
            background: "var(--bg-surface)",
            border: "1px solid var(--border-default)",
            borderRadius: 8,
            padding: 4,
            zIndex: 50,
            boxShadow: "0 12px 32px rgba(0,0,0,0.16)",
          }}
        >
          <div
            style={{
              padding: "10px 10px 8px",
              borderBottom: "1px solid var(--border-subtle)",
            }}
          >
            <div style={{ display: "flex", gap: 9, alignItems: "center" }}>
              <Avatar name="Neeraj Kumar" size={32} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 12.5, fontWeight: 600 }}>Neeraj Kumar</div>
                <div style={{ fontSize: 10.5, color: "var(--ink-tertiary)" }}>
                  neeraj@fullfunnel.co
                </div>
              </div>
            </div>
          </div>

          <div className="eyebrow" style={{ fontSize: 9, padding: "8px 10px 4px" }}>
            WORKSPACES · {WORKSPACES.length}
          </div>
          {WORKSPACES.map((w) => (
            <button
              key={w.id}
              onClick={() => setOpen(false)}
              style={{
                width: "100%",
                padding: "7px 10px",
                display: "flex",
                alignItems: "center",
                gap: 8,
                background: w.active ? "var(--accent-soft)" : "transparent",
                border: 0,
                borderRadius: 4,
                cursor: "pointer",
                color: "inherit",
                textAlign: "left",
                fontSize: 12,
              }}
            >
              <span
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 5,
                  background: w.active ? "var(--accent)" : "var(--bg-muted)",
                  color: w.active ? "white" : "var(--ink-secondary)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 10,
                  fontWeight: 700,
                }}
              >
                {w.name
                  .split(" ")
                  .map((s) => s[0])
                  .join("")
                  .slice(0, 2)}
              </span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: "block", fontWeight: w.active ? 600 : 500 }}>
                  {w.name}
                </span>
                <span style={{ display: "block", fontSize: 10, color: "var(--ink-tertiary)" }}>
                  {w.plan}
                </span>
              </span>
              {w.active && (
                <span className="pill success" style={{ fontSize: 9 }}>
                  active
                </span>
              )}
            </button>
          ))}

          <div
            style={{
              borderTop: "1px solid var(--border-subtle)",
              marginTop: 4,
              paddingTop: 4,
            }}
          >
            {(
              [
                ["onboarding", "Restart onboarding", "sparkle"],
                ["settings", "Workspace settings", "settings"],
                ["export", "Data export", "download"],
                ["audit", "Audit log", "shield"],
              ] as const
            ).map(([href, label, icon]) => (
              <Link
                key={href}
                href={`/${href}`}
                onClick={() => setOpen(false)}
                className="btn ghost sm"
                style={{
                  width: "100%",
                  justifyContent: "flex-start",
                  fontSize: 11.5,
                  padding: "6px 10px",
                  textDecoration: "none",
                }}
              >
                <Icon name={icon} size={12} /> {label}
              </Link>
            ))}
            <button
              className="btn ghost sm"
              style={{
                width: "100%",
                justifyContent: "flex-start",
                fontSize: 11.5,
                padding: "6px 10px",
                color: "var(--danger)",
              }}
            >
              <Icon name="signOut" size={12} /> Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
