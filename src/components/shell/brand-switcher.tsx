"use client";

import { useState } from "react";
import { Icon } from "@/components/primitives";

const BRANDS = [
  { id: "br_fullfunnel", name: "FullFunnel.co", voice_score: 0.91, active: true },
  { id: "br_acme", name: "Acme Operations", voice_score: 0.87, active: false },
  { id: "br_hyperion", name: "Hyperion", voice_score: 0.83, active: false },
];

export function BrandSwitcher() {
  const [open, setOpen] = useState(false);
  const active = BRANDS.find((b) => b.active) || BRANDS[0];

  return (
    <div style={{ position: "relative", margin: "0 10px 8px" }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: "100%",
          padding: "8px 10px",
          background: "var(--bg-muted)",
          border: "1px solid var(--border-subtle)",
          borderRadius: 6,
          display: "flex",
          alignItems: "center",
          gap: 8,
          color: "inherit",
          textAlign: "left",
          cursor: "pointer",
        }}
      >
        <span
          style={{
            width: 22,
            height: 22,
            borderRadius: 5,
            background: "var(--accent)",
            color: "white",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 11,
            fontWeight: 700,
            flexShrink: 0,
          }}
        >
          {active.name.slice(0, 2).toUpperCase()}
        </span>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span
            style={{
              display: "block",
              fontSize: 11.5,
              fontWeight: 600,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {active.name}
          </span>
          <span style={{ display: "block", fontSize: 9.5, color: "var(--ink-tertiary)" }}>
            Brand · voice {active.voice_score}
          </span>
        </span>
        <Icon name="chevDown" size={12} style={{ color: "var(--ink-tertiary)" }} />
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            marginTop: 4,
            background: "var(--bg-surface)",
            border: "1px solid var(--border-default)",
            borderRadius: 6,
            padding: 6,
            zIndex: 50,
            boxShadow: "0 6px 24px rgba(0,0,0,0.12)",
          }}
        >
          <div className="eyebrow" style={{ fontSize: 9, padding: "4px 8px" }}>
            BRANDS IN THIS WORKSPACE · {BRANDS.length}
          </div>
          {BRANDS.map((b) => (
            <button
              key={b.id}
              onClick={() => setOpen(false)}
              style={{
                width: "100%",
                padding: "6px 8px",
                display: "flex",
                alignItems: "center",
                gap: 8,
                background: b.active ? "var(--accent-soft)" : "transparent",
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
                  width: 18,
                  height: 18,
                  borderRadius: 4,
                  background: "var(--accent)",
                  color: "white",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 9,
                  fontWeight: 700,
                }}
              >
                {b.name.slice(0, 2).toUpperCase()}
              </span>
              <span style={{ flex: 1 }}>{b.name}</span>
              <span
                className="mono tabular"
                style={{ fontSize: 10, color: "var(--ink-tertiary)" }}
              >
                {b.voice_score}
              </span>
            </button>
          ))}
          <div
            style={{
              borderTop: "1px solid var(--border-subtle)",
              marginTop: 4,
              paddingTop: 4,
            }}
          >
            <button
              className="btn ghost sm"
              style={{ width: "100%", justifyContent: "flex-start", fontSize: 11.5 }}
            >
              <Icon name="plus" size={11} /> Add brand
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
