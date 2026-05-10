"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/primitives";
import { Tooltip } from "@/components/primitives";
import { NAV } from "./nav-config";
import { BrandSwitcher } from "./brand-switcher";

const QUOTA = { used: 47, limit: 200 };

function routeFromPathname(pathname: string): string {
  const seg = pathname.split("/").filter(Boolean)[0];
  return seg || "home";
}

export function Sidebar() {
  const pathname = usePathname();
  const activeRoute = routeFromPathname(pathname);

  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("cia.sidebar");
    if (saved === "icon") setCollapsed(true);
  }, []);

  const toggle = () => {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem("cia.sidebar", next ? "icon" : "labeled");
  };

  const width = collapsed ? 60 : 232;

  return (
    <aside
      style={{
        width,
        flexShrink: 0,
        background: "var(--bg-surface)",
        borderRight: "1px solid var(--border-subtle)",
        display: "flex",
        flexDirection: "column",
        transition: "width 0.18s ease",
        overflow: "hidden",
      }}
    >
      {/* Brand lockup */}
      <div
        style={{
          padding: collapsed ? "12px 0" : "14px 14px 12px",
          display: "flex",
          alignItems: "center",
          gap: 10,
          justifyContent: collapsed ? "center" : "flex-start",
        }}
      >
        <span
          style={{
            fontSize: collapsed ? 12 : 13,
            fontWeight: 700,
            letterSpacing: "0.08em",
            color: "var(--accent)",
          }}
        >
          CIA
        </span>
        {!collapsed && (
          <>
            <span
              style={{ width: 1, height: 14, background: "var(--border-default)" }}
            />
            <span
              style={{
                fontSize: 8.5,
                color: "var(--ink-tertiary)",
                letterSpacing: "0.05em",
                textTransform: "uppercase",
              }}
            >
              v1.4 · build 218
            </span>
          </>
        )}
      </div>

      {/* Brand switcher */}
      {!collapsed ? (
        <BrandSwitcher />
      ) : (
        <Tooltip label="FullFunnel.co · brand" side="bottom">
          <span
            style={{
              margin: "0 auto 8px",
              width: 32,
              height: 32,
              borderRadius: 6,
              background: "var(--accent)",
              color: "white",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 12,
              fontWeight: 700,
            }}
          >
            FF
          </span>
        </Tooltip>
      )}

      {/* Nav groups */}
      <nav style={{ flex: 1, overflowY: "auto", padding: "4px 8px" }}>
        {NAV.map((group) => (
          <div key={group.group} style={{ marginBottom: 14 }}>
            {!collapsed && (
              <div className="eyebrow" style={{ padding: "4px 8px 4px", fontSize: 9 }}>
                {group.group}
              </div>
            )}
            {group.items.map((item) => {
              const href = item.id === "home" ? "/" : `/${item.id}`;
              const active = activeRoute === item.id;

              return collapsed ? (
                <Tooltip key={item.id} label={item.label} side="bottom">
                  <Link
                    href={href}
                    style={{
                      width: 44,
                      height: 36,
                      margin: "1px auto",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: active ? "var(--accent-soft)" : "transparent",
                      color: active ? "var(--accent)" : "var(--ink-secondary)",
                      border: 0,
                      borderRadius: 6,
                      position: "relative",
                      textDecoration: "none",
                    }}
                  >
                    <Icon name={item.icon} size={17} />
                    {item.count != null && (
                      <span
                        style={{
                          position: "absolute",
                          top: 4,
                          right: 6,
                          width: 5,
                          height: 5,
                          borderRadius: "50%",
                          background: "var(--accent)",
                        }}
                      />
                    )}
                  </Link>
                </Tooltip>
              ) : (
                <Link
                  key={item.id}
                  href={href}
                  style={{
                    width: "100%",
                    padding: "6px 8px",
                    display: "flex",
                    alignItems: "center",
                    gap: 9,
                    background: active ? "var(--accent-soft)" : "transparent",
                    color: active ? "var(--accent)" : "var(--ink-secondary)",
                    borderRadius: 6,
                    fontSize: 12.5,
                    fontWeight: active ? 600 : 500,
                    textAlign: "left",
                    marginBottom: 1,
                    textDecoration: "none",
                  }}
                >
                  <Icon name={item.icon} size={15} />
                  <span style={{ flex: 1 }}>{item.label}</span>
                  {item.count != null && (
                    <span
                      className="mono tabular"
                      style={{
                        fontSize: 10,
                        color: active ? "var(--accent)" : "var(--ink-tertiary)",
                        background: active ? "transparent" : "var(--bg-muted)",
                        padding: "1px 5px",
                        borderRadius: 3,
                        fontWeight: 500,
                      }}
                    >
                      {item.count}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Quota meter + collapse */}
      <div
        style={{
          padding: collapsed ? "8px 0" : "8px 12px 12px",
          borderTop: "1px solid var(--border-subtle)",
        }}
      >
        {!collapsed ? (
          <>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 10,
                marginBottom: 4,
              }}
            >
              <span className="mono" style={{ color: "var(--ink-tertiary)" }}>
                POSTS · MAY
              </span>
              <span className="mono tabular" style={{ color: "var(--ink-secondary)" }}>
                {QUOTA.used}
                <span style={{ color: "var(--ink-tertiary)" }}>/{QUOTA.limit}</span>
              </span>
            </div>
            <div className="meter">
              <div
                className="fill"
                style={{ width: `${(QUOTA.used / QUOTA.limit) * 100}%` }}
              />
            </div>
            <button
              onClick={toggle}
              className="btn ghost sm"
              style={{
                marginTop: 10,
                width: "100%",
                justifyContent: "flex-start",
                gap: 8,
                fontSize: 10.5,
              }}
            >
              <Icon name="sidebar" size={13} />
              Collapse sidebar
            </button>
          </>
        ) : (
          <Tooltip label="Expand" side="top">
            <button
              onClick={toggle}
              className="btn ghost sm icon-btn"
              style={{ margin: "0 auto", display: "flex" }}
            >
              <Icon name="chevRight" size={14} />
            </button>
          </Tooltip>
        )}
      </div>
    </aside>
  );
}
