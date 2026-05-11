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
