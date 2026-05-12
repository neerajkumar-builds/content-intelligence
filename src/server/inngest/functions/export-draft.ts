import { NonRetriableError } from "inngest";
import { inngest } from "../client";
import { DraftExport } from "../events";
import { db } from "@/db";
import {
  drafts,
  workspaceIntegrations,
  draftExports,
  auditLog,
} from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { decryptToken } from "@/lib/connectors/oauth/encrypt";
import { createGoogleDoc } from "@/lib/integrations/google-drive";
import { sendSlackNotification } from "@/lib/integrations/slack";

function markFailed(
  exportId: string,
  errorCode: string,
  errorMessage: string,
) {
  return db
    .update(draftExports)
    .set({
      status: "failed",
      errorCode,
      errorMessage,
      completedAt: new Date(),
    })
    .where(eq(draftExports.id, exportId));
}

export const exportDraftFn = inngest.createFunction(
  {
    id: "export-draft",
    concurrency: [
      { scope: "account", key: "event.data.workspaceId", limit: 3 },
    ],
    retries: 2,
    onFailure: async ({ event }) => {
      const exportId = (event.data.event?.data as Record<string, unknown>)?.exportId as string | undefined;
      if (exportId) {
        await markFailed(
          exportId,
          "RETRIES_EXHAUSTED",
          "Export failed after all retry attempts",
        );
      }
    },
    triggers: [{ event: DraftExport }],
  },
  async ({ event, step }) => {
    const { draftId, workspaceId, destination, exportId } = event.data;

    const context = await step.run("fetch-context", async () => {
      const [draft] = await db
        .select()
        .from(drafts)
        .where(and(eq(drafts.id, draftId), eq(drafts.workspaceId, workspaceId)))
        .limit(1);

      if (!draft) return { error: "DRAFT_NOT_FOUND" as const };

      const exportTitle =
        draft.title?.trim() ||
        `Draft ${draft.channel} - ${new Date(draft.createdAt).toLocaleDateString()}` ||
        "Untitled Draft";

      const [integration] = await db
        .select()
        .from(workspaceIntegrations)
        .where(
          and(
            eq(workspaceIntegrations.workspaceId, workspaceId),
            eq(workspaceIntegrations.integrationType, destination),
          ),
        )
        .limit(1);

      if (!integration || !integration.enabled) {
        return { error: "INTEGRATION_NOT_CONFIGURED" as const };
      }

      return {
        error: null,
        draft: {
          id: draft.id,
          title: draft.title,
          content: draft.content,
          channel: draft.channel,
          format: draft.format,
          modelId: draft.modelId,
        },
        exportTitle,
        integration: {
          encryptedSecret: integration.encryptedSecret,
          config: integration.config as Record<string, unknown>,
        },
      };
    });

    if (context.error === "DRAFT_NOT_FOUND") {
      await step.run("mark-not-found", async () => {
        await markFailed(exportId, "DRAFT_NOT_FOUND", "Draft was deleted before export completed");
      });
      throw new NonRetriableError("Draft deleted before export");
    }

    if (context.error === "INTEGRATION_NOT_CONFIGURED") {
      await step.run("mark-no-integration", async () => {
        await markFailed(exportId, "INTEGRATION_NOT_CONFIGURED", `${destination} integration is not configured or disabled`);
      });
      throw new NonRetriableError("Integration not configured");
    }

    const { draft, exportTitle, integration } = context;

    await step.run("mark-processing", async () => {
      await db
        .update(draftExports)
        .set({ status: "processing" })
        .where(eq(draftExports.id, exportId));
    });

    if (destination === "google_drive") {
      const result = await step.run("export-to-drive", async () => {
        const [existing] = await db
          .select({ externalId: draftExports.externalId })
          .from(draftExports)
          .where(eq(draftExports.id, exportId))
          .limit(1);
        if (existing?.externalId) {
          return { fileId: existing.externalId, webViewLink: "", skipped: true };
        }

        const secret = integration.encryptedSecret
          ? decryptToken(integration.encryptedSecret)
          : process.env.GOOGLE_SERVICE_ACCOUNT_JSON;

        if (!secret) {
          throw new Error("Google Drive service account not configured — set GOOGLE_SERVICE_ACCOUNT_JSON env var or configure per-workspace");
        }
        const folderId = (integration.config.folderId as string) || process.env.GOOGLE_DRIVE_FOLDER_ID || "";

        if (!folderId) {
          throw new Error("Google Drive folder ID not configured");
        }

        return createGoogleDoc({
          title: exportTitle,
          content: draft.content,
          folderId,
          serviceAccountJson: secret,
        });
      });

      await step.run("record-drive-result", async () => {
        await db
          .update(draftExports)
          .set({
            status: "completed",
            externalId: result.fileId,
            externalUrl: result.webViewLink,
            completedAt: new Date(),
          })
          .where(eq(draftExports.id, exportId));
      });
    }

    if (destination === "slack") {
      const result = await step.run("send-to-slack", async () => {
        const [existing] = await db
          .select({ externalId: draftExports.externalId })
          .from(draftExports)
          .where(eq(draftExports.id, exportId))
          .limit(1);
        if (existing?.externalId) {
          return { ok: true, truncated: false, skipped: true };
        }

        const webhookUrl = integration.encryptedSecret
          ? decryptToken(integration.encryptedSecret)
          : process.env.SLACK_WEBHOOK_URL;

        if (!webhookUrl) {
          throw new Error("Slack webhook URL not configured — set SLACK_WEBHOOK_URL env var or configure per-workspace");
        }
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL
          ? `https://${process.env.VERCEL_URL}`
          : "http://localhost:3000";

        return sendSlackNotification({
          webhookUrl,
          title: exportTitle,
          content: draft.content,
          draftUrl: `${appUrl}/drafts/${draft.id}`,
          channel: draft.channel,
          format: draft.format ?? undefined,
          modelId: draft.modelId ?? undefined,
        });
      });

      if (!result.ok && !("skipped" in result && result.skipped)) {
        await step.run("mark-slack-failed", async () => {
          await markFailed(
            exportId,
            "SLACK_SEND_FAILED",
            (result as { error?: string }).error ?? "Unknown Slack error",
          );
        });
        return { exportId, destination, success: false };
      }

      await step.run("record-slack-result", async () => {
        await db
          .update(draftExports)
          .set({
            status: "completed",
            externalId: "sent",
            metadata: { truncated: result.truncated },
            completedAt: new Date(),
          })
          .where(eq(draftExports.id, exportId));
      });
    }

    await step.run("audit-log", async () => {
      await db.insert(auditLog).values({
        workspaceId,
        actor: "system",
        action: "draft.exported",
        subjectType: "draft",
        subjectId: draftId,
        traceId: `export_${exportId}_${Date.now()}`,
        metadata: { destination, exportId },
      });
    });

    return { exportId, destination, success: true };
  },
);
