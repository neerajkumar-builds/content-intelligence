# Vertical Slice: Idea → Draft → Publish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first complete content creation flow — user clicks "Generate" on an idea, AI writes a draft, user edits/approves, publishes to LinkedIn.

**Architecture:** Inngest background generation (Gemini 2.0 Flash). DB-stored configurable prompts. LinkedIn adapter via existing ConnectorAdapter interface. Draft CRUD extends existing drafts router.

**Tech Stack:** Next.js 15, tRPC v11, Inngest v4, Google Generative AI SDK, Drizzle ORM, Tailwind CSS

---

## File Map

### New Files
| File | Responsibility |
|------|---------------|
| `src/server/inngest/functions/generate-draft.ts` | Inngest function: fetch context → read prompt → call LLM → save draft |
| `src/lib/connectors/adapters/linkedin.ts` | LinkedIn ConnectorAdapter implementation (text-only publish) |
| `src/app/(app)/drafts/[id]/page.tsx` | Draft editor page (edit, approve, publish) |
| `src/lib/ai/generate.ts` | LLM call utility (Gemini 2.0 Flash, glass-box logged) |
| `src/lib/prompts/seed.ts` | Seed default prompt on first use |

### Modified Files
| File | Change |
|------|--------|
| `src/server/routers/drafts.ts` | Add generate, create, update, approve mutations |
| `src/server/inngest/events.ts` | Add DraftGenerate event |
| `src/server/inngest/functions/index.ts` | Register generateDraftFn |
| `src/server/inngest/functions/publish-post.ts` | Wire token decrypt (replace placeholder) |
| `src/app/(app)/ideas/page.tsx` | Wire Generate button → drafts.generate → redirect |
| `src/app/(app)/drafts/page.tsx` | Replace stub with drafts list |
| `src/app/(app)/prompts/page.tsx` | Replace stub with Prompt Studio |
| `src/lib/connectors/registry.ts` | Register LinkedIn adapter |

---

## Phase A: Backend (Draft CRUD + AI Generation)

### Task A1: Add draft mutations to drafts router

**Files:**
- Modify: `src/server/routers/drafts.ts`

- [ ] **Step 1: Add generate mutation**

Add after the `getPublishStatus` query in `src/server/routers/drafts.ts`. This mutation creates a draft row and fires an Inngest event for background AI generation.

```typescript
// Add these imports at the top of drafts.ts (merge with existing imports)
import { inngest } from "../inngest/client";
import { DraftGenerate } from "../inngest/events";
import { ideas } from "@/db/schema";

// Add after getPublishStatus query:

  generate: protectedProcedure
    .input(
      z.object({
        ideaId: z.string().uuid(),
        brandId: z.string().uuid(),
        channel: z.string().default("linkedin"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { db, workspaceId, scopeAnd } = ctx.scoped;

      const [idea] = await db
        .select()
        .from(ideas)
        .where(scopeAnd(ideas.workspaceId, eq(ideas.id, input.ideaId)))
        .limit(1);

      if (!idea) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Idea not found" });
      }

      const [draft] = await db
        .insert(drafts)
        .values({
          workspaceId,
          brandId: input.brandId,
          ideaId: input.ideaId,
          title: idea.hook,
          content: "",
          channel: input.channel,
          status: "draft",
        })
        .returning({ id: drafts.id });

      await inngest
        .send(
          DraftGenerate.create({
            draftId: draft.id,
            ideaId: input.ideaId,
            brandId: input.brandId,
            workspaceId,
          }),
        )
        .catch(() => {});

      return { draftId: draft.id };
    }),
```

- [ ] **Step 2: Add create mutation (manual draft, no AI)**

```typescript
  create: protectedProcedure
    .input(
      z.object({
        brandId: z.string().uuid(),
        title: z.string().min(1).max(500),
        content: z.string().min(1),
        channel: z.string().default("linkedin"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { db, workspaceId } = ctx.scoped;

      const [draft] = await db
        .insert(drafts)
        .values({
          workspaceId,
          brandId: input.brandId,
          title: input.title,
          content: input.content,
          channel: input.channel,
          status: "draft",
        })
        .returning({ id: drafts.id });

      return { draftId: draft.id };
    }),
```

- [ ] **Step 3: Add update mutation**

```typescript
  update: protectedProcedure
    .input(
      z.object({
        draftId: z.string().uuid(),
        title: z.string().max(500).optional(),
        content: z.string().optional(),
        channel: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { db, scopeAnd } = ctx.scoped;

      const [draft] = await db
        .select({ id: drafts.id, status: drafts.status })
        .from(drafts)
        .where(scopeAnd(drafts.workspaceId, eq(drafts.id, input.draftId)))
        .limit(1);

      if (!draft) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Draft not found" });
      }
      if (draft.status !== "draft") {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: `Cannot edit draft in "${draft.status}" status`,
        });
      }

      const updates: Record<string, unknown> = {};
      if (input.title !== undefined) updates.title = input.title;
      if (input.content !== undefined) updates.content = input.content;
      if (input.channel !== undefined) updates.channel = input.channel;

      const [updated] = await db
        .update(drafts)
        .set(updates)
        .where(eq(drafts.id, input.draftId))
        .returning();

      return updated;
    }),
```

- [ ] **Step 4: Add approve mutation**

```typescript
  approve: protectedProcedure
    .input(z.object({ draftId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { db, scopeAnd } = ctx.scoped;

      const [draft] = await db
        .select({ id: drafts.id, status: drafts.status, content: drafts.content })
        .from(drafts)
        .where(scopeAnd(drafts.workspaceId, eq(drafts.id, input.draftId)))
        .limit(1);

      if (!draft) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Draft not found" });
      }
      if (draft.status !== "draft") {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: `Cannot approve draft in "${draft.status}" status`,
        });
      }
      if (!draft.content) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Cannot approve draft with empty content",
        });
      }

      const [updated] = await db
        .update(drafts)
        .set({ status: "approved" })
        .where(eq(drafts.id, input.draftId))
        .returning();

      return updated;
    }),
```

