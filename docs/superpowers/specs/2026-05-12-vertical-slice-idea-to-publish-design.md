# Vertical Slice: Idea → Draft → Publish to LinkedIn

## Goal

Build the first complete content creation and publishing flow: user clicks "Generate" on an idea → AI writes a draft using brand voice → user edits and approves → publishes to LinkedIn. One end-to-end cycle, tested on frontend and backend, before replicating for other channels.

## Architecture

Inngest-first background generation. LLM prompt stored in DB (prompts table) for configurability. LinkedIn adapter implements existing ConnectorAdapter interface. Draft CRUD mutations extend existing drafts router.

```
IdeaCard "Generate" click
  → tRPC drafts.generate
    → INSERT draft (status=draft, content=null)
    → Fire DraftGenerate Inngest event
    → Return draftId → redirect to /drafts/{draftId}

Inngest generate-draft (background, 5-15s):
  → Fetch idea + brand brief + corpus top-5 + voice traits
  → Read prompt from prompts table (slug: draft-generation)
  → Interpolate variables into prompt
  → Call Gemini 2.0 Flash via Google AI SDK
  → UPDATE draft SET title, content
  → INSERT ai_calls (glass-box log)

User on /drafts/{draftId}:
  → Sees "Generating..." skeleton while content=null
  → Content appears → edit title + body
  → Click "Approve" → status = approved
  → Click "Publish to LinkedIn"
    → drafts.publish mutation (existing from CP1)
    → PostPublish Inngest event → publish-post function
    → LinkedIn adapter → POST /rest/posts
    → Post status: publishing → live (with LinkedIn URL)
```

## Components

### 1. Backend: Draft Mutations (extend drafts.ts)

**New mutations:**
- `generate` — input: `{ ideaId, brandId, channel }`. Creates draft row, fires DraftGenerate event, returns `{ draftId }`.
- `create` — input: `{ brandId, title, content, channel }`. Manual draft creation without AI.
- `update` — input: `{ draftId, title?, content?, channel? }`. Saves edits. Only when status is "draft".
- `approve` — input: `{ draftId }`. Sets status to "approved". Validates current status is "draft".

**Status transitions allowed:**
- draft → approved (via approve mutation)
- approved → publishing (via publish mutation, already exists)
- publishing → live | failed (via Inngest function, already exists)

### 2. Inngest: Draft Generation

**Event:** `DraftGenerate` — `{ draftId, ideaId, brandId, workspaceId, channel }`

**Function:** `generate-draft`
- id: "generate-draft"
- concurrency: `[{ scope: "account", key: "generate-{{ event.data.workspaceId }}", limit: 3 }]`
- retries: 2

**Steps:**
1. `fetch-context` — idea (hook, angle, sourceUrl), brand brief (voiceTraits, wedge, icp), top 5 corpus matches via match_brand_corpus RPC, top 5 anti-AI rules
2. `fetch-prompt` — read active prompt from prompts table WHERE slug="draft-generation" AND is_active=true
3. `generate` — call Gemini 2.0 Flash with interpolated prompt, parse title + body from response
4. `save-draft` — UPDATE draft SET title, content WHERE id = draftId
5. `log-ai-call` — INSERT ai_calls with model, tokens, cost, latency, traceId

### 3. Prompt System

**Default prompt (seeded to prompts table on first generate call):**

Slug: `draft-generation`
Variables: `brand_name, voice_traits, wedge, icp, anti_ai_rules, idea_hook, idea_angle, source_content, corpus_matches, channel`

System prompt:
```
You are a content writer for {brand_name}.

VOICE:
{voice_traits}

POSITIONING:
Wedge: {wedge}
ICP: {icp}

RULES (never violate):
{anti_ai_rules}
```

User prompt:
```
Write a {channel} post based on this signal:

IDEA: {idea_hook}
ANGLE: {idea_angle}
SOURCE: {source_content}

BRAND CONTEXT (similar content from our corpus):
{corpus_matches}

Output format:
TITLE: (one compelling headline)
BODY: (150-300 words, short paragraphs, conversational, no hashtags in body)
```

**Prompt Studio page:** Basic CRUD — list prompts, edit system_prompt + user_prompt, save creates new version, toggle active/inactive.

### 4. LinkedIn Adapter

**File:** `src/lib/connectors/adapters/linkedin.ts`

Implements `ConnectorAdapter` interface:
- `publish(input, token, idempotencyKey)` — POST /rest/posts with LinkedIn-Version header. Text-only for MVP. Returns platformPostId from x-restli-id header.
- `verify(platformPostId, token)` — GET post by URN, check exists.
- `deletePost(platformPostId, token)` — DELETE post by URN.
- `refreshToken(credential)` — POST /oauth/v2/accessToken with grant_type=refresh_token.
- `validateContent(input)` — check 3000 char limit.
- `mapError(httpStatus, body)` — LinkedIn serviceErrorCode extraction.
- `healthProbe()` — GET /rest/me with token, check 200.

