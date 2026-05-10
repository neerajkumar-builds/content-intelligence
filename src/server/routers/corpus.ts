import { z } from "zod";
import { eq, desc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { protectedProcedure } from "../middleware";
import { router } from "../trpc";
import { brandCorpus, brands } from "@/db/schema";

export const corpusRouter = router({
  add: protectedProcedure
    .input(
      z.object({
        brandId: z.string().uuid(),
        content: z.string().min(10).max(50000),
        sourceUrl: z.string().url().optional(),
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

      const [item] = await db
        .insert(brandCorpus)
        .values({
          brandId: input.brandId,
          content: input.content,
          sourceUrl: input.sourceUrl,
        })
        .returning();
      return item;
    }),

  list: protectedProcedure
    .input(z.object({ brandId: z.string().uuid() }))
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
        .select({
          id: brandCorpus.id,
          content: brandCorpus.content,
          sourceUrl: brandCorpus.sourceUrl,
          createdAt: brandCorpus.createdAt,
        })
        .from(brandCorpus)
        .where(eq(brandCorpus.brandId, input.brandId))
        .orderBy(desc(brandCorpus.createdAt));
    }),

  delete: protectedProcedure
    .input(z.object({ corpusItemId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { db } = ctx.scoped;

      const [deleted] = await db
        .delete(brandCorpus)
        .where(eq(brandCorpus.id, input.corpusItemId))
        .returning({ id: brandCorpus.id });
      if (!deleted) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Corpus item not found",
        });
      }
      return { deleted: true };
    }),
});
