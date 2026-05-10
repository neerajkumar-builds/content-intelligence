import { z } from "zod";
import { eq, desc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { protectedProcedure } from "../middleware";
import { router } from "../trpc";
import { brands, brandBriefs } from "@/db/schema";

export const brandRouter = router({
  get: protectedProcedure
    .input(z.object({ brandId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { db, scopeAnd } = ctx.scoped;

      const [brand] = await db
        .select()
        .from(brands)
        .where(scopeAnd(brands.workspaceId, eq(brands.id, input.brandId)))
        .limit(1);

      if (!brand) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Brand not found" });
      }

      const [latestBrief] = await db
        .select()
        .from(brandBriefs)
        .where(eq(brandBriefs.brandId, brand.id))
        .orderBy(desc(brandBriefs.version))
        .limit(1);

      return { ...brand, brief: latestBrief ?? null };
    }),

  list: protectedProcedure.query(async ({ ctx }) => {
    const { db, scope } = ctx.scoped;
    return db.select().from(brands).where(scope(brands.workspaceId));
  }),

  update: protectedProcedure
    .input(
      z.object({
        brandId: z.string().uuid(),
        data: z.object({
          name: z.string().min(1).optional(),
          active: z.boolean().optional(),
        }),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { db, scopeAnd } = ctx.scoped;

      const [updated] = await db
        .update(brands)
        .set(input.data)
        .where(scopeAnd(brands.workspaceId, eq(brands.id, input.brandId)))
        .returning();

      return updated ?? null;
    }),
});
