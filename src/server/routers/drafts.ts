import { z } from "zod";
import { eq, and, desc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { protectedProcedure } from "../middleware";
import { router } from "../trpc";
import { drafts, draftGrades, draftAntiAiHits } from "@/db/schema";
import { posts, postResults } from "@/db/schema/publishing";
import { connectors } from "@/db/schema/connectors";
import { inngest } from "../inngest/client";
import { PostPublish } from "../inngest/events";

export const draftsRouter = router({
  list: protectedProcedure
    .input(
      z
        .object({
          brandId: z.string().uuid().optional(),
          status: z
            .enum([
              "draft",
              "graded",
              "approved",
              "scheduled",
              "publishing",
              "live",
              "failed",
            ])
            .optional(),
          limit: z.number().int().min(1).max(100).default(20),
          cursor: z.string().uuid().optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const { db, scope, scopeAnd } = ctx.scoped;
      const limit = input?.limit ?? 20;

      const conditions = [];
      if (input?.brandId) conditions.push(eq(drafts.brandId, input.brandId));
      if (input?.status) conditions.push(eq(drafts.status, input.status));

      const where =
        conditions.length > 0
          ? scopeAnd(drafts.workspaceId, ...conditions)
          : scope(drafts.workspaceId);

      const rows = await db
        .select()
        .from(drafts)
        .where(where)
        .orderBy(desc(drafts.updatedAt))
        .limit(limit + 1);

      const hasMore = rows.length > limit;
      const items = hasMore ? rows.slice(0, limit) : rows;

      return {
        items,
        nextCursor: hasMore ? items[items.length - 1]?.id : null,
      };
    }),

  get: protectedProcedure
    .input(z.object({ draftId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { db, scopeAnd } = ctx.scoped;

      const [draft] = await db
        .select()
        .from(drafts)
        .where(scopeAnd(drafts.workspaceId, eq(drafts.id, input.draftId)))
        .limit(1);

      if (!draft) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Draft not found" });
      }

      const grades = await db
        .select()
        .from(draftGrades)
        .where(eq(draftGrades.draftId, draft.id))
        .orderBy(desc(draftGrades.gradedAt));

      const antiAiHits = await db
        .select()
        .from(draftAntiAiHits)
        .where(eq(draftAntiAiHits.draftId, draft.id));

      return { ...draft, grades, antiAiHits };
    }),

  publish: protectedProcedure
    .input(
      z.object({
        draftId: z.string().uuid(),
        channel: z.string(),
        connectorId: z.string().uuid(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { db, workspaceId, scopeAnd } = ctx.scoped;

      const [draft] = await db
        .select()
        .from(drafts)
        .where(scopeAnd(drafts.workspaceId, eq(drafts.id, input.draftId)))
        .limit(1);

      if (!draft) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Draft not found" });
      }
      if (draft.status !== "approved") {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: `Draft status is "${draft.status}", must be "approved"`,
        });
      }

      const [connector] = await db
        .select()
        .from(connectors)
        .where(
          and(
            eq(connectors.id, input.connectorId),
            eq(connectors.workspaceId, workspaceId),
          ),
        )
        .limit(1);

      if (!connector || connector.state === "disconnected") {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Connector not connected",
        });
      }

      const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
      const idempotencyKey = `idem_${input.draftId}_v${draft.version}_${input.channel}_${today}`;

      const [existing] = await db
        .select({ id: posts.id })
        .from(posts)
        .where(eq(posts.idempotencyKey, idempotencyKey))
        .limit(1);

      if (existing) {
        return { postId: existing.id, idempotencyKey, skipped: true };
      }

      const [post] = await db
        .insert(posts)
        .values({
          workspaceId,
          draftId: input.draftId,
          channel: input.channel,
          idempotencyKey,
          status: "publishing",
        })
        .returning({ id: posts.id });

      await inngest
        .send(
          PostPublish.create({
            postId: post.id,
            draftId: input.draftId,
            channel: input.channel,
            workspaceId,
            connectorId: input.connectorId,
          }),
        )
        .catch(() => {});

      return { postId: post.id, idempotencyKey, skipped: false };
    }),

  publishMulti: protectedProcedure
    .input(
      z.object({
        draftId: z.string().uuid(),
        channels: z.array(
          z.object({
            channel: z.string(),
            connectorId: z.string().uuid(),
          }),
        ),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { db, workspaceId, scopeAnd } = ctx.scoped;

      const [draft] = await db
        .select()
        .from(drafts)
        .where(scopeAnd(drafts.workspaceId, eq(drafts.id, input.draftId)))
        .limit(1);

      if (!draft) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Draft not found" });
      }
      if (draft.status !== "approved") {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: `Draft status is "${draft.status}", must be "approved"`,
        });
      }

      const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
      const results: Array<{
        channel: string;
        postId: string;
        idempotencyKey: string;
        skipped: boolean;
      }> = [];

      for (const ch of input.channels) {
        const idempotencyKey = `idem_${input.draftId}_v${draft.version}_${ch.channel}_${today}`;

        const [existing] = await db
          .select({ id: posts.id })
          .from(posts)
          .where(eq(posts.idempotencyKey, idempotencyKey))
          .limit(1);

        if (existing) {
          results.push({
            channel: ch.channel,
            postId: existing.id,
            idempotencyKey,
            skipped: true,
          });
          continue;
        }

        const [post] = await db
          .insert(posts)
          .values({
            workspaceId,
            draftId: input.draftId,
            channel: ch.channel,
            idempotencyKey,
            status: "publishing",
          })
          .returning({ id: posts.id });

        await inngest
          .send(
            PostPublish.create({
              postId: post.id,
              draftId: input.draftId,
              channel: ch.channel,
              workspaceId,
              connectorId: ch.connectorId,
            }),
          )
          .catch(() => {});

        results.push({
          channel: ch.channel,
          postId: post.id,
          idempotencyKey,
          skipped: false,
        });
      }

      return { posts: results };
    }),

  getPublishStatus: protectedProcedure
    .input(z.object({ draftId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { db, scopeAnd } = ctx.scoped;

      const rows = await db
        .select({
          postId: posts.id,
          channel: posts.channel,
          status: posts.status,
          platformPostId: posts.platformPostId,
          platformPostUrl: posts.platformPostUrl,
          publishedAt: posts.publishedAt,
          idempotencyKey: posts.idempotencyKey,
        })
        .from(posts)
        .where(
          scopeAnd(posts.workspaceId, eq(posts.draftId, input.draftId)),
        )
        .orderBy(desc(posts.createdAt));

      return { posts: rows };
    }),
});