**Token wiring in publish-post.ts:**
- Replace `token = ""` placeholder with: decrypt from oauth_credentials via existing encrypt.ts utilities.

### 5. Drafts UI

**Drafts list page (`/drafts`):**
- Replace current stub
- tRPC drafts.list query
- Filter by status: all / draft / approved / live / failed
- Card per draft: title, status badge, channel badge, brand, timestamp
- Click card → navigate to /drafts/[id]

**Draft editor page (`/drafts/[id]`):**
- New route: `src/app/(app)/drafts/[id]/page.tsx`
- Layout: main content area + right side panel
- Main area:
  - Title input (large, editable)
  - Body textarea (large, auto-resize, editable)
  - If content is null: "AI is generating your draft..." skeleton
  - Auto-poll every 3s while content is null (tRPC useQuery with refetchInterval: 3000, stops when content !== null)
- Side panel:
  - Status badge (large)
  - Channel: "LinkedIn" with icon
  - Character count / limit
  - Brand name
  - Source idea link
  - AI generation info (model, tokens, cost — from ai_calls)
- Bottom action bar:
  - "Save" button (calls drafts.update)
  - "Approve" button (calls drafts.approve, only when status=draft)
  - "Publish to LinkedIn" button (calls drafts.publish, only when status=approved)
  - Publish status: shows "Publishing..." → "Live on LinkedIn" with link

**"Generate" button wiring (idea-card.tsx → ideas/page.tsx):**
- handleGenerate calls drafts.generate mutation
- On success: router.push(`/drafts/${draftId}`)

### 6. Token Refresh

**Inngest cron function:** `refresh-tokens`
- Schedule: `0 0 * * 1` (weekly, Monday midnight — LinkedIn tokens last 60 days)
- Reads all connectors with oauth_credentials where expiresAt < 7 days from now
- Calls adapter.refreshToken() for each
- Updates encrypted tokens in DB
- Logs results to audit

Note: Inngest free plan is at 5-function capacity (5/5). Adding generate-draft + refresh-tokens = 7 total. Need Inngest plan upgrade OR consolidate: combine refresh-tokens into a step within publish-post (check + refresh before publish). Recommend: keep as separate function, user upgrades Inngest plan to Pro ($25/mo, 10 functions).

### 7. Phases & Checkpoints

**Phase A: Backend (draft CRUD + AI generation) — 4 tasks**
- A1: Draft mutations (generate, create, update, approve)
- A2: DraftGenerate Inngest event + generate-draft function
- A3: Seed default prompt in prompts table
- A4: Wire "Generate" button → mutation → redirect
- Checkpoint: pnpm build clean, tRPC mutations work via Inngest dev

**Phase B: Drafts UI — 4 tasks**
- B1: Drafts list page (replace stub)
- B2: Draft editor page (/drafts/[id])
- B3: Approve + publish flow on editor
- B4: Generation skeleton + auto-poll
- Checkpoint: browser test: generate → see draft → edit → approve

**Phase C: LinkedIn Adapter + Token Wiring — 3 tasks**
- C1: linkedin.ts adapter (text-only publish)
- C2: Wire token decrypt in publish-post function
- C3: Token refresh Inngest cron (or inline refresh)
- Checkpoint: E2E: approve → publish → live on LinkedIn

**Phase D: Prompt Studio + Hygiene — 3 tasks**
- D1: Prompt Studio page (list, edit, save version)
- D2: Update PROGRESS, CHANGELOG, QA, DEPENDENCY-MAP, CLAUDE.md
- D3: Commit + push + production verification
- Checkpoint: all docs synced, production deploy verified

### 8. What's Explicitly Out of Scope

- 7-dimension grading (Phase 6 proper)
- Anti-AI rule enforcement during generation (Phase 6)
- Media upload to LinkedIn (image/video/carousel)
- Multi-platform formatting (X thread, IG caption, etc.)
- Prompt A/B testing
- Draft versioning (content history)

### 9. Dependencies

- `GOOGLE_AI_API_KEY` already in .env.local (used for embeddings)
- Gemini 2.0 Flash available via same Google AI SDK
- LinkedIn OAuth tokens already stored (Phase 4A)
- Inngest plan: need 7 functions (currently 5/5 on free plan)

### 10. Verification Plan

After each phase:
1. `pnpm build` — zero errors
2. `pnpm dev` — page renders correctly
3. Browser test: click through the flow
4. Supabase query: verify data in tables
5. Inngest dev dashboard: verify function runs
6. After Phase C: publish real post to LinkedIn (sandbox or test account)
