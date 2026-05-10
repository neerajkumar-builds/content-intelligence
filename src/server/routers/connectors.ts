import { eq } from "drizzle-orm";
import { protectedProcedure } from "../middleware";
import { router } from "../trpc";
import { connectors, oauthCredentials, contractTestResults } from "@/db/schema";

const PLATFORM_DISPLAY: Record<string, { name: string; kind: string }> = {
  linkedin: { name: "LinkedIn", kind: "Social · B2B" },
  x: { name: "X / Twitter", kind: "Social · Short-form" },
  facebook: { name: "Facebook", kind: "Social · Pages" },
  instagram: { name: "Instagram", kind: "Social · Visual" },
  threads: { name: "Threads", kind: "Social · Text-first" },
  youtube: { name: "YouTube", kind: "Video · Long-form" },
  tiktok: { name: "TikTok", kind: "Video · Short-form" },
  reddit: { name: "Reddit", kind: "Community · Discussion" },
  pinterest: { name: "Pinterest", kind: "Visual · Discovery" },
  bluesky: { name: "Bluesky", kind: "Social · Decentralized" },
  beehiiv: { name: "Beehiiv", kind: "Newsletter" },
  substack: { name: "Substack", kind: "Newsletter · Paste" },
  hubspot: { name: "HubSpot", kind: "CRM · Attribution" },
  medium: { name: "Medium", kind: "Blog · Long-form" },
  mastodon: { name: "Mastodon", kind: "Social · Fediverse" },
};

function formatExpiresIn(expiresAt: Date | null): string {
  if (!expiresAt) return "—";
  const diff = expiresAt.getTime() - Date.now();
  if (diff <= 0) return "expired";
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days > 0) return `${days} days`;
  const hours = Math.floor(diff / (1000 * 60 * 60));
  return `${hours}h`;
}

export const connectorsRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const { db, scope } = ctx.scoped;

    const rows = await db
      .select()
      .from(connectors)
      .where(scope(connectors.workspaceId));

    const enriched = await Promise.all(
      rows.map(async (connector) => {
        const [creds] = await db
          .select({
            scopes: oauthCredentials.scopes,
            expiresAt: oauthCredentials.expiresAt,
          })
          .from(oauthCredentials)
          .where(eq(oauthCredentials.connectorId, connector.id))
          .limit(1);

        const tests = await db
          .select()
          .from(contractTestResults)
          .where(eq(contractTestResults.connectorId, connector.id));

        const passed = tests.filter((t) => t.passed).length;
        const display = PLATFORM_DISPLAY[connector.platform] ?? {
          name: connector.platform,
          kind: "Unknown",
        };

        return {
          id: connector.id,
          platform: connector.platform,
          name: display.name,
          kind: display.kind,
          acct: connector.accountName,
          state: connector.state,
          tier: connector.tier,
          expires: formatExpiresIn(creds?.expiresAt ?? null),
          last: connector.lastPostAt?.toISOString() ?? null,
          oauth: creds?.scopes ?? null,
          tests: tests.length,
          pass: passed,
        };
      }),
    );

    return enriched;
  }),
});
