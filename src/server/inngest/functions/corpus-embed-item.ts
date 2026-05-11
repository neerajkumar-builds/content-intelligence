import { inngest } from "../client";
import { CorpusItemAdded } from "../events";
import { db } from "@/db";
import { brandCorpus, brands } from "@/db/schema";
import { eq } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { embedTexts } from "@/lib/ai/embed";

export const corpusEmbedItemFn = inngest.createFunction(
  {
    id: "corpus-embed-item",
    retries: 3,
    triggers: [{ event: CorpusItemAdded }],
  },
  async ({ event, step }) => {
    const { corpusItemId, brandId, workspaceId } = event.data;

    const item = await step.run("fetch-item", async () => {
      const [row] = await db
        .select({ id: brandCorpus.id, content: brandCorpus.content, sourceUrl: brandCorpus.sourceUrl })
        .from(brandCorpus)
        .where(eq(brandCorpus.id, corpusItemId))
        .limit(1);
      return row;
    });

    if (!item) return { status: "not_found" };

    const [brand] = await step.run("fetch-brand-name", async () => {
      return db.select({ name: brands.name }).from(brands).where(eq(brands.id, brandId)).limit(1);
    });

    await step.run("embed-and-store", async () => {
      const text = `[Brand: ${brand?.name ?? "Unknown"} | Source: ${item.sourceUrl ?? "manual"}]\n\n${item.content}`;
      const [vector] = await embedTexts([text], { workspaceId, brandId });
      const vecStr = `[${vector.join(",")}]`;
      await db.execute(
        sql`UPDATE brand_corpus SET embedding = ${vecStr}::halfvec(3072) WHERE id = ${corpusItemId}`,
      );
    });

    return { status: "embedded", corpusItemId };
  },
);