- [ ] **Step 5: Verify build**

Run: `npx tsc --noEmit`
Expected: zero errors

- [ ] **Step 6: Commit**

```bash
git add src/server/routers/drafts.ts
git commit -m "feat(drafts): add generate, create, update, approve mutations"
```

---

### Task A2: Add DraftGenerate Inngest event

**Files:**
- Modify: `src/server/inngest/events.ts`

- [ ] **Step 1: Add DraftGenerate event**

Add after the `TokenRefreshDue` event in `src/server/inngest/events.ts`:

```typescript
export const DraftGenerate = eventType(
  "content-intelligence/draft.generate",
  {
    schema: z.object({
      draftId: z.string().uuid(),
      ideaId: z.string().uuid(),
      brandId: z.string().uuid(),
      workspaceId: z.string().uuid(),
    }),
  },
);
```

- [ ] **Step 2: Verify build**

Run: `npx tsc --noEmit`
Expected: zero errors

- [ ] **Step 3: Commit**

```bash
git add src/server/inngest/events.ts
git commit -m "feat(inngest): add DraftGenerate event"
```

---

### Task A3: Create LLM generation utility

**Files:**
- Create: `src/lib/ai/generate.ts`

- [ ] **Step 1: Create generate.ts**

This utility calls Gemini 2.0 Flash and logs the call to ai_calls table (glass-box).

```typescript
import { db } from "@/db";
import { aiCalls } from "@/db/schema";

const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

interface GenerateOptions {
  systemPrompt: string;
  userPrompt: string;
  workspaceId: string;
  brandId?: string;
  draftId?: string;
  traceId: string;
}

interface GenerateResult {
  text: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  latencyMs: number;
}

export async function generateText(opts: GenerateOptions): Promise<GenerateResult> {
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) throw new Error("GOOGLE_AI_API_KEY not set");

  const startMs = Date.now();

  const res = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: opts.systemPrompt }] },
      contents: [{ parts: [{ text: opts.userPrompt }] }],
      generationConfig: {
        temperature: 0.8,
        maxOutputTokens: 2048,
      },
    }),
  });

  const latencyMs = Date.now() - startMs;

  if (!res.ok) {
    const errBody = await res.text();
    await logAiCall(opts, {
      status: "error",
      latencyMs,
      errorCode: `HTTP_${res.status}`,
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
    });
    throw new Error(`Gemini API error ${res.status}: ${errBody}`);
  }

  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  const usage = data.usageMetadata ?? {};
  const promptTokens = usage.promptTokenCount ?? 0;
  const completionTokens = usage.candidatesTokenCount ?? 0;
  const totalTokens = usage.totalTokenCount ?? 0;

  await logAiCall(opts, {
    status: "success",
    latencyMs,
    promptTokens,
    completionTokens,
    totalTokens,
    errorCode: null,
  });

  return { text, promptTokens, completionTokens, totalTokens, latencyMs };
}

async function logAiCall(
  opts: GenerateOptions,
  result: {
    status: string;
    latencyMs: number;
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    errorCode?: string | null;
  },
): Promise<void> {
  const costCents = Math.ceil(
    (result.promptTokens * 0.075 + result.completionTokens * 0.3) / 1_000_000 * 100,
  );

  await db
    .insert(aiCalls)
    .values({
      workspaceId: opts.workspaceId,
      brandId: opts.brandId ?? null,
      draftId: opts.draftId ?? null,
      taskType: "generation",
      model: "gemini-2.0-flash",
      provider: "google",
      promptHash: "",
      promptTokens: result.promptTokens,
      completionTokens: result.completionTokens,
      totalTokens: result.totalTokens,
      costCents,
      latencyMs: result.latencyMs,
      status: result.status,
      errorCode: result.errorCode ?? null,
      traceId: opts.traceId,
    })
    .catch(() => {});
}
```

- [ ] **Step 2: Verify build**

Run: `npx tsc --noEmit`
Expected: zero errors (may need to check aiCalls column names match schema)

- [ ] **Step 3: Commit**

```bash
git add src/lib/ai/generate.ts
git commit -m "feat(ai): add Gemini 2.0 Flash text generation with glass-box logging"
```

---

### Task A4: Create prompt seed utility

**Files:**
- Create: `src/lib/prompts/seed.ts`

- [ ] **Step 1: Create seed.ts**

Seeds the default draft-generation prompt into the prompts table on first use.

```typescript
import { db } from "@/db";
import { prompts } from "@/db/schema";
import { eq, and } from "drizzle-orm";

const DEFAULT_SYSTEM_PROMPT = `You are a content writer for {brand_name}.

VOICE:
{voice_traits}

POSITIONING:
Wedge: {wedge}
ICP: {icp}

RULES (never violate):
{anti_ai_rules}`;

const DEFAULT_USER_PROMPT = `Write a {channel} post based on this signal:

IDEA: {idea_hook}
ANGLE: {idea_angle}
SOURCE: {source_content}

BRAND CONTEXT (similar content from our corpus):
{corpus_matches}

