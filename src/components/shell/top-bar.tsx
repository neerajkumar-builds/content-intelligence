"use client";

import { usePathname } from "next/navigation";
import { Icon } from "@/components/primitives";
import { Tooltip } from "@/components/primitives";
import { useTheme } from "./theme-provider";
import { UserMenu } from "./user-menu";
import { TITLE_MAP, API_MAP } from "./nav-config";

function routeFromPathname(pathname: string): string {
  const seg = pathname.split("/").filter(Boolean)[0];
  return seg || "home";
}

export function TopBar() {
  const { theme, setTheme } = useTheme();
  const pathname = usePathname();
  const route = routeFromPathname(pathname);

  return (
    <header
      style={{
        height: 50,
        flexShrink: 0,
        borderBottom: "1px solid var(--border-subtle)",
        background: "var(--bg-surface)",
        display: "flex",
        alignItems: "center",
        padding: "0 16px",
        gap: 14,
      }}
    >
      {/* Breadcrumb */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
        <span style={{ fontSize: 11, color: "var(--ink-tertiary)" }}>FullFunnel.co</span>
        <Icon name="chevRight" size={11} style={{ color: "var(--ink-quaternary)" }} />
        <span style={{ fontSize: 13, fontWeight: 600, letterSpacing: "-0.005em" }}>
          {TITLE_MAP[route] || route}
        </span>
        {API_MAP[route] && (
          <span
            className="mono pill outline"
            style={{ fontSize: 9.5, padding: "1px 6px", marginLeft: 4 }}
          >
            {API_MAP[route]}
          </span>
        )}
      </div>

      {/* Search */}
      <div style={{ flex: 1, maxWidth: 400, marginLeft: "auto", position: "relative" }}>
        <Icon
          name="search"
          size={13}
          style={{
            position: "absolute",
            left: 9,
            top: "50%",
            transform: "translateY(-50%)",
            color: "var(--ink-tertiary)",
          }}
        />
        <input
          className="input"
          placeholder="Search ideas, drafts, posts…"
          style={{ paddingLeft: 28, paddingRight: 50, height: 30, fontSize: 12 }}
        />
        <span
          className="mono"
          style={{
            position: "absolute",
            right: 8,
            top: "50%",
            transform: "translateY(-50%)",
            fontSize: 9.5,
            padding: "2px 5px",
            background: "var(--bg-muted)",
            borderRadius: 3,
            color: "var(--ink-tertiary)",
          }}
        >
          ⌘K
        </span>
      </div>

      {/* Right cluster */}
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <Tooltip
          label={theme === "light" ? "Switch to dark" : "Switch to light"}
          side="bottom"
        >
          <button
            className="btn ghost icon-btn"
            onClick={() => setTheme(theme === "light" ? "dark" : "light")}
          >
            <Icon name={theme === "light" ? "moon" : "sun"} size={15} />
          </button>
        </Tooltip>
        <Tooltip label="Notifications · 2 new" side="bottom">
          <button className="btn ghost icon-btn" style={{ position: "relative" }}>
            <Icon name="bell" size={15} />
            <span
              style={{
                position: "absolute",
                top: 6,
                right: 6,
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: "var(--danger)",
              }}
            />
          </button>
        </Tooltip>
        <span
          style={{
            width: 1,
            height: 18,
            background: "var(--border-default)",
            margin: "0 4px",
          }}
        />
        <UserMenu />
      </div>
    </header>
  );
}
