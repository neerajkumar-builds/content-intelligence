import { z } from "zod";
import { eq, desc } from "drizzle-orm";
import { protectedProcedure } from "../middleware";
import { router } from "../trpc";
import { ideas } from "@/db/schema";

export const ideasRouter = router({
  list: protectedProcedure
    .input(
      z
        .object({
          brandId: z.string().uuid().optional(),
          limit: z.number().int().min(1).max(100).default(20),
          cursor: z.string().uuid().optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const { db, scope, scopeAnd } = ctx.scoped;
      const limit = input?.limit ?? 20;

      const condition = input?.brandId
        ? scopeAnd(ideas.workspaceId, eq(ideas.brandId, input.brandId))
        : scope(ideas.workspaceId);

      const rows = await db
        .select()
        .from(ideas)
        .where(condition)
        .orderBy(desc(ideas.hotScore))
        .limit(limit + 1);

      const hasMore = rows.length > limit;
      const items = hasMore ? rows.slice(0, limit) : rows;

      return {
        items,
        nextCursor: hasMore ? items[items.length - 1]?.id : null,
      };
    }),
});
