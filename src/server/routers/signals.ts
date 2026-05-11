import { z } from "zod";
import { eq, and, desc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { protectedProcedure } from "../middleware";
import { router } from "../trpc";
import { signalSourceConfigs, brands } from "@/db/schema";
import { inngest } from "@/server/inngest/client";
import { CorpusBackfill } from "@/server/inngest/events";

export const signalsRouter = router({
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
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { db, workspaceId } = ctx.scoped;

      const [config] = await db
        .insert(signalSourceConfigs)
        .values({
          workspaceId,
          source: input.source,
          label: input.label,
          configUrl: input.configUrl,
          metadata: input.metadata ?? {},
        })
        .returning();
      return config;
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
});