Output format:
TITLE: (one compelling headline, no prefix)
BODY: (150-300 words, short paragraphs, conversational, no hashtags in body)`;

const VARIABLES = [
  { name: "brand_name", description: "Brand name", required: true },
  { name: "voice_traits", description: "Voice traits from brand brief", required: true },
  { name: "wedge", description: "Brand wedge/positioning", required: true },
  { name: "icp", description: "Ideal customer profile", required: true },
  { name: "anti_ai_rules", description: "Top anti-AI rules summary", required: false },
  { name: "idea_hook", description: "Idea headline/hook", required: true },
  { name: "idea_angle", description: "Idea angle", required: true },
  { name: "source_content", description: "Original signal content (truncated)", required: false },
  { name: "corpus_matches", description: "Top corpus similarity matches", required: false },
  { name: "channel", description: "Target platform (linkedin, twitter, etc.)", required: true },
  { name: "user_prompt_template", description: "User prompt template (internal)", required: false },
];

export async function getOrSeedPrompt(
  workspaceId: string,
  slug: string,
): Promise<{ systemPrompt: string; userPromptTemplate: string }> {
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
    .orderBy(prompts.version)
    .limit(1);

  if (existing) {
    const vars = existing.variables as Array<{ name: string; description?: string }>;
    const userTpl = vars.find((v) => v.name === "user_prompt_template");
    return {
      systemPrompt: existing.systemPrompt,
      userPromptTemplate: (userTpl?.description as string) ?? DEFAULT_USER_PROMPT,
    };
  }

  const varsWithTemplate = [
    ...VARIABLES.map((v) =>
      v.name === "user_prompt_template"
        ? { ...v, description: DEFAULT_USER_PROMPT }
        : v,
    ),
  ];

  await db.insert(prompts).values({
    workspaceId,
    name: "Draft Generation",
    slug,
    systemPrompt: DEFAULT_SYSTEM_PROMPT,
    variables: varsWithTemplate,
    version: 1,
    isActive: true,
  });

  return {
    systemPrompt: DEFAULT_SYSTEM_PROMPT,
    userPromptTemplate: DEFAULT_USER_PROMPT,
  };
}

export function interpolate(
  template: string,
  vars: Record<string, string>,
): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? "");
}
```

- [ ] **Step 2: Verify build**

Run: `npx tsc --noEmit`
Expected: zero errors

- [ ] **Step 3: Commit**

```bash
git add src/lib/prompts/seed.ts
git commit -m "feat(prompts): add prompt seed utility with default draft-generation template"
```

---

### Task A5: Create generate-draft Inngest function

**Files:**
- Create: `src/server/inngest/functions/generate-draft.ts`
- Modify: `src/server/inngest/functions/index.ts`

- [ ] **Step 1: Create generate-draft.ts**

```typescript
import { inngest } from "../client";
import { DraftGenerate } from "../events";
import { db } from "@/db";
import { drafts, ideas, brands, brandBriefs, brandCorpus, antiAiRules } from "@/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { generateText } from "@/lib/ai/generate";
import { getOrSeedPrompt, interpolate } from "@/lib/prompts/seed";

export const generateDraftFn = inngest.createFunction(
  {
    id: "generate-draft",
    concurrency: [
      {
        scope: "account",
        key: "generate-{{ event.data.workspaceId }}",
        limit: 3,
      },
    ],
    retries: 2,
    triggers: [{ event: DraftGenerate }],
  },
  async ({ event, step }) => {
    const { draftId, ideaId, brandId, workspaceId } = event.data;

    const context = await step.run("fetch-context", async () => {
      const [idea] = await db
        .select()
        .from(ideas)
        .where(eq(ideas.id, ideaId))
        .limit(1);

      const [brand] = await db
        .select()
        .from(brands)
        .where(eq(brands.id, brandId))
        .limit(1);

      const [brief] = await db
        .select()
        .from(brandBriefs)
        .where(eq(brandBriefs.brandId, brandId))
        .orderBy(desc(brandBriefs.version))
        .limit(1);

      const corpusMatches = await db.execute(
        sql`SELECT content, similarity FROM match_brand_corpus(
          (SELECT embedding FROM signals WHERE id = ${idea?.signalId} LIMIT 1),
          ${brandId}::uuid,
          3
        )`,
      ) as unknown as Array<{ content: string; similarity: number }>;

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

      return {
        idea,
        brand,
        brief,
        corpusMatches: corpusMatches ?? [],
        rules,
      };
    });

    if (!context.idea || !context.brand) {
      return { error: "idea_or_brand_not_found" };
    }

    const [draft] = await step.run("fetch-draft", async () => {
      return db
        .select({ channel: drafts.channel })
        .from(drafts)
        .where(eq(drafts.id, draftId))
        .limit(1);
    });

    const channel = draft?.channel ?? "linkedin";

    const promptTemplates = await step.run("fetch-prompt", async () => {
      return getOrSeedPrompt(workspaceId, "draft-generation");
    });

    const vars: Record<string, string> = {
      brand_name: context.brand.name,
      voice_traits: context.brief?.voiceTraits ?? "",
      wedge: context.brief?.wedge ?? "",
      icp: context.brief?.icp ?? "",
      anti_ai_rules: context.rules.map((r) => `- Do not use: "${r.phrase}"`).join("\n"),
      idea_hook: context.idea.hook,
      idea_angle: context.idea.angle ?? "",
      source_content: (context.idea as Record<string, unknown>).sourceCitation as string ?? "",
      corpus_matches: context.corpusMatches
        .map((m) => `[${Number(m.similarity).toFixed(2)}] ${m.content.slice(0, 200)}`)
        .join("\n\n"),
      channel,
    };

    const systemPrompt = interpolate(promptTemplates.systemPrompt, vars);
    const userPrompt = interpolate(promptTemplates.userPromptTemplate, vars);

    const result = await step.run("generate", async () => {
      return generateText({
        systemPrompt,
        userPrompt,
        workspaceId,
        brandId,
        draftId,
        traceId: `gen_${draftId}_${Date.now()}`,
      });
    });

    const parsed = parseGeneratedDraft(result.text);

    await step.run("save-draft", async () => {
      await db
        .update(drafts)
        .set({
          title: parsed.title,
          content: parsed.body,
        })
        .where(eq(drafts.id, draftId));
    });

    return {
      draftId,
      title: parsed.title,
      tokens: result.totalTokens,
      latencyMs: result.latencyMs,
    };
  },
);

function parseGeneratedDraft(text: string): { title: string; body: string } {
  const titleMatch = text.match(/TITLE:\s*(.+)/i);
  const bodyMatch = text.match(/BODY:\s*([\s\S]+)/i);

  if (titleMatch && bodyMatch) {
    return {
      title: titleMatch[1].trim(),
      body: bodyMatch[1].trim(),
    };
  }

  const lines = text.split("\n").filter((l) => l.trim());
  return {
    title: lines[0]?.trim() ?? "Untitled Draft",
    body: lines.slice(1).join("\n").trim() || text.trim(),
  };
}
```

