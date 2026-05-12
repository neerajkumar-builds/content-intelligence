import { z } from "zod";
import { eq, desc, and, inArray } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { protectedProcedure } from "../middleware";
import { router } from "../trpc";
import { ideas, signals, drafts } from "@/db/schema";

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
      const { db, workspaceId } = ctx.scoped;
      const limit = input?.limit ?? 20;

      const conditions = [eq(ideas.workspaceId, workspaceId)];
      if (input?.brandId) conditions.push(eq(ideas.brandId, input.brandId));
      if (input?.source) conditions.push(eq(ideas.sourceKind, input.source));

      const orderBy =
        input?.sort === "icp"
          ? desc(ideas.icpFit)
          : input?.sort === "fresh"
            ? desc(ideas.createdAt)
            : desc(ideas.hotScore);

      const rows = await db
        .select()
        .from(ideas)
        .where(and(...conditions))
        .orderBy(orderBy, desc(ideas.createdAt))
        .limit(limit + 1)
        .offset(input?.cursor ? 1 : 0);

      const hasMore = rows.length > limit;
      const items = hasMore ? rows.slice(0, limit) : rows;

      const ideaIds = items.map((i) => i.id);
      const draftMap = new Map<string, { draftId: string; draftStatus: string }>();

      if (ideaIds.length > 0) {
        const ideaDrafts = await db
          .select({
            ideaId: drafts.ideaId,
            id: drafts.id,
            status: drafts.status,
            createdAt: drafts.createdAt,
          })
          .from(drafts)
          .where(
            and(
              inArray(drafts.ideaId, ideaIds),
              eq(drafts.workspaceId, workspaceId),
            ),
          )
          .orderBy(desc(drafts.createdAt));

        for (const d of ideaDrafts) {
          if (d.ideaId && !draftMap.has(d.ideaId)) {
            draftMap.set(d.ideaId, { draftId: d.id, draftStatus: d.status });
          }
        }
      }

      return {
        items: items.map((i) => ({
          ...i,
          latestDraft: draftMap.get(i.id) ?? null,
        })),
        nextCursor: hasMore ? items[items.length - 1]?.id : null,
      };
    }),

  getById: protectedProcedure
    .input(z.object({ ideaId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { db, workspaceId } = ctx.scoped;

      const [idea] = await db
        .select()
        .from(ideas)
        .where(and(eq(ideas.id, input.ideaId), eq(ideas.workspaceId, workspaceId)))
        .limit(1);

      if (!idea) throw new TRPCError({ code: "NOT_FOUND", message: "Idea not found" });

      let signal = null;
      if (idea.signalId) {
        const [s] = await db
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
      const { db, workspaceId } = ctx.scoped;

      const [updated] = await db
        .update(ideas)
        .set({ hotScore: 0, score: "0.00" })
        .where(and(eq(ideas.id, input.ideaId), eq(ideas.workspaceId, workspaceId)))
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
      const { db, workspaceId } = ctx.scoped;

      const [idea] = await db
        .insert(ideas)
        .values({
          workspaceId,
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
