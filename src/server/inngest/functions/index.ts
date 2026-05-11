import { corpusBackfillFn } from "./corpus-backfill";
import { corpusEmbedItemFn } from "./corpus-embed-item";
import { generateDraftFn } from "./generate-draft";
import { processSignalFn } from "./process-signal";
import { publishPostFn } from "./publish-post";
import { verifyPostFn } from "./verify-post";

export const functions = [
  corpusBackfillFn,
  corpusEmbedItemFn,
  generateDraftFn,
  processSignalFn,
  publishPostFn,
  verifyPostFn,
];
