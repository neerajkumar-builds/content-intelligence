import { z } from "zod";
import { eq, desc } from "drizzle-orm";
import { protectedProcedure } from "../middleware";
import { router } from "../trpc";
import { drafts, draftGrades, draftAntiAiHits } from "@/db/schema";

export const draftsRouter = router({
  list: protectedProcedure
    .input(
      z
        .object({
          brandId: z.string().uuid().optional(),
          status: z
            .enum([
              "draft",
              "graded",
              "approved",
              "scheduled",
              "publishing",
              "live",
              "failed",
            ])
            .optional(),
          limit: z.number().int().min(1).max(100).default(20),
          cursor: z.string().uuid().optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const { db, scope, scopeAnd } = ctx.scoped;
      const limit = input?.limit ?? 20;

      const conditions = [];
      if (input?.brandId) conditions.push(eq(drafts.brandId, input.brandId));
      if (input?.status) conditions.push(eq(drafts.status, input.status));

      const where =
        conditions.length > 0
          ? scopeAnd(drafts.workspaceId, ...conditions)
          : scope(drafts.workspaceId);

      const rows = await db
        .select()
        .from(drafts)
        .where(where)
        .orderBy(desc(drafts.updatedAt))
        .limit(limit + 1);

      const hasMore = rows.length > limit;
      const items = hasMore ? rows.slice(0, limit) : rows;

      return {
        items,
        nextCursor: hasMore ? items[items.length - 1]?.id : null,
      };
    }),

  get: protectedProcedure
    .input(z.object({ draftId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { db, scope } = ctx.scoped;

      const [draft] = await db
        .select()
        .from(drafts)
        .where(scope(drafts.workspaceId))
        .then((rows) => rows.filter((r) => r.id === input.draftId));

      if (!draft) return null;

      const grades = await db
        .select()
        .from(draftGrades)
        .where(eq(draftGrades.draftId, draft.id))
        .orderBy(desc(draftGrades.gradedAt));

      const antiAiHits = await db
        .select()
        .from(draftAntiAiHits)
        .where(eq(draftAntiAiHits.draftId, draft.id));

      return { ...draft, grades, antiAiHits };
    }),
});
