import { eventType } from "inngest";
import { z } from "zod";

export const SignalIngested = eventType(
  "content-intelligence/signal.ingested",
  {
    schema: z.object({
      signalId: z.string().uuid(),
      workspaceId: z.string().uuid(),
    }),
  },
);

export const CorpusBackfill = eventType(
  "content-intelligence/corpus.backfill",
  {
    schema: z.object({
      brandId: z.string().uuid(),
      workspaceId: z.string().uuid(),
    }),
  },
);

export const CorpusItemAdded = eventType(
  "content-intelligence/corpus.item.added",
  {
    schema: z.object({
      corpusItemId: z.string().uuid(),
      brandId: z.string().uuid(),
      workspaceId: z.string().uuid(),
    }),
  },
);

export const PostPublish = eventType(
  "content-intelligence/post.publish",
  {
    schema: z.object({
      postId: z.string().uuid(),
      draftId: z.string().uuid(),
      channel: z.string(),
      workspaceId: z.string().uuid(),
      connectorId: z.string().uuid(),
    }),
  },
);

export const PostVerify = eventType(
  "content-intelligence/post.verify",
  {
    schema: z.object({
      postId: z.string().uuid(),
      platformPostId: z.string(),
      channel: z.string(),
      workspaceId: z.string().uuid(),
      connectorId: z.string().uuid(),
    }),
  },
);

export const DraftGenerate = eventType(
  "content-intelligence/draft.generate",
  {
    schema: z.object({
      draftId: z.string().uuid(),
      ideaId: z.string().uuid(),
      brandId: z.string().uuid(),
      workspaceId: z.string().uuid(),
    }),
  },
);

export const TokenRefreshDue = eventType(
  "content-intelligence/token.refresh-due",
  {
    schema: z.object({
      workspaceId: z.string().uuid().optional(),
    }),
  },
);
