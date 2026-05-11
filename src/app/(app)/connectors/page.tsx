"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

const PLATFORM_DISPLAY: Record<string, { name: string; kind: string; tier: string }> = {
  linkedin: { name: "LinkedIn", kind: "Social · B2B", tier: "tier1" },
  x: { name: "X / Twitter", kind: "Social · Short-form", tier: "tier1" },
  beehiiv: { name: "Beehiiv", kind: "Newsletter", tier: "tier1" },
  facebook: { name: "Facebook", kind: "Social · Pages", tier: "tier2" },
  instagram: { name: "Instagram", kind: "Social · Visual", tier: "tier2" },
  threads: { name: "Threads", kind: "Social · Text-first", tier: "tier2" },
  youtube: { name: "YouTube", kind: "Video · Long-form", tier: "tier2" },
  tiktok: { name: "TikTok", kind: "Video · Short-form", tier: "tier2" },
  reddit: { name: "Reddit", kind: "Community · Discussion", tier: "tier2" },
  bluesky: { name: "Bluesky", kind: "Social · Decentralized", tier: "tier2" },
  pinterest: { name: "Pinterest", kind: "Visual · Discovery", tier: "tier2" },
  substack: { name: "Substack", kind: "Newsletter · Paste", tier: "tier3" },
  hubspot: { name: "HubSpot", kind: "CRM · Attribution", tier: "tier3" },
  medium: { name: "Medium", kind: "Blog · Long-form", tier: "tier3" },
  mastodon: { name: "Mastodon", kind: "Social · Fediverse", tier: "tier3" },
};

const OAUTH_READY = ["linkedin"];

export default function ConnectorsPage() {
  return (
    <Suspense>
      <ConnectorsContent />
    </Suspense>
  );
}

function ConnectorsContent() {
  const searchParams = useSearchParams();
  const connected = searchParams.get("connected");
  const error = searchParams.get("error");

  const platforms = Object.entries(PLATFORM_DISPLAY);

  return (
    <div className="fade-in" style={{ height: "100%", overflow: "auto" }}>
      <div
        style={{
          padding: "20px 28px 8px",
          borderBottom: "1px solid var(--border-subtle)",
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 24,
          position: "sticky",
          top: 0,
          background: "var(--bg-canvas)",
          zIndex: 5,
        }}
      >
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 600, margin: 0, letterSpacing: "-0.012em" }}>Connectors</h1>
          <p style={{ fontSize: 12.5, color: "var(--ink-secondary)", margin: "3px 0 12px", maxWidth: 720 }}>
            15 publishing channels. OAuth login, token management, 11 contract tests each.
          </p>
        </div>
      </div>

      <div style={{ padding: "20px 28px 32px" }}>
        {connected && (
          <div className="card" style={{ padding: 12, marginBottom: 16, background: "var(--accent-soft)", borderColor: "var(--accent)" }}>
            <span style={{ fontSize: 13, color: "var(--accent)", fontWeight: 600 }}>
              Connected {PLATFORM_DISPLAY[connected]?.name ?? connected} successfully
            </span>
          </div>
        )}

        {error && (
          <div className="card" style={{ padding: 12, marginBottom: 16, background: "var(--danger-soft, #fee)", borderColor: "var(--danger)" }}>
            <span style={{ fontSize: 13, color: "var(--danger)", fontWeight: 600 }}>
              Connection failed: {decodeURIComponent(error)}
            </span>
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
          {platforms.map(([id, info]) => {
            const isReady = OAUTH_READY.includes(id);

            return (
              <div
                key={id}
                className="card"
                style={{
                  padding: 16,
                  opacity: isReady ? 1 : 0.6,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{info.name}</div>
                    <div style={{ fontSize: 11, color: "var(--ink-tertiary)" }}>{info.kind}</div>
                  </div>
                  <span className={`pill ${info.tier === "tier1" ? "accent" : info.tier === "tier2" ? "neutral" : "muted"}`} style={{ fontSize: 9 }}>
                    {info.tier}
                  </span>
                </div>

                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 12 }}>
                  <span className="pill neutral" style={{ fontSize: 10 }}>disconnected</span>
                  {isReady ? (
                    <a href={`/api/auth/oauth/${id}/start`} className="btn primary sm" style={{ textDecoration: "none" }}>
                      Connect
                    </a>
                  ) : (
                    <span style={{ fontSize: 10, color: "var(--ink-quaternary)" }}>Coming soon</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
