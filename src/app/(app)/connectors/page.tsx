"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { PLATFORMS, getOAuthReadyPlatforms } from "@/lib/config";

/** Extra kind labels and platforms not yet in PLATFORMS config */
const CONNECTOR_KIND: Record<string, string> = {
  linkedin: "Social · B2B",
  twitter: "Social · Short-form",
  beehiiv: "Newsletter",
  facebook: "Social · Pages",
  instagram: "Social · Visual",
  threads: "Social · Text-first",
  youtube: "Video · Long-form",
  tiktok: "Video · Short-form",
  reddit: "Community · Discussion",
  bluesky: "Social · Decentralized",
  pinterest: "Visual · Discovery",
  substack: "Newsletter · Paste",
  hubspot: "CRM · Attribution",
  medium: "Blog · Long-form",
  mastodon: "Social · Fediverse",
};

/** Build connector display list from PLATFORMS config + extras not yet in config */
const CONNECTOR_PLATFORMS: Array<{ id: string; name: string; kind: string; tier: string }> = [
  // Platforms from config (filter out non-connector types like newsletter/blog)
  ...Object.values(PLATFORMS)
    .filter((p) => !["newsletter", "blog"].includes(p.id))
    .map((p) => ({
      id: p.id === "twitter" ? "x" : p.id,
      name: p.label,
      kind: CONNECTOR_KIND[p.id] ?? "",
      tier: p.tier,
    })),
  // Platforms not yet in PLATFORMS config
  ...(["substack", "hubspot", "medium"] as const)
    .filter((id) => !PLATFORMS[id])
    .map((id) => ({
      id,
      name: id === "hubspot" ? "HubSpot" : id.charAt(0).toUpperCase() + id.slice(1),
      kind: CONNECTOR_KIND[id] ?? "",
      tier: "tier3" as const,
    })),
  // beehiiv (not in PLATFORMS config but is a connector)
  ...(!PLATFORMS["beehiiv"]
    ? [{ id: "beehiiv", name: "Beehiiv", kind: CONNECTOR_KIND["beehiiv"] ?? "", tier: "tier1" as const }]
    : []),
];

const OAUTH_READY = getOAuthReadyPlatforms();

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

  const platforms = CONNECTOR_PLATFORMS;

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
              Connected {platforms.find((p) => p.id === connected)?.name ?? connected} successfully
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
          {platforms.map((info) => {
            const oauthId = info.id === "x" ? "twitter" : info.id;
            const isReady = OAUTH_READY.includes(oauthId);

            return (
              <div
                key={info.id}
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
                    <a href={`/api/auth/oauth/${oauthId}/start`} className="btn primary sm" style={{ textDecoration: "none" }}>
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
