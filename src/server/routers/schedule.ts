import { z } from "zod";
import { eq, and, gte, lt, desc } from "drizzle-orm";
import { protectedProcedure } from "../middleware";
import { router } from "../trpc";
import { schedules, posts, drafts } from "@/db/schema";

export const scheduleRouter = router({
  list: protectedProcedure
    .input(
      z
        .object({
          weekStart: z.date().optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const { db, scope } = ctx.scoped;

      let condition = scope(schedules.workspaceId);

      if (input?.weekStart) {
        const weekEnd = new Date(input.weekStart);
        weekEnd.setDate(weekEnd.getDate() + 7);
        condition = and(
          condition,
          gte(schedules.scheduledAt, input.weekStart),
          lt(schedules.scheduledAt, weekEnd),
        )!;
      }

      const rows = await db
        .select({
          schedule: schedules,
          draftTitle: drafts.title,
          draftStatus: drafts.status,
        })
        .from(schedules)
        .leftJoin(drafts, eq(schedules.draftId, drafts.id))
        .where(condition)
        .orderBy(schedules.scheduledAt);

      return rows.map((r) => ({
        ...r.schedule,
        title: r.draftTitle,
        status: r.draftStatus,
      }));
    }),
});
