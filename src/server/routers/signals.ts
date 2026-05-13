import { z } from "zod";
import { eq, and, desc, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { protectedProcedure } from "../middleware";
import { router } from "../trpc";
import { signalSourceConfigs, brands, signals } from "@/db/schema";
import { inngest } from "@/server/inngest/client";
import { CorpusBackfill } from "@/server/inngest/events";

async function probeUrl(url: string): Promise<{
  reachable: boolean;
  isRss: boolean;
  contentType: string | null;
  statusCode: number | null;
  error: string | null;
}> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(url, {
      method: "GET",
      signal: controller.signal,
      headers: { "User-Agent": "ContentIntelligence/1.0 (RSS validator)" },
      redirect: "follow",
    });
    clearTimeout(timeout);

    const contentType = res.headers.get("content-type") ?? "";
    const body = await res.text();
    const first500 = body.slice(0, 500).toLowerCase();

    const isRss =
      contentType.includes("xml") ||
      contentType.includes("rss") ||
      contentType.includes("atom") ||
      first500.includes("<rss") ||
      first500.includes("<feed") ||
      first500.includes("<atom");

    return {
      reachable: true,
      isRss,
      contentType,
      statusCode: res.status,
      error: null,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return {
      reachable: false,
      isRss: false,
      contentType: null,
      statusCode: null,
      error: msg.includes("abort") ? "Timeout after 8s" : msg,
    };
  }
}

