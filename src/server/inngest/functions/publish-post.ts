import { inngest } from "../client";
import { PostPublish, PostVerify } from "../events";
import { db } from "@/db";
import { posts, postResults } from "@/db/schema/publishing";
import { drafts } from "@/db/schema/content";
import { connectors, oauthCredentials } from "@/db/schema/connectors";
import { auditLog } from "@/db/schema/ops";
import { eq } from "drizzle-orm";
import { getAdapter } from "@/lib/connectors/registry";
import { decryptToken, encryptToken } from "@/lib/connectors/oauth/encrypt";
import { ErrorCodes, type AppError } from "@/lib/errors/app-error";
import { Platform } from "@/lib/platforms";
import type { PublishInput } from "@/lib/connectors/types";

export const publishPostFn = inngest.createFunction(
  {
    id: "publish-post",
    concurrency: [
      { scope: "account", key: "publish-{{ event.data.workspaceId }}", limit: 5 },
    ],
    retries: 3,
    triggers: [{ event: PostPublish }],
  },
  async ({ event, step }) => {
    const { postId, draftId, channel, workspaceId, connectorId } = event.data;

    const post = await step.run("fetch-post", async () => {
      const [row] = await db
        .select()
        .from(posts)
        .where(eq(posts.id, postId))
        .limit(1);
      return row;
    });

    if (!post) return { error: "post_not_found" };

    const draft = await step.run("fetch-draft", async () => {
      const [row] = await db
        .select({ id: drafts.id, content: drafts.content, title: drafts.title })
        .from(drafts)
        .where(eq(drafts.id, draftId))
        .limit(1);
      return row;
    });

    if (!draft) {
      await markFailed(postId, channel, "DRAFT_NOT_FOUND", "Draft not found");
      return { error: "draft_not_found" };
    }

    const connector = await step.run("fetch-connector", async () => {
      const [row] = await db
        .select()
        .from(connectors)
        .where(eq(connectors.id, connectorId))
        .limit(1);
      return row;
    });

    if (!connector || connector.state === "disconnected") {
      await markFailed(postId, channel, "CONNECTOR_UNAVAILABLE", "Connector disconnected");
      return { error: "connector_unavailable" };
    }

    const platform = connector.platform as Platform;
    const adapter = getAdapter(platform);

    // Build proper publish input based on platform
    const connectorConfig = connector.config as Record<string, string>;
    const publishInput: PublishInput = (() => {
      switch (platform) {
        case Platform.LinkedIn:
          return {
            platform: Platform.LinkedIn,
            authorUrn: connectorConfig.authorUrn ?? "",
            commentary: draft.content ?? "",
            visibility: "PUBLIC" as const,
          };
        default:
          // Other platforms will be added as adapters land
          return {
            platform,
            ...JSON.parse(JSON.stringify(draft)),
          } as never;
      }
    })();

    const validation = await step.run("validate-content", async () => {
      return adapter.validateContent(publishInput);
    });

    if (!validation.valid) {
      await markFailed(postId, channel, ErrorCodes.CONTENT_TOO_LONG, validation.errors.join("; "));
      return { error: "validation_failed", details: validation.errors };
    }

    // -------------------------------------------------------------------
    // get-token: decrypt access token + inline refresh if near-expiry (C2 + C4)
    // -------------------------------------------------------------------
    const token = await step.run("get-token", async () => {
      const [cred] = await db
        .select()
        .from(oauthCredentials)
        .where(eq(oauthCredentials.connectorId, connectorId))
        .limit(1);

      if (!cred) {
        throw new Error("No OAuth credentials found for connector");
      }

      const accessToken = decryptToken(cred.encryptedAccessToken);

      // Check if token expires within 5 minutes — refresh proactively
      const needsRefresh =
        cred.expiresAt &&
        cred.expiresAt < new Date(Date.now() + 5 * 60 * 1000);

      if (needsRefresh && cred.encryptedRefreshToken) {
        try {
          const refreshToken = decryptToken(cred.encryptedRefreshToken);
          const newTokens = await adapter.refreshToken({
            workspaceId,
            platform,
            accessToken,
            refreshToken,
            expiresAt: cred.expiresAt,
            refreshTokenExpiresAt: cred.refreshExpiresAt,
            scopes: cred.scopes.split(",").map((s) => s.trim()),
            encryptedPayload: Buffer.alloc(0),
          });

          // Persist refreshed tokens back to DB
          const encrypted = encryptToken(newTokens.accessToken);
          const refreshEncrypted = newTokens.refreshToken
            ? encryptToken(newTokens.refreshToken)
            : null;

          await db
            .update(oauthCredentials)
            .set({
              encryptedAccessToken: encrypted.ciphertext,
              tokenIv: encrypted.iv,
              tokenTag: encrypted.tag,
              expiresAt: newTokens.expiresAt,
              ...(refreshEncrypted
                ? { encryptedRefreshToken: refreshEncrypted.ciphertext }
                : {}),
              ...(newTokens.refreshTokenExpiresAt
                ? { refreshExpiresAt: newTokens.refreshTokenExpiresAt }
                : {}),
            })
            .where(eq(oauthCredentials.connectorId, connectorId));

          return newTokens.accessToken;
        } catch {
          // Refresh failed — fall back to existing token (might still work)
          return accessToken;
        }
      }

      return accessToken;
    });

    const startMs = Date.now();

    const result = await step.run("publish", async () => {
      return adapter.publish(publishInput, token, post.idempotencyKey);
    });

    const latencyMs = Date.now() - startMs;

    await step.run("record-result", async () => {
      await db.insert(postResults).values({
        postId,
        channel,
        status: result.success ? "success" : "failed",
        errorCode: result.success ? null : ErrorCodes.PUBLISH_FAILED,
        errorMessage: result.success ? null : "Publish returned failure",
        platformResponse: result.raw,
        latencyMs,
        costCents: 0,
      });

      if (result.success) {
        await db
          .update(posts)
          .set({
            status: "live",
            platformPostId: result.platformPostId,
            platformPostUrl: result.platformUrl,
            publishedAt: new Date(),
          })
          .where(eq(posts.id, postId));
      } else {
        await db
          .update(posts)
          .set({ status: "failed" })
          .where(eq(posts.id, postId));
      }
    });

    await step.run("audit", async () => {
      await db.insert(auditLog).values({
        workspaceId,
        actor: "system",
        action: result.success ? "post.published" : "post.failed",
        subjectType: "post",
        subjectId: postId,
        traceId: `pub_${postId}_${Date.now()}`,
        metadata: {
          channel,
          platformPostId: result.platformPostId,
          latencyMs,
          success: result.success,
        },
      });
    });

    if (result.success && result.platformPostId) {
      await step.sleep("ghost-check-delay", "10m");

      await step.sendEvent("schedule-verify", {
        name: "content-intelligence/post.verify",
        data: {
          postId,
          platformPostId: result.platformPostId,
          channel,
          workspaceId,
          connectorId,
        },
      });
    }

    return {
      postId,
      success: result.success,
      platformPostId: result.platformPostId,
      latencyMs,
    };
  },
);

async function markFailed(
  postId: string,
  channel: string,
  errorCode: string,
  errorMessage: string,
): Promise<void> {
  await db.insert(postResults).values({
    postId,
    channel,
    status: "failed",
    errorCode,
    errorMessage,
  });
  await db
    .update(posts)
    .set({ status: "failed" })
    .where(eq(posts.id, postId));
}
