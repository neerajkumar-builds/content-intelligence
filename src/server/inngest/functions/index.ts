import { corpusBackfillFn } from "./corpus-backfill";
import { corpusEmbedItemFn } from "./corpus-embed-item";
import { exportDraftFn } from "./export-draft";
import { generateDraftFn } from "./generate-draft";
import { processSignalFn } from "./process-signal";
import { publishPostFn } from "./publish-post";

export const functions = [
  corpusBackfillFn,
  corpusEmbedItemFn,
  exportDraftFn,
  generateDraftFn,
  processSignalFn,
  publishPostFn,
];
