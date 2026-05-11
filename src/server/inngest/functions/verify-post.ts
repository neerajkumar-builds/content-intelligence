import { inngest } from "../client";
import { PostVerify } from "../events";
import { db } from "@/db";
import { posts, postResults } from "@/db/schema/publishing";
import { connectors } from "@/db/schema/connectors";
import { auditLog } from "@/db/schema/ops";
import { eq } from "drizzle-orm";
import { getAdapter } from "@/lib/connectors/registry";
import { ErrorCodes } from "@/lib/errors/app-error";
import type { Platform } from "@/lib/platforms";

export const verifyPostFn = inngest.createFunction(
  {
    id: "verify-post",
    concurrency: [{ limit: 5 }],
    retries: 2,
    triggers: [{ event: PostVerify }],
  },
  async ({ event, step }) => {
    const { postId, platformPostId, channel, workspaceId, connectorId } =
      event.data;

    const connector = await step.run("fetch-connector", async () => {
      const [row] = await db
        .select()
        .from(connectors)
        .where(eq(connectors.id, connectorId))
        .limit(1);
      return row;
    });

    if (!connector) return { error: "connector_not_found" };

    const platform = connector.platform as Platform;
    const adapter = getAdapter(platform);

    const result = await step.run("verify", async () => {
      const token = ""; // TokenManager wired in CP2
      return adapter.verify(platformPostId, token);
    });

    const isGhost = !result.exists || !result.visible;

    if (isGhost) {
      await step.run("mark-ghost", async () => {
        await db
          .update(posts)
          .set({ status: "failed" })
          .where(eq(posts.id, postId));

        await db.insert(postResults).values({
          postId,
          channel,
          status: "failed",
          errorCode: ErrorCodes.PUBLISH_GHOST,
          errorMessage: "Post not visible on platform after 10-minute verification",
        });
      });
    }

    await step.run("audit", async () => {
      await db.insert(auditLog).values({
        workspaceId,
        actor: "system",
        action: isGhost ? "post.ghost_detected" : "post.verified",
        subjectType: "post",
        subjectId: postId,
        traceId: `verify_${postId}_${Date.now()}`,
        metadata: {
          channel,
          platformPostId,
          exists: result.exists,
          visible: result.visible,
          metrics: result.metrics ?? null,
        },
      });
    });

    return { postId, verified: !isGhost, ghost: isGhost };
  },
);