export const signalsRouter = router({
  validateSourceUrl: protectedProcedure
    .input(z.object({ url: z.string().url(), source: z.string() }))
    .query(async ({ input }) => {
      const result = await probeUrl(input.url);

      if (!result.reachable) {
        return { valid: false, warning: `URL unreachable: ${result.error}` };
      }
      if (result.statusCode && result.statusCode >= 400) {
        return { valid: false, warning: `URL returned HTTP ${result.statusCode}` };
      }
      if (input.source === "rss" && !result.isRss) {
        return {
          valid: false,
          warning: `Not an RSS/Atom feed (content-type: ${result.contentType}). Try finding the /feed or /rss URL.`,
        };
      }
      return { valid: true, warning: null };
    }),

  listSources: protectedProcedure.query(async ({ ctx }) => {
    const { db, workspaceId } = ctx.scoped;
    return db
      .select()
      .from(signalSourceConfigs)
      .where(eq(signalSourceConfigs.workspaceId, workspaceId))
      .orderBy(desc(signalSourceConfigs.createdAt));
  }),

  addSource: protectedProcedure
    .input(
      z.object({
        source: z.enum([
          "rss",
          "reddit",
          "linkedin",
          "twitter",
          "apify",
          "competitor",
          "thought_leader",
        ]),
        label: z.string().min(1).max(200),
        configUrl: z.string().min(1).max(2000),
        metadata: z.record(z.string(), z.unknown()).optional(),
        profileId: z.string().uuid().optional(),
        fetchMethod: z.enum([
          "rss",
          "rss_discovery",
          "youtube_rss",
          "reddit_rss",
          "google_news",
          "apify",
          "manual",
        ]).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { db, workspaceId } = ctx.scoped;

      if (input.source === "rss") {
        const probe = await probeUrl(input.configUrl);
        if (!probe.reachable) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `URL unreachable: ${probe.error}`,
          });
        }
        if (probe.statusCode && probe.statusCode >= 400) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `URL returned HTTP ${probe.statusCode}`,
          });
        }
        if (!probe.isRss) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Not a valid RSS/Atom feed. Content-type: ${probe.contentType}. Try finding the /feed or /rss URL.`,
          });
        }
      }

      const [config] = await db
        .insert(signalSourceConfigs)
        .values({
          workspaceId,
          source: input.source,
          label: input.label,
          configUrl: input.configUrl,
          metadata: input.metadata ?? {},
          profileId: input.profileId ?? null,
          fetchMethod: input.fetchMethod ?? null,
        })
        .returning();
      return config;
    }),

  updateSource: protectedProcedure
    .input(
      z.object({
        sourceId: z.string().uuid(),
        label: z.string().min(1).max(200).optional(),
        configUrl: z.string().min(1).max(2000).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { db, workspaceId } = ctx.scoped;

      const updates: Record<string, string> = {};
      if (input.label) updates.label = input.label;
      if (input.configUrl) updates.configUrl = input.configUrl;

      if (Object.keys(updates).length === 0) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Nothing to update" });
      }

      const [updated] = await db
        .update(signalSourceConfigs)
        .set(updates)
        .where(
          and(
            eq(signalSourceConfigs.id, input.sourceId),
            eq(signalSourceConfigs.workspaceId, workspaceId),
          ),
        )
        .returning();

      if (!updated) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Source config not found" });
      }
      return updated;
    }),

  toggleSource: protectedProcedure
    .input(
      z.object({
        sourceId: z.string().uuid(),
        enabled: z.boolean(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { db, workspaceId } = ctx.scoped;

      const [updated] = await db
        .update(signalSourceConfigs)
        .set({ enabled: input.enabled })
        .where(
          and(
            eq(signalSourceConfigs.id, input.sourceId),
            eq(signalSourceConfigs.workspaceId, workspaceId),
          ),
        )
        .returning({ id: signalSourceConfigs.id });

      if (!updated) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Source config not found" });
      }
      return updated;
    }),

  deleteSource: protectedProcedure
    .input(z.object({ sourceId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { db, workspaceId } = ctx.scoped;

      const [deleted] = await db
        .delete(signalSourceConfigs)
        .where(
          and(
            eq(signalSourceConfigs.id, input.sourceId),
            eq(signalSourceConfigs.workspaceId, workspaceId),
          ),
        )
        .returning({ id: signalSourceConfigs.id });

      if (!deleted) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Source config not found" });
      }
      return { deleted: true };
    }),

  triggerBackfill: protectedProcedure
    .input(z.object({ brandId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { db, workspaceId } = ctx.scoped;

      const [brand] = await db
        .select({ id: brands.id })
        .from(brands)
        .where(and(eq(brands.id, input.brandId), eq(brands.workspaceId, workspaceId)))
        .limit(1);
      if (!brand) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Brand not in this workspace" });
      }

      await inngest.send(
        CorpusBackfill.create({
          brandId: input.brandId,
          workspaceId,
        }),
      );
      return { triggered: true };
    }),

  listSignals: protectedProcedure
    .input(
      z
        .object({
          source: z.enum(["rss", "reddit", "linkedin", "twitter", "apify", "manual", "competitor", "thought_leader"]).optional(),
          processed: z.boolean().optional(),
          limit: z.number().int().min(1).max(200).default(50),
          offset: z.number().int().min(0).default(0),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const { db, workspaceId } = ctx.scoped;
      const limit = input?.limit ?? 50;
      const offset = input?.offset ?? 0;

      const conditions = [eq(signals.workspaceId, workspaceId)];
      if (input?.source) conditions.push(eq(signals.source, input.source));
      if (input?.processed !== undefined)
        conditions.push(eq(signals.processed, input.processed));

      const rows = await db
        .select({
          id: signals.id,
          source: signals.source,
          sourceUrl: signals.sourceUrl,
          title: signals.title,
          body: sql<string>`LEFT(${signals.body}, 200)`,
          metadata: signals.metadata,
          processed: signals.processed,
          createdAt: signals.createdAt,
        })
        .from(signals)
        .where(and(...conditions))
        .orderBy(desc(signals.createdAt))
        .limit(limit + 1)
        .offset(offset);

      const hasMore = rows.length > limit;
      const items = hasMore ? rows.slice(0, limit) : rows;

      const [countResult] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(signals)
        .where(and(...conditions));

      return {
        items,
        total: countResult?.count ?? 0,
        hasMore,
      };
    }),

  triggerSync: protectedProcedure.mutation(async () => {
    const webhookUrl =
      process.env.N8N_SYNC_WEBHOOK_URL ??
      `${process.env.N8N_INSTANCE_URL?.replace(/\/+$/, "")}/webhook/ci-manual-sync`;

    if (!webhookUrl || webhookUrl === "/webhook/ci-manual-sync") {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "n8n sync webhook not configured",
      });
    }

    try {
      const res = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
        signal: AbortSignal.timeout(10_000),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Sync failed (${res.status}): ${errText.slice(0, 200)}`,
        });
      }

      return { triggered: true };
    } catch (err) {
      if (err instanceof TRPCError) throw err;
      const msg = err instanceof Error ? err.message : "Unknown error";
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: msg.includes("abort")
          ? "Sync request timed out"
          : `Sync failed: ${msg}`,
      });
    }
  }),

  countRecent: protectedProcedure.query(async ({ ctx }) => {
    const { db, workspaceId } = ctx.scoped;

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const rows = await db
      .select({
        count: sql<number>`count(*)::int`,
      })
      .from(signals)
      .where(
        and(
          eq(signals.workspaceId, workspaceId),
          sql`${signals.createdAt} >= ${sevenDaysAgo.toISOString()}::timestamptz`,
        ),
      );

    return rows[0]?.count ?? 0;
  }),
});