- [ ] **Step 2: Register in functions/index.ts**

Add to `src/server/inngest/functions/index.ts`:

```typescript
import { generateDraftFn } from "./generate-draft";

// Add to the functions array:
export const functions = [
  corpusBackfillFn,
  corpusEmbedItemFn,
  processSignalFn,
  publishPostFn,
  verifyPostFn,
  generateDraftFn,
];
```

- [ ] **Step 3: Verify build**

Run: `npx tsc --noEmit`
Expected: zero errors

- [ ] **Step 4: Commit**

```bash
git add src/server/inngest/functions/generate-draft.ts src/server/inngest/functions/index.ts
git commit -m "feat(inngest): add generate-draft function with Gemini 2.0 Flash"
```

---

### Task A6: Wire Generate button on Idea Wall

**Files:**
- Modify: `src/app/(app)/ideas/page.tsx`

- [ ] **Step 1: Wire handleGenerate to drafts.generate mutation**

Replace the `handleGenerate` function in `src/app/(app)/ideas/page.tsx`:

```typescript
// Add import at top:
import { useRouter } from "next/navigation";

// Inside the component, add:
const router = useRouter();

const generateMut = trpc.drafts.generate.useMutation({
  onSuccess: (data) => {
    toast.success("Generating draft...");
    router.push(`/drafts/${data.draftId}`);
  },
  onError: (err) => {
    toast.error(err.message);
  },
});

// Replace handleGenerate:
function handleGenerate(ideaId: string) {
  const idea = items.find((i) => i.id === ideaId);
  if (!idea) return;
  generateMut.mutate({
    ideaId,
    brandId: idea.brandId,
    channel: "linkedin",
  });
}
```

- [ ] **Step 2: Verify build**

Run: `npx tsc --noEmit`
Expected: zero errors

- [ ] **Step 3: Test in browser via Playwright**

Navigate to localhost:3000/ideas, verify Generate button is wired (should redirect to /drafts/{id}).

- [ ] **Step 4: Commit**

```bash
git add src/app/(app)/ideas/page.tsx
git commit -m "feat(ideas): wire Generate button to draft generation + redirect"
```

---

## Phase A Checkpoint

Run: `pnpm build`
Expected: zero errors, all routes compile

Verify:
- [ ] drafts.generate creates a draft row with empty content
- [ ] DraftGenerate Inngest event fires
- [ ] generate-draft Inngest function completes (check Inngest dev dashboard)
- [ ] Draft content filled by LLM
- [ ] ai_calls row logged with model/tokens/cost
- [ ] Generate button redirects to /drafts/{draftId}

---

## Phase B: Drafts UI

### Task B1: Drafts list page (replace stub)

**Files:**
- Modify: `src/app/(app)/drafts/page.tsx`

- [ ] **Step 1: Replace stub with real drafts list**

Replace the entire content of `src/app/(app)/drafts/page.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  draft: { bg: "rgba(99,102,241,0.1)", color: "#6366f1" },
  approved: { bg: "rgba(34,197,94,0.1)", color: "#16a34a" },
  publishing: { bg: "rgba(251,191,36,0.1)", color: "#d97706" },
  live: { bg: "rgba(34,197,94,0.15)", color: "#15803d" },
  failed: { bg: "rgba(239,68,68,0.1)", color: "#dc2626" },
};

export default function DraftsPage() {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data, isLoading } = trpc.drafts.list.useQuery(
    statusFilter === "all"
      ? { limit: 50 }
      : { status: statusFilter as "draft" | "approved" | "live" | "failed", limit: 50 },
  );

  const items = data?.items ?? [];

  return (
    <div style={{ padding: "24px 32px", maxWidth: 960 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 600 }}>Drafts</h2>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--ink-tertiary)" }}>
            {items.length} drafts
          </p>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {["all", "draft", "approved", "live", "failed"].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              style={{
                padding: "4px 10px",
                fontSize: 11,
                borderRadius: 5,
                border: statusFilter === s ? "1.5px solid var(--accent)" : "1px solid var(--border-subtle)",
                background: statusFilter === s ? "rgba(99,102,241,0.08)" : "transparent",
                color: statusFilter === s ? "var(--accent)" : "var(--ink-secondary)",
                cursor: "pointer",
                fontWeight: 500,
                textTransform: "capitalize",
              }}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} style={{ height: 80, borderRadius: 8, background: "var(--bg-muted)", animation: "pulse 1.5s ease-in-out infinite" }} />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div style={{ textAlign: "center", padding: "80px 20px" }}>
          <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.3 }}>&#9998;</div>
          <h3 style={{ margin: "0 0 8px", fontSize: 18, fontWeight: 600 }}>No drafts yet</h3>
          <p style={{ fontSize: 13, color: "var(--ink-tertiary)" }}>
            Go to the Idea Wall and click "Generate" on an idea to create your first draft.
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {items.map((draft) => {
            const sc = STATUS_COLORS[draft.status] ?? STATUS_COLORS.draft;
            return (
              <div
                key={draft.id}
                onClick={() => router.push(`/drafts/${draft.id}`)}
                style={{
                  padding: "14px 18px",
                  borderRadius: 8,
                  border: "1px solid var(--border-subtle)",
                  background: "var(--bg-surface)",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {draft.title || (draft.content ? draft.content.slice(0, 60) + "..." : "Generating...")}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--ink-tertiary)", marginTop: 3 }}>
                    {draft.channel} &middot; v{draft.version} &middot; {new Date(draft.createdAt).toLocaleDateString()}
                  </div>
                </div>
                <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 10, background: sc.bg, color: sc.color, textTransform: "uppercase" }}>
                  {draft.status}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify build + test in browser**

Run: `npx tsc --noEmit`
Navigate to localhost:3000/drafts — should show list or empty state.

- [ ] **Step 3: Commit**

```bash
git add src/app/(app)/drafts/page.tsx
git commit -m "feat(drafts): replace stub with real drafts list page"
```

---

### Task B2: Draft editor page

**Files:**
- Create: `src/app/(app)/drafts/[id]/page.tsx`

- [ ] **Step 1: Create the editor page**

```bash
mkdir -p "src/app/(app)/drafts/[id]"
```

Create `src/app/(app)/drafts/[id]/page.tsx`:

```tsx
"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";

