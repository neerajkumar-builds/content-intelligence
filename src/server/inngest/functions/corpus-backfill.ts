import { inngest } from "../client";
import { CorpusBackfill } from "../events";
import { db } from "@/db";
import { brandCorpus, brands } from "@/db/schema";
import { eq, isNull, and } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { embedTexts } from "@/lib/ai/embed";

export const corpusBackfillFn = inngest.createFunction(
  {
    id: "corpus-backfill",
    concurrency: [{ scope: "account", key: "event.data.workspaceId", limit: 1 }],
    retries: 3,
    triggers: [{ event: CorpusBackfill }],
  },
  async ({ event, step }) => {
    const { brandId, workspaceId } = event.data;

    const items = await step.run("fetch-unembedded", async () => {
      return db
        .select({ id: brandCorpus.id, content: brandCorpus.content, sourceUrl: brandCorpus.sourceUrl })
        .from(brandCorpus)
        .where(and(eq(brandCorpus.brandId, brandId), isNull(brandCorpus.embedding)));
    });

    if (items.length === 0) return { embedded: 0 };

    const [brand] = await step.run("fetch-brand-name", async () => {
      return db.select({ name: brands.name }).from(brands).where(eq(brands.id, brandId)).limit(1);
    });
    const brandName = brand?.name ?? "Unknown";

    const BATCH_SIZE = 50;
    let embedded = 0;

    for (let i = 0; i < items.length; i += BATCH_SIZE) {
      const batch = items.slice(i, i + BATCH_SIZE);

      await step.run(`embed-batch-${i}`, async () => {
        const texts = batch.map(
          (item) =>
            `[Brand: ${brandName} | Source: ${item.sourceUrl ?? "manual"}]\n\n${item.content}`,
        );

        const vectors = await embedTexts(texts, { workspaceId, brandId });

        for (let j = 0; j < batch.length; j++) {
          const vecStr = `[${vectors[j].join(",")}]`;
          await db.execute(
            sql`UPDATE brand_corpus SET embedding = ${vecStr}::halfvec(3072) WHERE id = ${batch[j].id}`,
          );
        }
      });

      embedded += batch.length;
    }

    return { embedded };
  },
);
