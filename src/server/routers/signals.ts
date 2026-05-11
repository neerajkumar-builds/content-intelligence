import { z } from "zod";
import { eq, desc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { protectedProcedure } from "../middleware";
import { router } from "../trpc";
import { signalSourceConfigs, workspaces } from "@/db/schema";
import { inngest } from "@/server/inngest/client";
import { CorpusBackfill } from "@/server/inngest/events";

async function getWorkspaceUuid(db: typeof import("@/db").db, clerkOrgId: string) {
  const [ws] = await db
    .select({ id: workspaces.id })
    .from(workspaces)
    .where(eq(workspaces.clerkOrgId, clerkOrgId))
    .limit(1);
  if (!ws) throw new TRPCError({ code: "NOT_FOUND", message: "Workspace not found" });
  return ws.id;
}

export const signalsRouter = router({
  listSources: protectedProcedure.query(async ({ ctx }) => {
    const wsId = await getWorkspaceUuid(ctx.db, ctx.workspaceId!);
    return ctx.db
      .select()
      .from(signalSourceConfigs)
      .where(eq(signalSourceConfigs.workspaceId, wsId))
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
      const wsId = await getWorkspaceUuid(ctx.db, ctx.workspaceId!);

      const [config] = await ctx.db
        .insert(signalSourceConfigs)
        .values({
          workspaceId: wsId,
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
      const [updated] = await ctx.db
        .update(signalSourceConfigs)
        .set({ enabled: input.enabled })
        .where(eq(signalSourceConfigs.id, input.sourceId))
        .returning({ id: signalSourceConfigs.id });

      if (!updated) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Source config not found" });
      }
      return updated;
    }),

  deleteSource: protectedProcedure
    .input(z.object({ sourceId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [deleted] = await ctx.db
        .delete(signalSourceConfigs)
        .where(eq(signalSourceConfigs.id, input.sourceId))
        .returning({ id: signalSourceConfigs.id });

      if (!deleted) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Source config not found" });
      }
      return { deleted: true };
    }),

  triggerBackfill: protectedProcedure
    .input(z.object({ brandId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const wsId = await getWorkspaceUuid(ctx.db, ctx.workspaceId!);

      await inngest.send(
        CorpusBackfill.create({
          brandId: input.brandId,
          workspaceId: wsId,
        }),
      );
      return { triggered: true };
    }),
});
