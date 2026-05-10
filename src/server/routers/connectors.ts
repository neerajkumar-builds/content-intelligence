import { eq } from "drizzle-orm";
import { protectedProcedure } from "../middleware";
import { router } from "../trpc";
import { connectors, oauthCredentials, contractTestResults } from "@/db/schema";

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

        return {
          ...connector,
          oauth: creds?.scopes ?? null,
          expiresAt: creds?.expiresAt ?? null,
          tests: tests.length,
          pass: passed,
        };
      }),
    );

    return enriched;
  }),
});
