import { z } from "zod";
import { eq, desc, and, lt } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { protectedProcedure } from "../middleware";
import { router } from "../trpc";
import { ideas, signals, workspaces } from "@/db/schema";

async function getWorkspaceUuid(db: typeof import("@/db").db, clerkOrgId: string) {
  const [ws] = await db
    .select({ id: workspaces.id })
    .from(workspaces)
    .where(eq(workspaces.clerkOrgId, clerkOrgId))
    .limit(1);
  if (!ws) throw new TRPCError({ code: "NOT_FOUND", message: "Workspace not found" });
  return ws.id;
}

export const ideasRouter = router({
  list: protectedProcedure
    .input(
      z
        .object({
          brandId: z.string().uuid().optional(),
          source: z.string().optional(),
          sort: z.enum(["icp", "hot", "fresh"]).default("hot"),
          limit: z.number().int().min(1).max(100).default(20),
          cursor: z.string().uuid().optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const wsId = await getWorkspaceUuid(ctx.db, ctx.workspaceId!);
      const limit = input?.limit ?? 20;

      const conditions = [eq(ideas.workspaceId, wsId)];
      if (input?.brandId) conditions.push(eq(ideas.brandId, input.brandId));
      if (input?.source) conditions.push(eq(ideas.sourceKind, input.source));

      const orderBy =
        input?.sort === "icp"
          ? desc(ideas.icpFit)
          : input?.sort === "fresh"
            ? desc(ideas.createdAt)
            : desc(ideas.hotScore);

      const rows = await ctx.db
        .select()
        .from(ideas)
        .where(and(...conditions))
        .orderBy(orderBy, desc(ideas.createdAt))
        .limit(limit + 1)
        .offset(input?.cursor ? 1 : 0);

      const hasMore = rows.length > limit;
      const items = hasMore ? rows.slice(0, limit) : rows;

      return {
        items,
        nextCursor: hasMore ? items[items.length - 1]?.id : null,
      };
    }),

  getById: protectedProcedure
    .input(z.object({ ideaId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const wsId = await getWorkspaceUuid(ctx.db, ctx.workspaceId!);

      const [idea] = await ctx.db
        .select()
        .from(ideas)
        .where(and(eq(ideas.id, input.ideaId), eq(ideas.workspaceId, wsId)))
        .limit(1);

      if (!idea) throw new TRPCError({ code: "NOT_FOUND", message: "Idea not found" });

      let signal = null;
      if (idea.signalId) {
        const [s] = await ctx.db
          .select({
            id: signals.id,
            source: signals.source,
            sourceUrl: signals.sourceUrl,
            title: signals.title,
            body: signals.body,
            metadata: signals.metadata,
            createdAt: signals.createdAt,
          })
          .from(signals)
          .where(eq(signals.id, idea.signalId))
          .limit(1);
        signal = s ?? null;
      }

      return { ...idea, signal };
    }),

  dismiss: protectedProcedure
    .input(z.object({ ideaId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const wsId = await getWorkspaceUuid(ctx.db, ctx.workspaceId!);

      const [updated] = await ctx.db
        .update(ideas)
        .set({ hotScore: 0, score: "0.00" })
        .where(and(eq(ideas.id, input.ideaId), eq(ideas.workspaceId, wsId)))
        .returning({ id: ideas.id });

      if (!updated) throw new TRPCError({ code: "NOT_FOUND", message: "Idea not found" });
      return { dismissed: true };
    }),

  addManual: protectedProcedure
    .input(
      z.object({
        brandId: z.string().uuid(),
        hook: z.string().min(1).max(500),
        angle: z.string().min(1).max(500),
        sourceUrl: z.string().url().optional(),
        tags: z.array(z.string()).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const wsId = await getWorkspaceUuid(ctx.db, ctx.workspaceId!);

      const [idea] = await ctx.db
        .insert(ideas)
        .values({
          workspaceId: wsId,
          brandId: input.brandId,
          hook: input.hook,
          angle: input.angle,
          sourceKind: "manual",
          sourceLabel: "Manual entry",
          sourceUrl: input.sourceUrl ?? null,
          icpFit: "0.50",
          hotScore: 50,
          freshness: "now",
          formats: ["linkedin-long"],
          tags: input.tags ?? [],
          score: "0.50",
        })
        .returning();
      return idea;
    }),
});
