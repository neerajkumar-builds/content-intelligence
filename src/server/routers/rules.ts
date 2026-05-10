import { z } from "zod";
import { eq, desc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
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

  get: protectedProcedure
    .input(z.object({ ruleId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { db, scopeAnd } = ctx.scoped;
      const [rule] = await db
        .select()
        .from(antiAiRules)
        .where(
          scopeAnd(
            antiAiRules.workspaceId,
            eq(antiAiRules.id, input.ruleId),
          ),
        )
        .limit(1);
      if (!rule) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Rule not found",
        });
      }
      return rule;
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
        patternType: z.enum(["phrase", "regex"]).default("phrase"),
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
          category: z.enum(["punctuation", "transition", "filler", "corporate", "cliche", "custom"]).optional(),
          severity: z.enum(["block", "warn", "suggest", "log"]).optional(),
          action: z.enum(["block", "rewrite", "flag"]).optional(),
          channelScope: z.array(z.string()).optional(),
          patternType: z.enum(["phrase", "regex"]).optional(),
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

      if (!updated) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Rule not found" });
      }
      return updated;
    }),

  delete: protectedProcedure
    .input(z.object({ ruleId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { db, scopeAnd } = ctx.scoped;
      const [deleted] = await db
        .delete(antiAiRules)
        .where(
          scopeAnd(
            antiAiRules.workspaceId,
            eq(antiAiRules.id, input.ruleId),
          ),
        )
        .returning({ id: antiAiRules.id });
      if (!deleted) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Rule not found",
        });
      }
      return { deleted: true };
    }),
});
