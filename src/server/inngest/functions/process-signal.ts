import { inngest } from "../client";
import { SignalIngested } from "../events";
import { db } from "@/db";
import { signals, ideas, brands } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { embedTexts } from "@/lib/ai/embed";

const MAX_WORDS = 2000;

function truncate(text: string): string {
  const words = text.split(/\s+/);
  return words.length > MAX_WORDS ? words.slice(0, MAX_WORDS).join(" ") : text;
}

function computeHotScore(metadata: Record<string, unknown>, freshness: string): number {
  let score = 50;
  const upvotes = Number(metadata.score ?? metadata.upvotes ?? 0);
  const comments = Number(metadata.numComments ?? metadata.comments ?? 0);
  if (upvotes > 100) score += 15;
  else if (upvotes > 20) score += 8;
  if (comments > 20) score += 10;
  else if (comments > 5) score += 5;
  if (freshness === "hot") score += 15;
  else if (freshness === "warm") score += 5;
  return Math.min(score, 100);
}

function computeFreshness(metadata: Record<string, unknown>): string {
  const published = metadata.publishedAt ?? metadata.published_at ?? metadata.created;
  if (!published) return "1d";
  const hours = (Date.now() - new Date(published as string).getTime()) / 3_600_000;
  if (hours < 6) return `${Math.max(1, Math.round(hours))}h`;
  if (hours < 48) return `${Math.round(hours / 24)}d`;
  return `${Math.round(hours / 168)}w`;
}

function inferFormats(source: string, bodyLength: number): string[] {
  const formats: string[] = ["linkedin-long"];
  if (bodyLength > 500) formats.push("newsletter");
  if (source === "reddit" || source === "twitter") formats.push("x-thread");
  return formats;
}

function inferAngle(source: string, metadata: Record<string, unknown>): string {
  if (source === "reddit") return "Community signal · discussion thread";
  if (source === "rss") return "Industry signal · published content";
  if (source === "linkedin") return "Network signal · professional post";
  if (source === "competitor") return "Competitive signal · market move";
  if (source === "thought_leader") return "Thought leader · expert perspective";
  return String(metadata.angle ?? "Signal");
}

export const processSignalFn = inngest.createFunction(
  {
    id: "process-signal",
    concurrency: [{ limit: 20 }],
    retries: 3,
    triggers: [{ event: SignalIngested }],
  },
  async ({ event, step }) => {
    const { signalId, workspaceId } = event.data;

    const signal = await step.run("fetch-signal", async () => {
      const [row] = await db
        .select()
        .from(signals)
        .where(eq(signals.id, signalId))
        .limit(1);
      return row;
    });

    if (!signal) return { error: "signal_not_found" };

    await step.run("embed-signal", async () => {
      const text = truncate(
        `[Source: ${signal.source} | ${signal.sourceUrl ?? "unknown"}]\n\n${signal.title}\n\n${signal.body}`,
      );
      const [vector] = await embedTexts([text], { workspaceId });
      const vecStr = `[${vector.join(",")}]`;
      await db.execute(
        sql`UPDATE signals SET embedding = ${vecStr}::halfvec(3072) WHERE id = ${signalId}`,
      );
    });

    const activeBrands = await step.run("fetch-brands", async () => {
      return db
        .select({ id: brands.id, name: brands.name })
        .from(brands)
        .where(and(eq(brands.workspaceId, workspaceId), eq(brands.active, true)));
    });

    const createdIdeas: string[] = [];

    for (const brand of activeBrands) {
      const matches = await step.run(`rank-${brand.id}`, async () => {
        const rows = await db.execute(
          sql`SELECT * FROM match_brand_corpus(
            (SELECT embedding FROM signals WHERE id = ${signalId}),
            ${brand.id}::uuid,
            5
          )`,
        );
        return rows as unknown as { id: string; content: string; similarity: number }[];
      });

      const avgSimilarity =
        matches.length > 0
          ? matches.reduce((sum, r) => sum + Number(r.similarity), 0) / matches.length
          : 0;

      const dupMatches = await step.run(`dedup-${brand.id}`, async () => {
        const rows = await db.execute(
          sql`SELECT * FROM match_signal_ideas(
            (SELECT embedding FROM signals WHERE id = ${signalId}),
            ${workspaceId}::uuid,
            ${brand.id}::uuid,
            30,
            3
          )`,
        );
        return rows as unknown as { id: string; hook: string; similarity: number }[];
      });
      const topDup = dupMatches.length > 0 ? dupMatches[0] : null;
      const isDuplicate = topDup && Number(topDup.similarity) > 0.85;

      const freshness = computeFreshness(signal.metadata as Record<string, unknown>);
      const hotScore = computeHotScore(signal.metadata as Record<string, unknown>, freshness);
      const icpFit = Math.round(avgSimilarity * 100) / 100;
      const score = Math.round((0.5 * icpFit + 0.3 * (hotScore / 100) + 0.2 * 0.5) * 100) / 100;

      await step.run(`create-idea-${brand.id}`, async () => {
        const [idea] = await db
          .insert(ideas)
          .values({
            workspaceId,
            brandId: brand.id,
            signalId,
            hook: signal.title,
            angle: inferAngle(signal.source, signal.metadata as Record<string, unknown>),
            sourceKind: signal.source,
            sourceLabel: String((signal.metadata as Record<string, unknown>).sourceLabel ?? signal.source),
            sourceCitation: String((signal.metadata as Record<string, unknown>).citation ?? ""),
            sourceUrl: signal.sourceUrl,
            icpFit: String(icpFit),
            hotScore,
            freshness,
            formats: inferFormats(signal.source, signal.body.length),
            tags: Array.isArray((signal.metadata as Record<string, unknown>).tags)
              ? ((signal.metadata as Record<string, unknown>).tags as string[])
              : [],
            dedupScore: isDuplicate ? String(topDup!.similarity) : null,
            dedupPriorId: isDuplicate ? topDup!.id : null,
            score: String(score),
          })
          .returning({ id: ideas.id });
        createdIdeas.push(idea.id);
      });
    }

    await step.run("mark-processed", async () => {
      await db
        .update(signals)
        .set({ processed: true })
        .where(eq(signals.id, signalId));
    });

    return { signalId, ideasCreated: createdIdeas.length, ideas: createdIdeas };
  },
);
