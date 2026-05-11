# Multi-Model LLM Selector + Draft Editor Polish

## Goal

Add model selection to draft generation (Gemini/Claude/GPT via OpenRouter), show AI generation metadata in the editor, and polish the draft editor to follow brand guidelines (Lora for content, Montserrat for UI, JetBrains Mono for technical values).

## Architecture

LLM Router routes calls to the right provider based on model ID:
- `gemini-*` → Google AI direct API (existing, cheapest)
- Everything else → OpenRouter (OpenAI-compatible, single API key)

```
Generate button click → model picker popover → select model
  → drafts.generate({ ideaId, brandId, channel, modelId })
  → DraftGenerate Inngest event (includes modelId)
  → generate-draft function → LLM Router → provider API
  → Save draft + log to ai_calls (model, tokens, cost)
  → Draft editor shows: model, cost, tokens in side panel
```

## Components

### 1. LLM Router (`src/lib/ai/llm-router.ts`)

Single entry point replacing the current `generateText` in `generate.ts`.

```typescript
interface LLMCallOptions {
  modelId: string;
  systemPrompt: string;
  userPrompt: string;
  temperature?: number;
  maxTokens?: number;
  workspaceId: string;
  brandId?: string;
  draftId?: string;
  traceId: string;
}

interface LLMResult {
  text: string;
  model: string;
  provider: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  costCents: number;
  latencyMs: number;
}
```

**Provider routing:**
- If modelId starts with `gemini` → use Google AI API (existing pattern from generate.ts)
- Otherwise → use OpenRouter API (`https://openrouter.ai/api/v1/chat/completions`)

**OpenRouter call format (OpenAI-compatible):**
```json
{
  "model": "anthropic/claude-sonnet-4-6",
  "messages": [
    { "role": "system", "content": systemPrompt },
    { "role": "user", "content": userPrompt }
  ],
  "temperature": 0.8,
  "max_tokens": 2048
}
```
Headers: `Authorization: Bearer {OPENROUTER_API_KEY}`, `HTTP-Referer: https://content-intelligence-eight.vercel.app`, `X-Title: Content Intelligence`

**Cost calculation:** OpenRouter returns cost in response headers or usage object. For Google AI, calculate from known rates.

**Glass-box:** Every call logged to `ai_calls` table with actual model, provider, tokens, cost, latency, traceId.

### 2. Available Models (curated, not all 100+)

```typescript
const AVAILABLE_MODELS = [
  {
    id: "gemini-2.0-flash",
    label: "Gemini Flash",
    provider: "google",
    tier: "fast",
    description: "Fast, cost-effective",
    costPer1kInput: 0.0075,
    costPer1kOutput: 0.03,
    requiresKey: "GOOGLE_AI_API_KEY",
  },
  {
    id: "anthropic/claude-sonnet-4-6",
    label: "Claude Sonnet 4.6",
    provider: "openrouter",
    tier: "balanced",
    description: "Great quality, good speed",
    costPer1kInput: 0.3,
    costPer1kOutput: 1.5,
    requiresKey: "OPENROUTER_API_KEY",
  },
  {
    id: "anthropic/claude-opus-4-7",
    label: "Claude Opus 4.7",
    provider: "openrouter",
    tier: "best",
    description: "Highest quality output",
    costPer1kInput: 1.5,
    costPer1kOutput: 7.5,
    requiresKey: "OPENROUTER_API_KEY",
  },
  {
    id: "openai/gpt-4.1",
    label: "GPT-4.1",
    provider: "openrouter",
    tier: "balanced",
    description: "Strong alternative",
    costPer1kInput: 0.2,
    costPer1kOutput: 0.8,
    requiresKey: "OPENROUTER_API_KEY",
  },
];
```

Models with unavailable API keys shown as disabled with "Set API key in env" tooltip.

### 3. Model Selector UI

Simple `<select>` dropdown — no dialog, no popover.

**On Idea Wall — next to Generate button:**
```
[Model: Gemini Flash ▾] [✦ Generate]
```
- Native select dropdown with 4 model options
- Disabled models show "(needs API key)" suffix
- Selected model passed to `drafts.generate({ modelId })`
- Default persisted in localStorage: `cia.preferredModel`

**On Draft Editor — next to Regenerate button:**
```
[Save] [Model: Claude Sonnet ▾] [Regenerate] [Approve] | Copy Download Share
```
- Same select dropdown pattern
- Shows which model was used for current draft in side panel

**Dropdown option format:**
```
Gemini Flash — $0.01 est.
Claude Sonnet 4.6 — $0.08 est.
Claude Opus 4.7 — $0.40 est.
GPT-4.1 — $0.05 est.
```

### 4. Draft Editor Polish (Brand Guidelines)

**Typography fixes:**
- Body textarea: `fontFamily: "var(--font-body)"` → Lora (draft content font)
- Title input: `fontFamily: "var(--font-heading)"` → Montserrat (UI font)
- Char count, version, costs: `fontFamily: "var(--font-mono)"` → JetBrains Mono
- Side panel labels: Montserrat uppercase

**Side panel AI info (new section, after "Created"):**
- Query `ai_calls` WHERE draftId = current draft
- Show: Model name, Provider, Input/Output tokens, Cost, Latency
- All in JetBrains Mono

**Action bar consistency:**
- Button styles follow existing component patterns (Save=outline, Approve=green fill, Publish=LinkedIn blue)
- Copy/Download/Share grouped right, action buttons grouped left
- Consistent border-radius (6px), font-size (12px), padding (7px 16px)

### 5. Backend Changes

**New file:** `src/lib/ai/llm-router.ts` — replaces direct `generateText()` calls
**Modified:** `src/lib/ai/generate.ts` — keep for backward compat, internally calls llm-router
**Modified:** `src/server/inngest/events.ts` — DraftGenerate adds optional `modelId` field
**Modified:** `src/server/inngest/functions/generate-draft.ts` — read modelId, pass to llm-router
**Modified:** `src/server/routers/drafts.ts` — `generate` mutation accepts optional `modelId`
**New:** `src/lib/ai/models.ts` — AVAILABLE_MODELS config + helper functions
**Modified:** `src/app/(app)/ideas/page.tsx` — model picker on Generate button
**Modified:** `src/app/(app)/drafts/[id]/page.tsx` — brand polish + AI info panel + model picker on Regenerate
**New env var:** `OPENROUTER_API_KEY` in .env.local + .env.example

### 6. Phases

**Phase 1: LLM Router + Models Config (backend)**
- Create llm-router.ts with Google AI + OpenRouter providers
- Create models.ts with curated model list
- Update generate-draft.ts to use router
- Update events.ts + drafts.ts for modelId parameter

**Phase 2: Model Picker UI**
- Model picker component (reusable popover)
- Wire to Generate button on Idea Wall
- Wire to Regenerate button on Draft Editor

**Phase 3: Editor Polish**
- Lora font on body textarea
- AI info section in side panel (ai_calls query)
- Consistent typography across all elements
- Action bar layout cleanup

### 7. Out of Scope

- Prompt Studio UI (separate task)
- Auto-fallback chains
- Streaming generation (SSE)
- Model comparison (side-by-side)
- User-configurable model list via Settings page
