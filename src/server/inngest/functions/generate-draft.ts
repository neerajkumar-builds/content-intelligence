import { inngest } from "../client";
import { DraftGenerate } from "../events";
import { db } from "@/db";
import { ideas, signals, brands, brandBriefs, antiAiRules, drafts } from "@/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { callLLM } from "@/lib/ai/llm-router";
import { getOrSeedPrompt, interpolate } from "@/lib/prompts/seed";
import { createTraceId } from "@/lib/logging";

const FORMAT_GUIDELINES: Record<string, string> = {
  "linkedin-long": "LinkedIn long post. 1500-3000 characters. Short paragraphs (2-3 sentences). Strong hook in first line. No hashtags in body. Conversational but professional.",
  "linkedin-short": "LinkedIn short post. 300-800 characters. Punchy. One core insight. Can end with a question to drive comments.",
  "twitter-tweet": "Single tweet. 280 characters max. Punchy and quotable. One clear takeaway. Can include 1-2 hashtags.",
  "twitter-thread": "Twitter thread of 5-8 tweets. Each tweet under 280 chars. Number each (1/N format). Build a narrative arc. First tweet is the hook.",
  "newsletter": "Newsletter article. 800-1500 words. Include a subject line. Professional tone. Use headers to break sections. End with a call to action.",
  "newsletter-digest": "Newsletter digest. 3-5 curated items with 2-3 sentence commentary each. Include source links placeholder.",
  "instagram-caption": "Instagram caption. 150-2200 characters. Conversational. Use line breaks for readability. End with a CTA. Hashtags at the end (5-10).",
  "carousel-script": "Instagram carousel script. 10 slides. Slide 1 = hook headline. Slides 2-9 = one key point each (1-2 sentences). Slide 10 = CTA. Label each slide.",
  "blog-article": "Blog article. 1000-2000 words. Include H2 headers. SEO-friendly structure: intro, body sections, conclusion. Professional tone.",
  "threads-post": "Threads post. 500 characters max. Casual, conversational. One clear point. No hashtags.",
};

function parseGeneratedDraft(text: string): { title: string; body: string } {
  const titleMatch = text.match(/TITLE:\s*(.+)/i);
  const bodyMatch = text.match(/BODY:\s*([\s\S]+)/i);
  if (titleMatch && bodyMatch) {
    return { title: titleMatch[1].trim(), body: bodyMatch[1].trim() };
  }
  // Fallback: first line = title, rest = body
  const lines = text.split("\n").filter((l) => l.trim());
  return {
    title: lines[0]?.trim() ?? "Untitled",
    body: lines.slice(1).join("\n").trim() || text,
  };
}

