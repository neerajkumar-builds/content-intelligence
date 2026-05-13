import { z } from "zod";
import { eq, and, desc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { protectedProcedure } from "../middleware";
import { router } from "../trpc";
import { workspaceIntegrations, draftExports } from "@/db/schema";
import { encryptToken, decryptToken } from "@/lib/connectors/oauth/encrypt";
import { testDriveConnection } from "@/lib/integrations/google-drive";
import { testSlackConnection, isValidSlackWebhookUrl } from "@/lib/integrations/slack";

const integrationTypeSchema = z.enum(["slack", "google_drive"]);

export const integrationsRouter = router({
  getConfig: protectedProcedure
    .input(z.object({ integrationType: integrationTypeSchema }))
    .query(async ({ ctx, input }) => {
      const { db, scopeAnd } = ctx.scoped;

      const [row] = await db
        .select()
        .from(workspaceIntegrations)
        .where(
          scopeAnd(
            workspaceIntegrations.workspaceId,
            eq(workspaceIntegrations.integrationType, input.integrationType),
          ),
        )
        .limit(1);

      if (!row) return null;

      const hasDbSecret = !!row.encryptedSecret;
      const hasEnvSecret =
        (input.integrationType === "google_drive" && !!process.env.GOOGLE_SERVICE_ACCOUNT_JSON) ||
        (input.integrationType === "slack" && !!process.env.SLACK_WEBHOOK_URL);

      return {
        id: row.id,
        integrationType: row.integrationType,
        hasSecret: hasDbSecret || hasEnvSecret,
        config: row.config as Record<string, unknown>,
        enabled: row.enabled,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      };
    }),

  updateConfig: protectedProcedure
    .input(
      z.object({
        integrationType: integrationTypeSchema,
        secret: z.string().optional(),
        config: z.record(z.string(), z.unknown()),
        enabled: z.boolean(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { db, workspaceId, scopeAnd } = ctx.scoped;

      if (input.integrationType === "slack" && input.secret) {
        if (!isValidSlackWebhookUrl(input.secret)) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Invalid Slack webhook URL. Must be a valid hooks.slack.com URL.",
          });
        }
      }

      const encryptedSecret = input.secret && input.secret.trim().length > 0
        ? encryptToken(input.secret).ciphertext
        : undefined;

      const [existing] = await db
        .select({ id: workspaceIntegrations.id })
        .from(workspaceIntegrations)
        .where(
          scopeAnd(
            workspaceIntegrations.workspaceId,
            eq(workspaceIntegrations.integrationType, input.integrationType),
          ),
        )
        .limit(1);

      if (existing) {
        const updates: Record<string, unknown> = {
          config: input.config,
          enabled: input.enabled,
        };
        if (encryptedSecret) {
          updates.encryptedSecret = encryptedSecret;
        }

        await db
          .update(workspaceIntegrations)
          .set(updates)
          .where(eq(workspaceIntegrations.id, existing.id));

        return { id: existing.id, updated: true };
      }

      const [row] = await db
        .insert(workspaceIntegrations)
        .values({
          workspaceId,
          integrationType: input.integrationType,
          encryptedSecret: encryptedSecret ?? null,
          config: input.config,
          enabled: input.enabled,
        })
        .returning({ id: workspaceIntegrations.id });

      return { id: row.id, updated: false };
    }),

  testConnection: protectedProcedure
    .input(z.object({
      integrationType: integrationTypeSchema,
      folderId: z.string().optional(),
      webhookUrl: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { db, scopeAnd } = ctx.scoped;

      const [integration] = await db
        .select()
        .from(workspaceIntegrations)
        .where(
          scopeAnd(
            workspaceIntegrations.workspaceId,
            eq(workspaceIntegrations.integrationType, input.integrationType),
          ),
        )
        .limit(1);

      const dbSecret = integration?.encryptedSecret
        ? decryptToken(integration.encryptedSecret)
        : null;

      const envFallback =
        input.integrationType === "google_drive"
          ? process.env.GOOGLE_SERVICE_ACCOUNT_JSON
          : input.integrationType === "slack"
            ? process.env.SLACK_WEBHOOK_URL
            : null;

      const secret = dbSecret ?? envFallback;

      if (!secret) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: `${input.integrationType} is not configured. Save credentials first.`,
        });
      }

      if (input.integrationType === "google_drive") {
        if (!input.folderId) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Enter a folder ID to test",
          });
        }
        const result = await testDriveConnection(secret, input.folderId);
        if (!result.ok) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: result.error ?? "Google Drive connection failed",
          });
        }
        return result;
      }

      if (input.integrationType === "slack") {
        const testUrl = input.webhookUrl;
        if (!testUrl) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Enter a webhook URL to test",
          });
        }
        const result = await testSlackConnection(testUrl);
        if (!result.ok) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: result.error ?? "Slack connection failed",
          });
        }
        return result;
      }

      throw new TRPCError({ code: "BAD_REQUEST", message: "Unknown integration type" });
    }),

  listExports: protectedProcedure
    .input(
      z
        .object({
          draftId: z.string().uuid().optional(),
          limit: z.number().int().min(1).max(100).default(20),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const { db, scope, scopeAnd } = ctx.scoped;

      const conditions = [];
      if (input?.draftId) {
        conditions.push(eq(draftExports.draftId, input.draftId));
      }

      const where =
        conditions.length > 0
          ? scopeAnd(draftExports.workspaceId, ...conditions)
          : scope(draftExports.workspaceId);

      return db
        .select()
        .from(draftExports)
        .where(where)
        .orderBy(desc(draftExports.createdAt))
        .limit(input?.limit ?? 20);
    }),
});