export default function DraftEditorPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const utils = trpc.useUtils();

  const { data: draft, isLoading } = trpc.drafts.get.useQuery(
    { draftId: id },
    { refetchInterval: (query) => {
      const d = query.state.data;
      if (!d || !d.content) return 3000;
      return false;
    }},
  );

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (draft && !dirty) {
      setTitle(draft.title ?? "");
      setContent(draft.content ?? "");
    }
  }, [draft, dirty]);

  const updateMut = trpc.drafts.update.useMutation({
    onSuccess: () => {
      toast.success("Draft saved");
      setDirty(false);
      void utils.drafts.get.invalidate({ draftId: id });
    },
    onError: (err) => toast.error(err.message),
  });

  const approveMut = trpc.drafts.approve.useMutation({
    onSuccess: () => {
      toast.success("Draft approved");
      void utils.drafts.get.invalidate({ draftId: id });
    },
    onError: (err) => toast.error(err.message),
  });

  const publishMut = trpc.drafts.publish.useMutation({
    onSuccess: () => {
      toast.success("Publishing to LinkedIn...");
      void utils.drafts.getPublishStatus.invalidate({ draftId: id });
    },
    onError: (err) => toast.error(err.message),
  });

  const { data: publishStatus } = trpc.drafts.getPublishStatus.useQuery(
    { draftId: id },
    { refetchInterval: (query) => {
      const posts = query.state.data?.posts ?? [];
      const hasActive = posts.some((p) => p.status === "publishing");
      return hasActive ? 3000 : false;
    }},
  );

  if (isLoading) {
    return (
      <div style={{ padding: "24px 32px" }}>
        <div style={{ height: 40, width: 300, background: "var(--bg-muted)", borderRadius: 6, marginBottom: 16, animation: "pulse 1.5s ease-in-out infinite" }} />
        <div style={{ height: 300, background: "var(--bg-muted)", borderRadius: 8, animation: "pulse 1.5s ease-in-out infinite" }} />
      </div>
    );
  }

  if (!draft) {
    return <div style={{ padding: "24px 32px" }}>Draft not found.</div>;
  }

  const isGenerating = !draft.content;
  const canEdit = draft.status === "draft" && !isGenerating;
  const canApprove = draft.status === "draft" && !!draft.content;
  const canPublish = draft.status === "approved";
  const posts = publishStatus?.posts ?? [];
  const livePost = posts.find((p) => p.status === "live");
  const publishingPost = posts.find((p) => p.status === "publishing");

  const charCount = content.length;
  const charLimit = draft.channel === "linkedin" ? 3000 : draft.channel === "twitter" ? 280 : null;

  return (
    <div style={{ display: "flex", height: "100%", minHeight: 0 }}>
      {/* Main editor */}
      <div style={{ flex: 1, padding: "24px 32px", overflowY: "auto" }}>
        <button
          onClick={() => router.push("/drafts")}
          style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ink-tertiary)", fontSize: 12, marginBottom: 16, padding: 0 }}
        >
          &larr; Back to drafts
        </button>

        {isGenerating ? (
          <div style={{ textAlign: "center", padding: "80px 20px" }}>
            <div style={{ fontSize: 32, marginBottom: 16, animation: "pulse 1.5s ease-in-out infinite" }}>&#10022;</div>
            <h3 style={{ margin: "0 0 8px", fontSize: 18, fontWeight: 600 }}>AI is generating your draft...</h3>
            <p style={{ fontSize: 13, color: "var(--ink-tertiary)" }}>
              This usually takes 5-15 seconds. The page will update automatically.
            </p>
          </div>
        ) : (
          <>
            <input
              value={title}
              onChange={(e) => { setTitle(e.target.value); setDirty(true); }}
              disabled={!canEdit}
              placeholder="Draft title"
              style={{
                width: "100%",
                fontSize: 22,
                fontWeight: 600,
                border: "none",
                outline: "none",
                background: "transparent",
                color: "var(--ink-primary)",
                marginBottom: 16,
                padding: 0,
              }}
            />
            <textarea
              value={content}
              onChange={(e) => { setContent(e.target.value); setDirty(true); }}
              disabled={!canEdit}
              placeholder="Write your content..."
              style={{
                width: "100%",
                minHeight: 400,
                fontSize: 15,
                lineHeight: 1.7,
                border: "1px solid var(--border-subtle)",
                borderRadius: 8,
                padding: 16,
                background: "var(--bg-surface)",
                color: "var(--ink-primary)",
                outline: "none",
                resize: "vertical",
                fontFamily: "var(--font-body, inherit)",
              }}
            />
          </>
        )}

        {/* Action bar */}
        {!isGenerating && (
          <div style={{ display: "flex", gap: 8, marginTop: 16, alignItems: "center" }}>
            {canEdit && (
              <button
                onClick={() => updateMut.mutate({ draftId: id, title, content })}
                disabled={!dirty || updateMut.isPending}
                style={{
                  padding: "8px 16px", fontSize: 12, fontWeight: 600, borderRadius: 6,
                  border: "1px solid var(--border-subtle)", background: "var(--bg-surface)",
                  color: "var(--ink-primary)", cursor: dirty ? "pointer" : "default",
                  opacity: dirty ? 1 : 0.5,
                }}
              >
                {updateMut.isPending ? "Saving..." : "Save"}
              </button>
            )}
            {canApprove && (
              <button
                onClick={() => approveMut.mutate({ draftId: id })}
                disabled={approveMut.isPending}
                style={{
                  padding: "8px 16px", fontSize: 12, fontWeight: 600, borderRadius: 6,
                  border: "none", background: "#16a34a", color: "white", cursor: "pointer",
                }}
              >
                {approveMut.isPending ? "Approving..." : "Approve"}
              </button>
            )}
            {canPublish && (
              <button
                onClick={() => {
                  toast.info("LinkedIn connector required — wire in Phase C");
                }}
                disabled={publishMut.isPending}
                style={{
                  padding: "8px 16px", fontSize: 12, fontWeight: 600, borderRadius: 6,
                  border: "none", background: "#0a66c2", color: "white", cursor: "pointer",
                }}
              >
                {publishMut.isPending ? "Publishing..." : "Publish to LinkedIn"}
              </button>
            )}
            {livePost && (
              <a
                href={livePost.platformPostUrl ?? "#"}
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontSize: 12, color: "#16a34a", fontWeight: 600, textDecoration: "underline" }}
              >
                Live on LinkedIn &rarr;
              </a>
            )}
            {publishingPost && !livePost && (
              <span style={{ fontSize: 12, color: "#d97706" }}>Publishing...</span>
            )}
          </div>
        )}
      </div>

      {/* Side panel */}
      <aside style={{ width: 260, flexShrink: 0, borderLeft: "1px solid var(--border-subtle)", padding: 16, overflowY: "auto", background: "var(--bg-canvas)" }}>
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", color: "var(--ink-tertiary)", marginBottom: 4 }}>Status</div>
          <span style={{
            fontSize: 12, fontWeight: 600, padding: "3px 10px", borderRadius: 10,
            background: draft.status === "approved" ? "rgba(34,197,94,0.1)" : "rgba(99,102,241,0.1)",
            color: draft.status === "approved" ? "#16a34a" : "#6366f1",
            textTransform: "uppercase",
          }}>
            {isGenerating ? "generating" : draft.status}
          </span>
        </div>

        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", color: "var(--ink-tertiary)", marginBottom: 4 }}>Channel</div>
          <div style={{ fontSize: 13 }}>{draft.channel}</div>
        </div>

        {charLimit && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", color: "var(--ink-tertiary)", marginBottom: 4 }}>Characters</div>
            <div style={{ fontSize: 13, fontFamily: "var(--font-mono)", color: charCount > charLimit ? "#dc2626" : "var(--ink-primary)" }}>
              {charCount} / {charLimit}
            </div>
          </div>
        )}

        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", color: "var(--ink-tertiary)", marginBottom: 4 }}>Version</div>
          <div style={{ fontSize: 13 }}>v{draft.version}</div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", color: "var(--ink-tertiary)", marginBottom: 4 }}>Created</div>
          <div style={{ fontSize: 12, color: "var(--ink-secondary)" }}>{new Date(draft.createdAt).toLocaleString()}</div>
        </div>
      </aside>
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `npx tsc --noEmit`
Expected: zero errors

