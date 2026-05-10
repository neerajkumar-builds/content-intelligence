import { z } from "zod";
import { eq, desc } from "drizzle-orm";
import { protectedProcedure } from "../middleware";
import { router } from "../trpc";
import { auditLog } from "@/db/schema";

export const auditRouter = router({
  list: protectedProcedure
    .input(
      z
        .object({
          limit: z.number().int().min(1).max(200).default(50),
          action: z.string().optional(),
          cursor: z.string().uuid().optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const { db, scope, scopeAnd } = ctx.scoped;
      const limit = input?.limit ?? 50;

      const condition = input?.action
        ? scopeAnd(
            auditLog.workspaceId,
            eq(auditLog.action, input.action),
          )
        : scope(auditLog.workspaceId);

      const rows = await db
        .select()
        .from(auditLog)
        .where(condition)
        .orderBy(desc(auditLog.createdAt))
        .limit(limit + 1);

      const hasMore = rows.length > limit;
      const items = hasMore ? rows.slice(0, limit) : rows;

      return {
        items,
        nextCursor: hasMore ? items[items.length - 1]?.id : null,
      };
    }),
});
