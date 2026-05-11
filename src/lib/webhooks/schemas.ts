import { z } from "zod";

export const signalPayloadSchema = z.object({
  workspaceId: z.string().uuid(),
  source: z.enum([
    "rss",
    "reddit",
    "linkedin",
    "twitter",
    "apify",
    "manual",
    "competitor",
    "thought_leader",
  ]),
  title: z.string().min(1).max(500),
  body: z.string().min(1).max(50000),
  sourceUrl: z.string().url().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type SignalPayload = z.infer<typeof signalPayloadSchema>;

export const batchPayloadSchema = z.object({
  signals: z.array(signalPayloadSchema).min(1).max(100),
});