export const generateDraftFn = inngest.createFunction(
  {
    id: "generate-draft",
    concurrency: [{ limit: 3 }],
    retries: 2,
    triggers: [{ event: DraftGenerate }],
  },
  async ({ event, step }) => {
    const { draftId, ideaId, brandId, workspaceId, modelId, format } = event.data;
    const traceId = createTraceId();

    // Step 1: Fetch idea, brand, latest brief, corpus matches, anti-AI rules
    const context = await step.run("fetch-context", async () => {
      const [idea] = await db
        .select()
        .from(ideas)
        .where(eq(ideas.id, ideaId))
        .limit(1);

      if (!idea) throw new Error(`Idea ${ideaId} not found`);

      const [brand] = await db
        .select()
        .from(brands)
        .where(eq(brands.id, brandId))
        .limit(1);

      if (!brand) throw new Error(`Brand ${brandId} not found`);

      // Latest brand brief
      const [brief] = await db
        .select()
        .from(brandBriefs)
        .where(eq(brandBriefs.brandId, brandId))
        .orderBy(desc(brandBriefs.version))
        .limit(1);

      // Corpus matches via RPC (uses signal embedding to find similar brand corpus)
      let corpusContent = "";
      if (idea.signalId) {
        const corpusMatches = (await db.execute(
          sql`SELECT content, similarity FROM match_brand_corpus(
            (SELECT embedding FROM signals WHERE id = ${idea.signalId} LIMIT 1),
            ${brandId}::uuid,
            3
          )`,
        )) as unknown as Array<{ content: string; similarity: number }>;

        if (corpusMatches.length > 0) {
          corpusContent = corpusMatches
            .map((m, i) => `[${i + 1}] ${m.content}`)
            .join("\n\n");
        }
      }

      // Top 5 enabled anti-AI rules
      const rules = await db
        .select({ phrase: antiAiRules.phraseOrPattern })
        .from(antiAiRules)
        .where(
          and(
            eq(antiAiRules.workspaceId, workspaceId),
            eq(antiAiRules.enabled, true),
          ),
        )
        .limit(5);

      // Source content from signal
      let sourceContent = "";
      if (idea.signalId) {
        const [signal] = await db
          .select({ title: signals.title, body: signals.body })
          .from(signals)
          .where(eq(signals.id, idea.signalId))
          .limit(1);
        if (signal) {
          sourceContent = `${signal.title}\n\n${signal.body}`.slice(0, 2000);
        }
      }

      return {
        idea,
        brand,
        brief,
        corpusContent,
        rulesText: rules.map((r) => `- Avoid: "${r.phrase}"`).join("\n"),
        sourceContent,
      };
    });

    // Step 2: Fetch draft channel
    const draft = await step.run("fetch-draft", async () => {
      const [row] = await db
        .select({ id: drafts.id, channel: drafts.channel, format: drafts.format })
        .from(drafts)
        .where(eq(drafts.id, draftId))
        .limit(1);
      return row;
    });

    if (!draft) return { error: "draft_not_found" };

    // Step 3: Get or seed the prompt template
    const prompt = await step.run("fetch-prompt", async () => {
      return getOrSeedPrompt(workspaceId, "draft-generation");
    });

    // Step 4: Interpolate and generate
    const generation = await step.run("generate", async () => {
      const effectiveFormat = draft.format ?? format ?? "linkedin-long";
      const vars: Record<string, string> = {
        brand_name: context.brand.name,
        voice_traits: context.brief?.voiceTraits ?? "Professional, clear, concise",
        wedge: context.brief?.wedge ?? "",
        icp: context.brief?.icp ?? "",
        anti_ai_rules: context.rulesText || "None specified",
        channel: draft.channel,
        format: effectiveFormat,
        format_guidelines: FORMAT_GUIDELINES[effectiveFormat] ?? FORMAT_GUIDELINES["linkedin-long"],
        idea_hook: context.idea.hook,
        idea_angle: context.idea.angle,
        source_content: context.sourceContent || "No source content available",
        corpus_matches: context.corpusContent || "No corpus matches found",
      };

      const systemPrompt = interpolate(prompt.systemPrompt, vars);
      let userPrompt = interpolate(prompt.userPromptTemplate, vars);

      if (!prompt.userPromptTemplate.includes("{format_guidelines}")) {
        userPrompt += `\n\nFORMAT: ${vars.format_guidelines}\nFollow these format guidelines strictly for structure and length.`;
      }

      return callLLM({
        modelId,
        systemPrompt,
        userPrompt,
        workspaceId,
        brandId,
        draftId,
        traceId,
      });
    });

    // Step 5: Parse and save draft
    const parsed = await step.run("save-draft", async () => {
      const { title, body } = parseGeneratedDraft(generation.text);

      await db
        .update(drafts)
        .set({
          title,
          content: body,
          modelId: generation.model,
        })
        .where(eq(drafts.id, draftId));

      return { title, bodyLength: body.length };
    });

    return {
      draftId,
      title: parsed.title,
      tokens: generation.totalTokens,
      latencyMs: generation.latencyMs,
    };
  },
);