- [ ] **Step 3: Test in browser**

Navigate to localhost:3000/ideas → click Generate on an idea → should redirect to /drafts/{id} → show "Generating..." → content appears after Inngest function runs.

- [ ] **Step 4: Commit**

```bash
git add "src/app/(app)/drafts/[id]/page.tsx"
git commit -m "feat(drafts): add draft editor page with edit, approve, publish flow"
```

---

## Phase B Checkpoint

Run: `pnpm build`
Expected: zero errors

Browser test flow:
- [ ] Idea Wall → click Generate → redirects to /drafts/{id}
- [ ] Draft editor shows "Generating..." skeleton
- [ ] After 5-15s, content appears (poll refreshes)
- [ ] Edit title + body → click Save → changes persist
- [ ] Click Approve → status changes to "approved"
- [ ] /drafts list shows all drafts with correct status badges
- [ ] Verify in Supabase: drafts row, ai_calls row, prompts row

---

## Phase C: LinkedIn Adapter + Token Wiring

### Task C1: LinkedIn adapter implementation

**Files:**
- Create: `src/lib/connectors/adapters/linkedin.ts`
- Modify: `src/lib/connectors/registry.ts`

- [ ] **Step 1: Create LinkedIn adapter**

```typescript
import { Platform } from "@/lib/platforms";
import { BaseAdapter } from "../adapter";
import type {
  PublishInput,
  PublishResult,
  VerifyResult,
  HealthResult,
  TokenResult,
  OAuthCredential,
  AuthMethod,
} from "../types";
import { AppError, ErrorCodes } from "@/lib/errors/app-error";

const LINKEDIN_API = "https://api.linkedin.com";
const LINKEDIN_VERSION = "202604";

export class LinkedInAdapter extends BaseAdapter {
  readonly platform = Platform.LinkedIn;
  readonly supportsPublish = true;
  readonly supportsDelete = true;
  readonly authMethod: AuthMethod = "oauth2";

  async publish(
    input: PublishInput,
    token: string,
    idempotencyKey: string,
  ): Promise<PublishResult> {
    if (input.platform !== "linkedin") {
      throw new AppError({
        code: ErrorCodes.VALIDATION_ERROR,
        message: "Input is not for LinkedIn",
        errorClass: "permanent",
        retryable: false,
        platform: this.platform,
        httpStatus: null,
      });
    }

    const body = {
      author: input.authorUrn,
      commentary: input.commentary,
      visibility: input.visibility,
      distribution: {
        feedDistribution: "MAIN_FEED",
        targetEntities: [],
        thirdPartyDistributionChannels: [],
      },
      lifecycleState: "PUBLISHED",
    };

    const res = await fetch(`${LINKEDIN_API}/rest/posts`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "LinkedIn-Version": LINKEDIN_VERSION,
        "X-Restli-Protocol-Version": "2.0.0",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      throw this.mapError(res.status, errBody);
    }

    const postUrn = res.headers.get("x-restli-id") ?? null;

    return {
      success: true,
      platform: this.platform,
      platformPostId: postUrn,
      platformUrl: postUrn
        ? `https://www.linkedin.com/feed/update/${postUrn}`
        : null,
      publishedAt: new Date(),
      idempotencyKey,
      raw: { postUrn },
    };
  }

  async verify(platformPostId: string, token: string): Promise<VerifyResult> {
    const res = await fetch(
      `${LINKEDIN_API}/rest/posts/${encodeURIComponent(platformPostId)}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "LinkedIn-Version": LINKEDIN_VERSION,
        },
      },
    );

    return {
      exists: res.ok,
      visible: res.ok,
      platformPostId,
      checkedAt: new Date(),
    };
  }

  async deletePost(platformPostId: string, token: string): Promise<void> {
    await fetch(
      `${LINKEDIN_API}/rest/posts/${encodeURIComponent(platformPostId)}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "LinkedIn-Version": LINKEDIN_VERSION,
        },
      },
    );
  }

  async refreshToken(credential: OAuthCredential): Promise<TokenResult> {
    if (!credential.refreshToken) {
      throw new AppError({
        code: ErrorCodes.TOKEN_REFRESH_FAILED,
        message: "No refresh token available",
        errorClass: "permanent",
        retryable: false,
        platform: this.platform,
        httpStatus: null,
      });
    }

    const params = new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: credential.refreshToken,
      client_id: process.env.LINKEDIN_CLIENT_ID ?? "",
      client_secret: process.env.LINKEDIN_CLIENT_SECRET ?? "",
    });

    const res = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      throw this.mapError(res.status, errBody);
    }

    const data = await res.json();
    const now = Date.now();

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token ?? credential.refreshToken,
      expiresAt: new Date(now + data.expires_in * 1000),
      refreshTokenExpiresAt: data.refresh_token_expires_in
        ? new Date(now + data.refresh_token_expires_in * 1000)
        : credential.refreshTokenExpiresAt,
      scopes: (data.scope ?? "").split(" ").filter(Boolean),
    };
  }

  async healthProbe(): Promise<HealthResult> {
    const start = Date.now();
    try {
      const res = await fetch(`${LINKEDIN_API}/rest/me`, {
        headers: { "LinkedIn-Version": LINKEDIN_VERSION },
      });
      return {
        platform: this.platform,
        status: res.status === 401 ? "degraded" : res.ok ? "healthy" : "down",
        latencyMs: Date.now() - start,
        checkedAt: new Date(),
      };
    } catch {
      return {
        platform: this.platform,
        status: "down",
        latencyMs: Date.now() - start,
        checkedAt: new Date(),
      };
    }
  }
}
```

- [ ] **Step 2: Register LinkedIn adapter in registry**

Add to `src/lib/connectors/registry.ts`:

```typescript
import { LinkedInAdapter } from "./adapters/linkedin";
import { Platform } from "@/lib/platforms";

