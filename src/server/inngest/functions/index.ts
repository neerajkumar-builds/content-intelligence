import { corpusBackfillFn } from "./corpus-backfill";
import { corpusEmbedItemFn } from "./corpus-embed-item";
import { processSignalFn } from "./process-signal";
import { publishPostFn } from "./publish-post";
import { verifyPostFn } from "./verify-post";

export const functions = [
  corpusBackfillFn,
  corpusEmbedItemFn,
  processSignalFn,
  publishPostFn,
  verifyPostFn,
];
