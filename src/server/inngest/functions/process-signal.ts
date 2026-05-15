import { z } from "zod";
import { inngest } from "../client";
import { SignalIngested } from "../events";
import { db } from "@/db";
import { signals, ideas, brands } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { embedTexts } from "@/lib/ai/embed";

/** Zod schema for validating LLM classification output */
const classificationSchema = z.object({
  contentType: z.string(),
  themes: z.array(z.string()).max(10).default([]),
  suggestedFormats: z.array(z.string()).max(5).default([]),
  contentAngle: z.string().default(""),
  relevanceScore: z.number().min(0).max(1).default(0.5),
}).passthrough();

const MAX_WORDS = 2000;

function truncate(text: string): string {
  const words = text.split(/\s+/);
  return words.length > MAX_WORDS ? words.slice(0, MAX_WORDS).join(" ") : text;
}

function computeHotScore(metadata: Record<string, unknown>, freshness: string): number {
  let score = 30;
  const upvotes = Number(metadata.score ?? metadata.upvotes ?? 0);
  const comments = Number(metadata.numComments ?? metadata.comments ?? 0);
  if (upvotes > 100) score += 20;
  else if (upvotes > 20) score += 10;
  else if (upvotes > 0) score += 5;
  if (comments > 20) score += 15;
  else if (comments > 5) score += 8;
  else if (comments > 0) score += 3;
  const freshMatch = freshness.match(/^(\d+)(h|d|w)$/);
  if (freshMatch) {
    const num = parseInt(freshMatch[1]);
    const unit = freshMatch[2];
    if (unit === "h" && num <= 6) score += 25;
    else if (unit === "h") score += 15;
    else if (unit === "d" && num <= 1) score += 10;
    else if (unit === "d" && num <= 3) score += 5;
  }
  return Math.min(score, 100);
}

function computeFreshness(metadata: Record<string, unknown>): string {
  const published = metadata.pubDate ?? metadata.publishedAt ?? metadata.published_at ?? metadata.created ?? metadata.isoDate;
  if (!published) return "1d";
  const hours = (Date.now() - new Date(published as string).getTime()) / 3_600_000;
  if (hours < 1) return "now";
  if (hours < 24) return `${Math.round(hours)}h`;
  if (hours < 168) return `${Math.round(hours / 24)}d`;
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
    concurrency: [{ limit: 5 }],
    retries: 3,
    triggers: [{ event: SignalIngested }],
  },
  async ({ event, step }) => {
    const { signalId, workspaceId } = event.data;

    const signal = await step.run("fetch-signal", async () => {
      const [row] = await db
        .select()
        .from(signals)
        .where(and(eq(signals.id, signalId), eq(signals.workspaceId, workspaceId)))
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

    // LLM classification — optional enhancement, graceful degradation on failure
    const classification = await step.run("classify-signal", async () => {
      try {
        const apiKey = process.env.GOOGLE_AI_API_KEY;
        if (!apiKey) {
          console.warn("[classify-signal] GOOGLE_AI_API_KEY not set, skipping");
          return null;
        }

        const truncatedBody = signal.body.slice(0, 1000);
        const prompt = `Classify this content signal. Return valid JSON only, no markdown fences.

Title: ${signal.title}
Content: ${truncatedBody}
Source type: ${signal.source}

Return this JSON structure:
{
  "contentType": one of: "blog_post", "video", "podcast", "social_post", "press_release", "report", "webinar", "newsletter", "case_study", "product_update", "hiring", "event",
  "themes": ["topic1", "topic2"] (max 5 tags),
  "suggestedFormats": ["linkedin-long", "newsletter"] (from: "linkedin-long", "x-thread", "newsletter", "blog", "video-script"),
  "contentAngle": "one sentence suggesting how to respond to this content",
  "relevanceScore": 0.7 (float 0-1)
}`;

        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-goog-api-key": apiKey,
            },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: { temperature: 0.3, maxOutputTokens: 512 },
            }),
          },
        );

        if (!res.ok) {
          const errText = await res.text().catch(() => "unknown");
          console.error(`[classify-signal] Gemini HTTP ${res.status}: ${errText.slice(0, 200)}`);
          return null;
        }

        const data = (await res.json()) as {
          candidates?: Array<{ content: { parts: Array<{ text: string }> } }>;
        };
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) {
          console.error("[classify-signal] Gemini returned no text content");
          return null;
        }

        // Strip markdown fences if model returns them despite instructions
        const cleaned = text.replace(/```(?:json)?\s*/g, "").replace(/```\s*/g, "").trim();
        const rawParsed = JSON.parse(cleaned);

        // Validate LLM output structure with Zod — graceful degradation on invalid data
        const validated = classificationSchema.safeParse(rawParsed);
        if (!validated.success) {
          console.error(
            `[classify-signal] Validation failed for signal ${signalId}:`,
            validated.error.message,
          );
          return null;
        }
        const classification = validated.data;

        // Store classification in signal metadata via JSONB merge
        await db.execute(
          sql`UPDATE signals SET metadata = COALESCE(metadata, '{}'::jsonb) || ${JSON.stringify({ classification })}::jsonb WHERE id = ${signalId}`,
        );

        return classification;
      } catch (err) {
        console.error(`[classify-signal] Failed for signal ${signalId}:`, err);
        return null;
      }
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

      if (isDuplicate) continue;

      const isNearDuplicate = topDup && Number(topDup.similarity) > 0.70;
      const meta = signal.metadata as Record<string, unknown>;
      const freshness = computeFreshness(meta);
      const hotScore = computeHotScore(meta, freshness);
      const icpFit = Math.round(avgSimilarity * 100) / 100;
      const score = Math.round((0.5 * icpFit + 0.3 * (hotScore / 100) + 0.2 * 0.5) * 100) / 100;
      const citation = meta.citation ? String(meta.citation) : null;
      const pubDateRaw = meta.pubDate ?? meta.publishedAt ?? meta.published_at ?? meta.created ?? meta.isoDate;
      const publishedAt = pubDateRaw ? new Date(pubDateRaw as string) : null;

      // Prefer LLM classification over heuristic inference when available
      const formats = classification?.suggestedFormats?.length
        ? classification.suggestedFormats
        : inferFormats(signal.source, signal.body.length);

      const angle = classification?.contentAngle
        ? classification.contentAngle
        : inferAngle(signal.source, meta);

      const tags = classification?.themes?.length
        ? classification.themes
        : Array.isArray(meta.tags) ? (meta.tags as string[]) : [];

      await step.run(`create-idea-${brand.id}`, async () => {
        const [idea] = await db
          .insert(ideas)
          .values({
            workspaceId,
            brandId: brand.id,
            signalId,
            hook: signal.title,
            angle,
            sourceKind: signal.source,
            sourceLabel: String(meta.sourceLabel ?? signal.source),
            sourceCitation: citation,
            publishedAt: publishedAt && !isNaN(publishedAt.getTime()) ? publishedAt : null,
            sourceUrl: signal.sourceUrl,
            icpFit: String(icpFit),
            hotScore,
            freshness,
            formats,
            tags,
            score: String(score),
            dedupScore: isNearDuplicate ? String(Number(topDup!.similarity).toFixed(4)) : null,
            dedupPriorId: isNearDuplicate ? topDup!.id : null,
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
