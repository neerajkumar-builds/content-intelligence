import { z } from "zod";
import { eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { publicProcedure, router } from "../trpc";
import { protectedProcedure } from "../middleware";
import {
  workspaces,
  brands,
  brandBriefs,
  brandCorpus,
  antiAiRules,
} from "@/db/schema";
import { DEFAULT_RULES } from "@/lib/rules/default-rules";

const authOnlyProcedure = publicProcedure.use((opts) => {
  if (!opts.ctx.userId) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Not authenticated" });
  }
  return opts.next({ ctx: { userId: opts.ctx.userId } });
});

export const onboardingRouter = router({
  getStep: authOnlyProcedure.query(async ({ ctx }) => {
    if (!ctx.workspaceId) return { step: 0, workspaceId: null };

    const [ws] = await ctx.db
      .select({
        onboardingStep: workspaces.onboardingStep,
        id: workspaces.id,
      })
      .from(workspaces)
      .where(eq(workspaces.clerkOrgId, ctx.workspaceId))
      .limit(1);

    return { step: ws?.onboardingStep ?? 0, workspaceId: ws?.id ?? null };
  }),

  saveBrandIdentity: authOnlyProcedure
    .input(
      z.object({
        brandName: z.string().min(1).max(100),
        industry: z.string().min(1),
        voiceStyle: z.string().min(1),
        role: z.string().optional(),
        websiteUrl: z.string().url().optional().or(z.literal("")),
        additionalBrands: z
          .array(z.string().min(1).max(100))
          .max(10)
          .optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.workspaceId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message:
            "No workspace selected. Create or join an organization first.",
        });
      }

      let [ws] = await ctx.db
        .select()
        .from(workspaces)
        .where(eq(workspaces.clerkOrgId, ctx.workspaceId))
        .limit(1);

      if (!ws) {
        [ws] = await ctx.db
          .insert(workspaces)
          .values({
            clerkOrgId: ctx.workspaceId,
            name: input.brandName,
            industry: input.industry,
            voiceStyle: input.voiceStyle,
          })
          .returning();
      } else {
        [ws] = await ctx.db
          .update(workspaces)
          .set({ industry: input.industry, voiceStyle: input.voiceStyle })
          .where(eq(workspaces.id, ws.id))
          .returning();
      }

      const [primaryBrand] = await ctx.db
        .insert(brands)
        .values({ workspaceId: ws.id, name: input.brandName })
        .returning();

      if (input.additionalBrands?.length) {
        await ctx.db.insert(brands).values(
          input.additionalBrands.map((name) => ({
            workspaceId: ws.id,
            name,
          })),
        );
      }

      await ctx.db
        .update(workspaces)
        .set({ onboardingStep: 1 })
        .where(eq(workspaces.id, ws.id));

      return { workspaceId: ws.id, brandId: primaryBrand.id };
    }),

  saveCorpusItems: protectedProcedure
    .input(
      z.object({
        brandId: z.string().uuid(),
        items: z
          .array(
            z.object({
              content: z.string().min(10).max(50000),
              sourceUrl: z.string().url().optional(),
            }),
          )
          .min(1)
          .max(50),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { db } = ctx.scoped;

      await db.insert(brandCorpus).values(
        input.items.map((item) => ({
          brandId: input.brandId,
          content: item.content,
          sourceUrl: item.sourceUrl,
        })),
      );

      await db
        .update(workspaces)
        .set({ onboardingStep: 2 })
        .where(eq(workspaces.clerkOrgId, ctx.workspaceId));

      return { saved: input.items.length };
    }),

  saveBrief: protectedProcedure
    .input(
      z.object({
        brandId: z.string().uuid(),
        wedge: z.string().min(1),
        icp: z.string().min(1),
        voiceTraits: z.string().min(1),
        antiPositioning: z.string().min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { db } = ctx.scoped;

      const [brief] = await db
        .insert(brandBriefs)
        .values({
          brandId: input.brandId,
          version: 1,
          wedge: input.wedge,
          icp: input.icp,
          voiceTraits: input.voiceTraits,
          antiPositioning: input.antiPositioning,
          editorClerkId: ctx.userId,
          changelog: "Created during onboarding",
        })
        .returning();

      await db
        .update(workspaces)
        .set({ onboardingStep: 3 })
        .where(eq(workspaces.clerkOrgId, ctx.workspaceId));

      return brief;
    }),

  saveGuardrails: protectedProcedure
    .input(
      z.object({
        brandId: z.string().uuid(),
        strictMode: z.boolean(),
        enabledCategories: z.array(z.string()),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { db } = ctx.scoped;

      await db
        .update(brands)
        .set({ strictMode: input.strictMode })
        .where(eq(brands.id, input.brandId));

      const rulesToInsert = DEFAULT_RULES.filter((r) =>
        input.enabledCategories.includes(r.category),
      ).map((r) => ({
        workspaceId: ctx.scoped.workspaceId,
        phraseOrPattern: r.phraseOrPattern,
        category: r.category,
        severity: r.severity,
        action: r.action,
        patternType: r.patternType,
        enabled: true,
      }));

      if (rulesToInsert.length > 0) {
        await db.insert(antiAiRules).values(rulesToInsert);
      }

      await db
        .update(workspaces)
        .set({ onboardingStep: 4 })
        .where(eq(workspaces.clerkOrgId, ctx.workspaceId));

      return { rulesCreated: rulesToInsert.length };
    }),

  complete: protectedProcedure.mutation(async ({ ctx }) => {
    await ctx.scoped.db
      .update(workspaces)
      .set({ onboardingStep: 5, onboardingCompletedAt: new Date() })
      .where(eq(workspaces.clerkOrgId, ctx.workspaceId));

    return { completed: true };
  }),

  skip: protectedProcedure
    .input(z.object({ currentStep: z.number().int().min(1).max(4) }))
    .mutation(async ({ ctx, input }) => {
      await ctx.scoped.db
        .update(workspaces)
        .set({ onboardingStep: input.currentStep })
        .where(eq(workspaces.clerkOrgId, ctx.workspaceId));

      return { step: input.currentStep };
    }),
});
