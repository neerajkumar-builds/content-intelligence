import { db } from "@/db";
import { prompts } from "@/db/schema";
import { and, eq } from "drizzle-orm";

const DEFAULT_SYSTEM_PROMPT = `You are a content writer for {brand_name}.

VOICE:
{voice_traits}

POSITIONING:
Wedge: {wedge}
ICP: {icp}

RULES (never violate):
{anti_ai_rules}`;

const DEFAULT_USER_PROMPT_TEMPLATE = `Write a {channel} post based on this signal:

IDEA: {idea_hook}
ANGLE: {idea_angle}
SOURCE: {source_content}

BRAND CONTEXT (similar content from our corpus):
{corpus_matches}

Output format:
TITLE: (one compelling headline, no prefix)
BODY: (150-300 words, short paragraphs, conversational, no hashtags in body)`;

interface PromptResult {
  systemPrompt: string;
  userPromptTemplate: string;
}

/**
 * Get an existing prompt or seed the default one on first use.
 * The user prompt template is stored in the `variables` jsonb array
 * as a special entry with name="user_prompt_template".
 */
export async function getOrSeedPrompt(
  workspaceId: string,
  slug: string,
): Promise<PromptResult> {
  // Check if prompt already exists for this workspace
  const [existing] = await db
    .select()
    .from(prompts)
    .where(
      and(
        eq(prompts.workspaceId, workspaceId),
        eq(prompts.slug, slug),
        eq(prompts.isActive, true),
      ),
    )
    .limit(1);

  if (existing) {
    const vars = existing.variables as Array<{
      name: string;
      description?: string;
      required?: boolean;
    }>;
    const templateEntry = vars.find((v) => v.name === "user_prompt_template");
    return {
      systemPrompt: existing.systemPrompt,
      userPromptTemplate: templateEntry?.description ?? DEFAULT_USER_PROMPT_TEMPLATE,
    };
  }

  // Seed the default prompt
  const variables = [
    { name: "user_prompt_template", description: DEFAULT_USER_PROMPT_TEMPLATE },
    { name: "brand_name", description: "Brand name", required: true },
    { name: "voice_traits", description: "Voice traits from brand brief", required: true },
    { name: "wedge", description: "Brand wedge/positioning", required: true },
    { name: "icp", description: "Ideal customer profile", required: true },
    { name: "anti_ai_rules", description: "Anti-AI rules to enforce", required: true },
    { name: "channel", description: "Target channel (e.g. linkedin, twitter)", required: true },
    { name: "idea_hook", description: "Idea hook/headline", required: true },
    { name: "idea_angle", description: "Idea angle/perspective", required: true },
    { name: "source_content", description: "Source signal content", required: true },
    { name: "corpus_matches", description: "Similar brand corpus content", required: false },
  ];

  const [inserted] = await db
    .insert(prompts)
    .values({
      workspaceId,
      name: "Draft Generation",
      slug,
      systemPrompt: DEFAULT_SYSTEM_PROMPT,
      variables,
      version: 1,
      isActive: true,
    })
    .returning();

  const insertedVars = inserted.variables as Array<{
    name: string;
    description?: string;
  }>;
  const templateEntry = insertedVars.find((v) => v.name === "user_prompt_template");

  return {
    systemPrompt: inserted.systemPrompt,
    userPromptTemplate: templateEntry?.description ?? DEFAULT_USER_PROMPT_TEMPLATE,
  };
}

/**
 * Simple template interpolation: replaces {key} with value.
 */
export function interpolate(
  template: string,
  vars: Record<string, string>,
): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => {
    return vars[key] ?? match;
  });
}
