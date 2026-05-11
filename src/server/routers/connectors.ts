import { z } from "zod";
import { eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { protectedProcedure } from "../middleware";
import { router } from "../trpc";
import { connectors, oauthCredentials, contractTestResults } from "@/db/schema";
import { createOAuthState } from "@/lib/connectors/oauth/state";
import { getOAuthConfig, getSupportedOAuthPlatforms } from "@/lib/connectors/oauth/registry";
import { buildLinkedInAuthUrl } from "@/lib/connectors/oauth/linkedin";

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

  getOAuthUrl: protectedProcedure
    .input(z.object({ platform: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const config = getOAuthConfig(input.platform);
      if (!config) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `OAuth not supported for ${input.platform}. Supported: ${getSupportedOAuthPlatforms().join(", ")}`,
        });
      }

      const state = createOAuthState(
        input.platform,
        ctx.workspaceId,
        ctx.userId,
      );

      let url: string;
      if (input.platform === "linkedin") {
        url = buildLinkedInAuthUrl(state);
      } else {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `OAuth not yet implemented for ${input.platform}`,
        });
      }

      return { url };
    }),

  disconnect: protectedProcedure
    .input(z.object({ connectorId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { db, scopeAnd } = ctx.scoped;

      const [connector] = await db
        .select({ id: connectors.id })
        .from(connectors)
        .where(scopeAnd(connectors.workspaceId, eq(connectors.id, input.connectorId)))
        .limit(1);

      if (!connector) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Connector not found" });
      }

      await db
        .delete(oauthCredentials)
        .where(eq(oauthCredentials.connectorId, connector.id));

      await db
        .update(connectors)
        .set({ state: "disconnected" })
        .where(eq(connectors.id, connector.id));

      return { disconnected: true };
    }),
});
