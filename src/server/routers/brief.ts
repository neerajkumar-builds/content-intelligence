import { z } from "zod";
import { eq, desc, and } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { protectedProcedure } from "../middleware";
import { router } from "../trpc";
import { brandBriefs, brands } from "@/db/schema";

export const briefRouter = router({
  create: protectedProcedure
    .input(
      z.object({
        brandId: z.string().uuid(),
        wedge: z.string().min(1),
        icp: z.string().min(1),
        voiceTraits: z.string().min(1),
        antiPositioning: z.string().min(1),
        changelog: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { db, scopeAnd } = ctx.scoped;

      const [brand] = await db
        .select({ id: brands.id })
        .from(brands)
        .where(scopeAnd(brands.workspaceId, eq(brands.id, input.brandId)))
        .limit(1);
      if (!brand) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Brand not found",
        });
      }

      const [latest] = await db
        .select({ version: brandBriefs.version })
        .from(brandBriefs)
        .where(eq(brandBriefs.brandId, input.brandId))
        .orderBy(desc(brandBriefs.version))
        .limit(1);
      const nextVersion = (latest?.version ?? 0) + 1;

      const [brief] = await db
        .insert(brandBriefs)
        .values({
          brandId: input.brandId,
          version: nextVersion,
          wedge: input.wedge,
          icp: input.icp,
          voiceTraits: input.voiceTraits,
          antiPositioning: input.antiPositioning,
          editorClerkId: ctx.userId,
          changelog: input.changelog,
        })
        .returning();
      return brief;
    }),

  get: protectedProcedure
    .input(
      z.object({
        brandId: z.string().uuid(),
        version: z.number().int().positive().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { db, scopeAnd } = ctx.scoped;

      const [brand] = await db
        .select({ id: brands.id })
        .from(brands)
        .where(scopeAnd(brands.workspaceId, eq(brands.id, input.brandId)))
        .limit(1);
      if (!brand) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Brand not found",
        });
      }

      const condition = input.version
        ? and(
            eq(brandBriefs.brandId, input.brandId),
            eq(brandBriefs.version, input.version),
          )
        : eq(brandBriefs.brandId, input.brandId);

      const [brief] = await db
        .select()
        .from(brandBriefs)
        .where(condition)
        .orderBy(desc(brandBriefs.version))
        .limit(1);
      return brief ?? null;
    }),

  list: protectedProcedure
    .input(
      z.object({
        brandId: z.string().uuid(),
        limit: z.number().int().min(1).max(50).default(20),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { db, scopeAnd } = ctx.scoped;

      const [brand] = await db
        .select({ id: brands.id })
        .from(brands)
        .where(scopeAnd(brands.workspaceId, eq(brands.id, input.brandId)))
        .limit(1);
      if (!brand) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Brand not found",
        });
      }

      return db
        .select()
        .from(brandBriefs)
        .where(eq(brandBriefs.brandId, input.brandId))
        .orderBy(desc(brandBriefs.version))
        .limit(input.limit);
    }),

  diff: protectedProcedure
    .input(
      z.object({
        brandId: z.string().uuid(),
        versionA: z.number().int().positive(),
        versionB: z.number().int().positive(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { db, scopeAnd } = ctx.scoped;

      const [brand] = await db
        .select({ id: brands.id })
        .from(brands)
        .where(scopeAnd(brands.workspaceId, eq(brands.id, input.brandId)))
        .limit(1);
      if (!brand) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Brand not found",
        });
      }

      const briefs = await db
        .select()
        .from(brandBriefs)
        .where(eq(brandBriefs.brandId, input.brandId));

      const a = briefs.find((b) => b.version === input.versionA);
      const b = briefs.find((br) => br.version === input.versionB);
      if (!a || !b) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "One or both brief versions not found",
        });
      }

      return { a, b };
    }),
});
