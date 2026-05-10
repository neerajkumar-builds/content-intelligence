import { z } from "zod";
import { eq, desc } from "drizzle-orm";
import { protectedProcedure } from "../middleware";
import { router } from "../trpc";
import { antiAiRules } from "@/db/schema";

export const rulesRouter = router({
  list: protectedProcedure
    .input(
      z
        .object({
          enabled: z.boolean().optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const { db, scope, scopeAnd } = ctx.scoped;

      const condition =
        input?.enabled !== undefined
          ? scopeAnd(
              antiAiRules.workspaceId,
              eq(antiAiRules.enabled, input.enabled),
            )
          : scope(antiAiRules.workspaceId);

      return db
        .select()
        .from(antiAiRules)
        .where(condition)
        .orderBy(desc(antiAiRules.hits30d));
    }),

  create: protectedProcedure
    .input(
      z.object({
        phraseOrPattern: z.string().min(1),
        category: z.enum([
          "punctuation",
          "transition",
          "filler",
          "corporate",
          "cliche",
          "custom",
        ]),
        severity: z.enum(["block", "warn", "suggest", "log"]),
        action: z.enum(["block", "rewrite", "flag"]),
        channelScope: z.array(z.string()).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [rule] = await ctx.scoped.db
        .insert(antiAiRules)
        .values({
          workspaceId: ctx.scoped.workspaceId,
          ...input,
        })
        .returning();

      return rule;
    }),

  update: protectedProcedure
    .input(
      z.object({
        ruleId: z.string().uuid(),
        data: z.object({
          phraseOrPattern: z.string().min(1).optional(),
          action: z.enum(["block", "rewrite", "flag"]).optional(),
          enabled: z.boolean().optional(),
        }),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { db, scopeAnd } = ctx.scoped;

      const [updated] = await db
        .update(antiAiRules)
        .set(input.data)
        .where(
          scopeAnd(
            antiAiRules.workspaceId,
            eq(antiAiRules.id, input.ruleId),
          ),
        )
        .returning();

      return updated ?? null;
    }),
});