// Register at module level
registerAdapter(Platform.LinkedIn, new LinkedInAdapter());
```

- [ ] **Step 3: Verify build**

Run: `npx tsc --noEmit`

- [ ] **Step 4: Commit**

```bash
git add src/lib/connectors/adapters/linkedin.ts src/lib/connectors/registry.ts
git commit -m "feat(connectors): LinkedIn adapter with text publish, verify, delete, refresh"
```

---

### Task C2: Wire token decrypt in publish-post function

**Files:**
- Modify: `src/server/inngest/functions/publish-post.ts`

- [ ] **Step 1: Replace token placeholder with real decrypt**

In `src/server/inngest/functions/publish-post.ts`, add imports and replace the token placeholder:

```typescript
// Add imports:
import { oauthCredentials } from "@/db/schema/connectors";
import { decryptToken } from "@/lib/connectors/oauth/encrypt";

// Replace the publish step that has `const token = ""`:
// Find the step.run("publish", ...) block and replace with:

    const token = await step.run("get-token", async () => {
      const [cred] = await db
        .select()
        .from(oauthCredentials)
        .where(eq(oauthCredentials.connectorId, connectorId))
        .limit(1);

      if (!cred) {
        throw new Error("No OAuth credentials found for connector");
      }

      return decryptToken(cred.encryptedAccessToken);
    });

    // Then use `token` in the publish step (remove the old `const token = ""` line)
```

- [ ] **Step 2: Update publish step to use token variable**

Also update the adapter.publish call to construct proper LinkedIn input from the draft:

```typescript
    const result = await step.run("publish", async () => {
      return adapter.publish(
        {
          platform: platform as "linkedin",
          authorUrn: (connector.config as Record<string, string>).authorUrn ?? "",
          commentary: draft.content,
          visibility: "PUBLIC",
        } as PublishInput,
        token,
        post.idempotencyKey,
      );
    });
