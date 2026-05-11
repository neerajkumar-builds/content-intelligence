import { z } from "zod";
import { eq, and, desc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { protectedProcedure } from "../middleware";
import { router } from "../trpc";
import { brandCorpus, brands } from "@/db/schema";
import { inngest } from "@/server/inngest/client";
import { CorpusItemAdded } from "@/server/inngest/events";

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
      const { db, scopeAnd, workspaceId } = ctx.scoped;

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

      inngest
        .send(
          CorpusItemAdded.create({
            corpusItemId: item.id,
            brandId: input.brandId,
            workspaceId,
          }),
        )
        .catch(() => {});

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
      const { db, workspaceId } = ctx.scoped;

      const [item] = await db
        .select({ id: brandCorpus.id })
        .from(brandCorpus)
        .innerJoin(brands, eq(brandCorpus.brandId, brands.id))
        .where(
          and(
            eq(brandCorpus.id, input.corpusItemId),
            eq(brands.workspaceId, workspaceId),
          ),
        )
        .limit(1);

      if (!item) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Corpus item not found",
        });
      }

      await db.delete(brandCorpus).where(eq(brandCorpus.id, input.corpusItemId));
      return { deleted: true };
    }),
});