```

- [ ] **Step 3: Verify build**

Run: `npx tsc --noEmit`

- [ ] **Step 4: Commit**

```bash
git add src/server/inngest/functions/publish-post.ts
git commit -m "feat(publish): wire token decrypt from oauth_credentials"
```

---

### Task C3: Wire Publish button on draft editor

**Files:**
- Modify: `src/app/(app)/drafts/[id]/page.tsx`

- [ ] **Step 1: Wire the publish button to use real connector**

Replace the placeholder publish button onClick with actual connector lookup and publish call:

```typescript
// In the draft editor, replace the publish button onClick:
{canPublish && (
  <button
    onClick={() => {
      // For now, use the first LinkedIn connector for this workspace
      // In production, user would select which connector
      publishMut.mutate({
        draftId: id,
        channel: "linkedin",
        connectorId: "CONNECTOR_ID_HERE", // TODO: fetch from connectors.list
      });
    }}
    ...
```

This requires fetching the LinkedIn connector ID. Add a query:

```typescript
const { data: connectorsList } = trpc.connectors.list.useQuery();
const linkedInConnector = connectorsList?.find(
  (c) => c.platform === "linkedin" && c.state === "healthy",
);
```

Then use `linkedInConnector?.id` in the publish call.

- [ ] **Step 2: Verify build + test in browser**

Run: `npx tsc --noEmit`
Test: approve a draft → click "Publish to LinkedIn" → verify event fires

- [ ] **Step 3: Commit**

```bash
git add "src/app/(app)/drafts/[id]/page.tsx"
git commit -m "feat(drafts): wire publish button to LinkedIn connector"
```

---

### Task C4: Inline token refresh in publish-post (no separate cron)

**Why inline instead of cron:** Inngest free plan is at 5/5 functions (adding generate-draft makes 6). A separate refresh-tokens cron would be 7th. Instead, check token freshness inside publish-post and refresh if needed.

**Files:**
- Modify: `src/server/inngest/functions/publish-post.ts`

- [ ] **Step 1: Add token freshness check + auto-refresh**

In publish-post.ts, after the `get-token` step, add a refresh check:

```typescript
    const tokenAndRefresh = await step.run("get-token", async () => {
      const [cred] = await db
        .select()
        .from(oauthCredentials)
        .where(eq(oauthCredentials.connectorId, connectorId))
        .limit(1);

      if (!cred) {
        throw new Error("No OAuth credentials found for connector");
      }

      const accessToken = decryptToken(cred.encryptedAccessToken);
      const needsRefresh = cred.expiresAt && cred.expiresAt < new Date(Date.now() + 5 * 60 * 1000);

      if (needsRefresh && cred.encryptedRefreshToken) {
        try {
          const refreshToken = decryptToken(cred.encryptedRefreshToken);
          const adapter = getAdapter(platform);
          const newTokens = await adapter.refreshToken({
            workspaceId: event.data.workspaceId,
            platform: platform as Platform,
            accessToken,
            refreshToken,
            expiresAt: cred.expiresAt,
            refreshTokenExpiresAt: cred.refreshExpiresAt,
            scopes: cred.scopes?.split(",") ?? [],
            encryptedPayload: Buffer.from(""),
          });

          const encrypted = encryptToken(newTokens.accessToken);
          await db
            .update(oauthCredentials)
            .set({
              encryptedAccessToken: encrypted.ciphertext,
              tokenIv: encrypted.iv,
              tokenTag: encrypted.tag,
              expiresAt: newTokens.expiresAt,
            })
            .where(eq(oauthCredentials.connectorId, connectorId));

          return newTokens.accessToken;
        } catch {
          return accessToken;
        }
      }

      return accessToken;
    });
```

- [ ] **Step 2: Verify build**

Run: `npx tsc --noEmit`

- [ ] **Step 3: Commit**

```bash
git add src/server/inngest/functions/publish-post.ts
git commit -m "feat(publish): inline token refresh check before publish"
```

---

## Phase C Checkpoint

- [ ] `pnpm build` — zero errors
- [ ] E2E test: Generate draft → edit → approve → publish to LinkedIn
- [ ] Verify in Inngest dashboard: generate-draft and publish-post functions run
- [ ] Verify in Supabase: draft, post, post_result rows
- [ ] Verify: LinkedIn post appears (if real credentials)

---

## Phase D: Prompt Studio + Hygiene

### Task D1: Prompt Studio page (basic)

**Files:**
- Modify: `src/app/(app)/prompts/page.tsx`

- [ ] **Step 1: Replace stub with basic Prompt Studio**

Build a simple page that lists prompts and allows editing the system prompt:

```tsx
"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";

export default function PromptStudioPage() {
  // This needs a prompts tRPC router - add in step 2
  return (
    <div style={{ padding: "24px 32px", maxWidth: 800 }}>
      <h2 style={{ margin: "0 0 8px", fontSize: 22, fontWeight: 600 }}>Prompt Studio</h2>
      <p style={{ margin: "0 0 20px", fontSize: 13, color: "var(--ink-tertiary)" }}>
        Configure AI prompts used for draft generation.
      </p>
      {/* Prompt list + editor will be wired after adding prompts router */}
    </div>
  );
}
```

- [ ] **Step 2: Add prompts tRPC router**

Create a minimal prompts router with list + update mutations. Add to `src/server/routers/` and register in `_app.ts`.

- [ ] **Step 3: Wire the Prompt Studio UI to the router**

Show list of prompts, editable system_prompt textarea, save creates new version.

- [ ] **Step 4: Verify build + test**

- [ ] **Step 5: Commit**

```bash
git add src/app/(app)/prompts/page.tsx src/server/routers/prompts.ts src/server/routers/_app.ts
git commit -m "feat(prompts): basic Prompt Studio with list, edit, version save"
```

---

### Task D2: Hygiene updates

**Files:**
- Modify: `ultra-plan/PROGRESS.md`
- Modify: `ultra-plan/CHANGELOG.md`
- Modify: `ultra-plan/QA-RESULTS.md`
- Modify: `ultra-plan/DEPENDENCY-MAP.md`
- Modify: `CLAUDE.md`

- [ ] **Step 1: Update all tracking files** with Phase A-D work
- [ ] **Step 2: Update memory files** with Session 8 state
- [ ] **Step 3: Commit**

```bash
git add ultra-plan/ CLAUDE.md
git commit -m "docs: vertical slice hygiene — all tracking files updated"
```

---

### Task D3: Push + production verification

- [ ] **Step 1: Push all commits**

```bash
git push origin main
```

- [ ] **Step 2: Verify Vercel deploy succeeds**
- [ ] **Step 3: Verify Inngest Cloud shows 6 functions** (5 existing + generate-draft)
- [ ] **Step 4: Test on production URL**

---

## Phase D Checkpoint (Final)

- [ ] All tracking files updated
- [ ] Production deploy successful
- [ ] Inngest Cloud shows all functions
- [ ] Full E2E on production: idea → generate → edit → approve → publish
- [ ] Ready for conversation compact
