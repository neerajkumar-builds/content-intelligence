# Content Intelligence Agent — Dependency Map

> What depends on what. Check before modifying any file.

---

## Strategic Dependencies (Post-Pivot)

### Module execution order (strict sequence)
```
Module 1 (Core Loop) → MUST complete before Module 2
  - Google Drive + Slack output needs workspace settings
  - Home page needs signal count + draft count queries

Module 2 (Signal Intelligence) → MUST complete before Module 3
  - Competitor/leader profiles provide data for positioning analysis
  - Multi-platform signals provide market context

Module 3 (Content Excellence + Positioning Guide) → depends on Module 2 signals
  - Positioning Guide generated FROM accumulated signal data
  - Prompt overhaul uses positioning guide sections
  - Brand Brief schema upgrade affects all generation

Module 4 (SEO/AEO) → independent of Module 3 but benefits from it
  - Keywords can be added without positioning guide
  - SEO scoring is standalone

Module 5 (Polish) → all other modules done
```

### Key reference files for next session
```
Strategic direction: memory/project_pivot_2026_05_12.md
Positioning concept: memory/reference_positioning_agent.md
Existing workflows: memory/reference_existing_workflows.md
Full roadmap: ~/.claude/plans/unified-sniffing-island.md
Build state: memory/project_build_state.md
```

---

## Session 10 Changes

### Manual sync button
- `src/server/routers/signals.ts:triggerSync` — calls n8n webhook (NOT REST API — 405)
  - Depends: `N8N_INSTANCE_URL` env var (or `N8N_SYNC_WEBHOOK_URL` override)
  - Depends: n8n webhook workflow `qKxPjg3Cl2VetQ51` being active
  - Webhook URL: `{N8N_INSTANCE_URL}/webhook/ci-manual-sync`
  - n8n wrapper triggers main Signal Harvester `qrnItYAUlVcgchZO` via Execute Sub-workflow
- `src/components/ideas/source-rail.tsx` — sync button UI
  - Depends: `trpc.signals.triggerSync` mutation

### Date range filter
- `src/server/routers/ideas.ts:list` — accepts `dateFrom`/`dateTo`
  - Uses: `COALESCE(ideas.publishedAt, ideas.createdAt)` for null-safe filtering
- `src/components/ideas/filter-bar.tsx` — date inputs (native HTML)
- `src/app/(app)/ideas/page.tsx` — date state, passes to query + FilterBar

### Brand Brief auto-generate
- `src/db/schema/brands.ts` — `websiteUrl` column (nullable text)
- `src/server/routers/brand.ts:update` — accepts `websiteUrl` in data
- `src/server/routers/brief.ts:autoGenerate` — fetch HTML + callLLM
  - Depends: `src/lib/ai/llm-router.ts:callLLM`
  - Depends: LLM API key (GOOGLE_AI_API_KEY for default Gemini Flash)
- `src/app/(app)/brand/page.tsx` — URL input + auto-generate button
  - Depends: `trpc.brief.autoGenerate`, `trpc.brand.list` (for websiteUrl)

### DANGER: drizzle-kit push on shared DB
- Supabase DB has 7 tables from another project (scored_meetings, zoom_users, etc.)
- `drizzle-kit push` tries to DELETE those tables. NEVER use on this project.
- Schema changes: edit Drizzle file + apply SQL directly via postgres-js or Supabase MCP.

---

## Session 9B Changes

### Config consolidation (single source of truth)
- `src/lib/config/platforms.ts` — ALL platform configs (charLimit, formats, guidelines, tier, oauthReady)
- `src/lib/config/display.ts` — UI colors, icons per platform
- `src/lib/config/index.ts` — helper functions (getCharLimit, getChannelLabel, etc.)
- **Consumers (import from config, NOT local constants):**
  - `drafts/[id]/page.tsx` → `getCharLimit`, `getChannelLabel`
  - `drafts/page.tsx` → `getChannelLabel`
  - `generate-popover.tsx` → `getAllChannels`, `getFormats`
  - `generate-draft.ts` → `getFormatGuidelines`
  - `connectors/page.tsx` → `PLATFORMS`, `getOAuthReadyPlatforms`
- **Adding a new platform:** Edit ONLY `src/lib/config/platforms.ts` + optionally `display.ts`

### Late Session 9 Changes
- `process-signal.ts`: `computeFreshness` checks `pubDate`/`isoDate` (n8n fields). `computeHotScore` uses freshness-based scoring (base 30, not 50).
- `signals.ts`: ideas table has `publishedAt` column (nullable timestamptz). Set from signal metadata during idea creation.
- `idea-card.tsx`: shows publishedAt date, source link icon, hover tooltip with both dates
- `ideas.ts` router: default sort changed from hotScore to composite score. "fresh" sort uses publishedAt. Added "relevance" sort option.
- `filter-bar.tsx`: sort options updated (Relevance, Newest, ICP fit, Trending)

### Checkpoint C+D Changes
- `brand/page.tsx` now queries `trpc.brand.list` + `trpc.brief.get/create/list/diff` — depends on brief.ts + brand.ts routers
- `content.ts` has new `draftSnapshots` table — exported via `schema/index.ts`
- `drafts.ts` router: `regenerate` mutation now snapshots before clearing, accepts `customInstructions`
- `drafts.ts` router: new `listSnapshots` + `restoreSnapshot` queries
- `events.ts`: DraftGenerate event has `customInstructions` + `previousContent` fields
- `generate-draft.ts`: REFINE mode appends previous content + instructions to prompt
- `drafts/[id]/page.tsx`: instruction input + version history section in side panel

### Session 9 Changes (earlier)
- `content.ts:drafts` has `modelId` + `format` columns
- `ideas.ts:list` imports `drafts` + `inArray` — returns `latestDraft` per item
- `idea-card.tsx` accepts `latestDraft`, `onViewDraft`, `generatePending` props + GeneratePopover
- `process-signal.ts` populates `dedupScore` (0.70-0.85) and `dedupPriorId` on near-duplicate ideas

## Schema Dependencies (change cascades downward)

```
enums.ts
  ├── workspaces.ts (uses memberRole)
  ├── brands.ts (uses severity, ruleCategory)
  ├── connectors.ts (uses connectorState, tier)
  ├── signals.ts (uses signalSource)
  ├── content.ts (uses postStatus, severity) — NEW: drafts.modelId
  ├── publishing.ts (uses postStatus)
  ├── ai.ts (uses aiTaskType)
  └── ops.ts (uses exportFormat, exportStatus)

workspaces.ts
  ├── brands.ts (brands.workspace_id → workspaces.id)
  ├── members.ts (members.workspace_id → workspaces.id)
  ├── connectors.ts (connectors.workspace_id → workspaces.id)
  ├── signals.ts (signals.workspace_id → workspaces.id)
  ├── content.ts (drafts.workspace_id → workspaces.id)
  ├── publishing.ts (schedules/posts.workspace_id → workspaces.id)
  ├── ai.ts (prompts/model_routes/ai_calls.workspace_id → workspaces.id)
  └── ops.ts (audit_log/exports.workspace_id → workspaces.id)

brands.ts
  ├── brand_briefs (brand_briefs.brand_id → brands.id)
  ├── brand_corpus (brand_corpus.brand_id → brands.id)
  ├── ideas (ideas.brand_id → brands.id)
  ├── drafts (drafts.brand_id → brands.id)
  └── ai_calls (ai_calls.brand_id → brands.id, SET NULL)

connectors.ts
  ├── oauth_credentials (oauth_credentials.connector_id → connectors.id)
  └── contract_test_results (contract_test_results.connector_id → connectors.id)

content.ts (drafts)
  ├── draft_grades (draft_grades.draft_id → drafts.id)
  ├── draft_anti_ai_hits (draft_anti_ai_hits.draft_id → drafts.id)
  ├── schedules (schedules.draft_id → drafts.id)
  ├── posts (posts.draft_id → drafts.id)
  └── ai_calls (ai_calls.draft_id → drafts.id, SET NULL)

publishing.ts (posts)
  └── post_results (post_results.post_id → posts.id)
```

## Infrastructure Dependencies

```
src/lib/platforms.ts
  └── Used by: app-error.ts, connectors/types.ts (Task 0.14), schema enums (Task 0.2), UI components

src/lib/errors/app-error.ts
  └── Uses: src/lib/platforms.ts (Platform enum)
  └── Used by: ALL connector adapters, ALL Inngest functions, tRPC error formatter

src/lib/errors/circuit-breaker.ts
  └── Uses: rate_limit_windows table (ops.ts schema)
  └── Used by: connector adapters (publish calls wrapped in circuit breaker)

src/lib/security/scoped-db.ts (ASYNC since Session 7)
  └── Uses: Drizzle client (src/db/index.ts), workspaces schema (resolves Clerk orgId→UUID)
  └── Used by: src/server/middleware.ts (awaited in workspace middleware)
  └── Provides: ctx.scoped.workspaceId (UUID), scope(), scopeAnd() — all use resolved UUID
  └── NOTE: ctx.workspaceId is still Clerk orgId (needed for OAuth state). ctx.scoped.workspaceId is the UUID.

src/lib/security/token-manager.ts
  └── Uses: oauth_credentials table (connectors.ts schema), OAUTH_ENCRYPTION_KEY env var
  └── Used by: connector adapters (token refresh), Inngest refresh cron

src/lib/connectors/types.ts
  └── Uses: src/lib/platforms.ts (re-exports Platform)
  └── Used by: ALL 15 connector adapters, publishing Inngest functions, draft editor UI, token-manager.ts

src/lib/errors/rate-limiter.ts
  └── Uses: src/lib/platforms.ts, src/lib/errors/app-error.ts
  └── Used by: connector adapters (consume before publish), Inngest publish functions

src/lib/logging/index.ts
  └── Uses: crypto (randomUUID)
  └── Used by: ALL tRPC procedures, Inngest functions, audit log, connector adapters

src/lib/feature-flags/index.ts
  └── Uses: src/db/index.ts, src/db/schema (featureFlags table)
  └── Used by: tRPC middleware, connector adapters (feature gating), UI components

src/lib/audit/index.ts
  └── Uses: src/db/index.ts, src/db/schema (auditLog table), src/lib/logging (createTraceId)
  └── Used by: tRPC mutation middleware, connector adapters (publish audit), admin actions

src/app/api/health/route.ts
  └── Uses: src/db/index.ts (db.execute for health check)
  └── Used by: Vercel health monitoring, uptime checks

src/db/index.ts
  └── Uses: postgres (postgres-js), drizzle-orm/postgres-js, src/db/schema/index.ts
  └── Config: prepare: false (required for Supavisor pgbouncer)
  └── Used by: ALL server-side code (tRPC, Inngest, API routes, utilities)
  └── NOTE: Changed from @neondatabase/serverless (neon-http) in Session 5 — neon-http incompatible with Supabase

drizzle.config.ts
  └── Uses: src/db/schema/index.ts, DATABASE_URL env var
  └── Used by: drizzle-kit CLI (generate, migrate, push, studio)

src/server/context.ts
  └── Uses: @clerk/nextjs/server (auth), src/db/index.ts, src/lib/security/scoped-db.ts, src/lib/logging/index.ts
  └── Used by: src/app/api/trpc/[trpc]/route.ts, src/lib/trpc/server.ts

src/server/trpc.ts
  └── Uses: @trpc/server, superjson, src/server/context.ts, src/lib/errors/app-error.ts
  └── Used by: ALL routers, src/server/middleware.ts, src/lib/trpc/server.ts

src/server/middleware.ts
  └── Uses: src/server/trpc.ts, src/lib/security/scoped-db.ts, src/lib/logging/index.ts
  └── Used by: ALL domain routers (protectedProcedure)

src/server/routers/_app.ts
  └── Uses: src/server/trpc.ts, ALL 11 domain routers (brand, brief, corpus, rules, connectors, ideas, drafts, schedule, audit, onboarding, signals)
  └── Used by: src/app/api/trpc/[trpc]/route.ts, src/lib/trpc/client.tsx (type), src/lib/trpc/server.ts

src/lib/trpc/client.tsx
  └── Uses: @trpc/react-query, @tanstack/react-query, superjson, src/server/routers/_app.ts (type)
  └── Used by: src/app/(app)/layout.tsx, ALL client components using tRPC hooks

src/lib/trpc/server.ts
  └── Uses: server-only, src/server/context.ts, src/server/routers/_app.ts, src/server/trpc.ts
  └── Used by: React Server Components needing tRPC data

src/db/seed.ts
  └── Uses: pg, drizzle-orm/node-postgres, src/db/schema/index.ts
  └── Used by: pnpm db:seed (dev only)

src/server/routers/brief.ts
  └── Uses: src/server/trpc.ts, src/server/middleware.ts, src/db/schema (brandBriefs, brands)
  └── Used by: src/server/routers/_app.ts, Brand Brief page

src/server/routers/corpus.ts
  └── Uses: src/server/trpc.ts, src/server/middleware.ts, src/db/schema (brandCorpus, brands), src/server/inngest/client.ts
  └── Used by: src/server/routers/_app.ts, Brand Brief page (corpus section)
  └── NOTE: Emits corpus.item.added Inngest event on new items (Session 6)

src/server/routers/signals.ts
  └── Uses: src/server/trpc.ts, src/server/middleware.ts, src/db/schema (signalSourceConfigs, signals, brands), src/server/inngest/client.ts
  └── Used by: src/server/routers/_app.ts, Idea Wall page (SourceRail)
  └── 11 procedures: listSources, addSource, toggleSource, deleteSource, triggerBackfill, etc.

src/server/routers/ideas.ts (REWRITTEN Session 6)
  └── Uses: src/server/trpc.ts, src/server/middleware.ts, src/db/schema (ideas, signals), workspace UUID lookup
  └── Used by: src/server/routers/_app.ts, Idea Wall page
  └── Procedures: list (enhanced with source filter + sort), getById, dismiss, addManual

src/lib/ai/embed.ts
  └── Uses: @google/generative-ai (Gemini), src/db/index.ts, src/db/schema (aiCalls)
  └── Used by: Inngest functions (corpus-embed-item, process-signal)
  └── Config: gemini-embedding-001, 3072 dimensions, glass-box logging to ai_calls

src/server/inngest/client.ts
  └── Uses: inngest (Inngest SDK)
  └── Used by: src/server/inngest/events.ts, ALL Inngest functions, serve route, corpus.ts router, signals.ts router

src/server/inngest/events.ts
  └── Uses: zod, src/server/inngest/client.ts
  └── Used by: Inngest functions, webhook route, corpus.ts router
  └── Defines: signal.ingested, corpus.backfill, corpus.item.added

src/app/api/inngest/route.ts
  └── Uses: inngest/next, src/server/inngest/client.ts, ALL Inngest functions
  └── Used by: Inngest dev server (serves functions at /api/inngest)

src/server/inngest/functions/ (3 functions)
  └── corpus-backfill: Uses embed.ts, db/schema (brandCorpus)
  └── corpus-embed-item: Uses embed.ts, db/schema (brandCorpus)
  └── process-signal: Uses embed.ts, db/schema (signals, ideas), Supabase RPCs (match_brand_corpus, match_signal_ideas)
  └── Used by: src/app/api/inngest/route.ts (registered in serve)

src/app/api/webhooks/n8n/route.ts
  └── Uses: src/lib/security/hmac.ts, src/db/index.ts, src/db/schema (webhookDeliveries, signals), src/server/inngest/client.ts
  └── Used by: n8n workflows (external POST requests)
  └── Security: HMAC-SHA256 verification, idempotency via n8nExecutionId unique constraint

src/lib/security/hmac.ts
  └── Uses: crypto (node built-in)
  └── Used by: src/app/api/webhooks/n8n/route.ts

src/components/ideas/IdeaCard.tsx
  └── Uses: UI primitives, tRPC hooks (ideas.dismiss)
  └── Used by: Idea Wall page

src/components/ideas/SourceRail.tsx
  └── Uses: tRPC hooks (signals.listSources, signals.toggleSource)
  └── Used by: Idea Wall page

src/components/ideas/FilterBar.tsx
  └── Uses: React state
  └── Used by: Idea Wall page
```

## UI → Backend Dependencies (Phase 2: NOW WIRED)

```
/govern/brand       → tRPC: brand.get, brand.update → brand_briefs table
/govern/rules       → tRPC: rules.list, rules.create, rules.update → anti_ai_rules table
/govern/connectors  → tRPC: connectors.list → connectors + oauth_credentials + contract_test_results
/ideas              → tRPC: ideas.list/getById/dismiss/addManual, signals.listSources/toggleSource → ideas + signals + signal_source_configs + pgvector (halfvec)
/drafts             → tRPC: drafts.list, drafts.get, drafts.generate, drafts.update, drafts.approve, drafts.publish → drafts + draft_grades + ai_calls + posts
/drafts/[id]        → tRPC: drafts.getById, drafts.update, drafts.approve, drafts.publish → drafts + posts tables (auto-poll, edit, approve, publish)
/schedule           → tRPC: schedule.list → schedules + posts tables
/audit              → tRPC: audit.list → audit_log table
/onboarding         → tRPC: onboarding.* → workspaces + brands + brand_briefs + brand_corpus + anti_ai_rules
```

## Session 5 New Dependencies

```
postgres@3.4.9         — DB driver (replaced @neondatabase/serverless)
sonner@2.0.7           — Toast notifications (src/app/layout.tsx Toaster, page.tsx toast.error)
@clerk/themes          — Clerk dark theme for sign-in/sign-up pages
```

## Session 6 New Dependencies

```
inngest                — Background job framework (Inngest client, serve route, typed events)
@google/generative-ai  — Gemini embedding API (embed.ts, gemini-embedding-001, 3072 dims)
```

## Session 6 New Supabase Objects

```
halfvec(3072) columns  — brand_corpus.embedding, signals.embedding (migrated from vector(1536))
HNSW indexes           — Rebuilt with halfvec_cosine_ops, m=16, ef_construction=64
signal_source_configs  — New table for managing signal sources per brand
match_brand_corpus     — Supabase RPC for cosine similarity search on corpus
match_signal_ideas     — Supabase RPC for idea deduplication check
```

## Session 6 New Env Vars

```
INNGEST_DEV=1          — Required for local Inngest dev (connect to local dev server, not cloud)
GEMINI_API_KEY         — Google Gemini API key for embedding-001
N8N_WEBHOOK_SECRET     — HMAC-SHA256 shared secret for n8n webhook verification
```

## Session 7 New Dependencies

```
Vercel (Hosting)
  └── Production URL: content-intelligence-eight.vercel.app
  └── Auto-deploys from main branch (GitHub integration)
  └── Injects: INNGEST_SIGNING_KEY, INNGEST_EVENT_KEY (via Vercel Inngest integration)
  └── Used by: n8n webhook target, Inngest Cloud, public access

Inngest Cloud (Background Jobs)
  └── 3 functions synced: corpus-backfill, corpus-embed-item, process-signal
  └── Connected via Vercel integration (auto-injects signing + event keys)
  └── Concurrency: process-signal limited to 5 (NOT 20 — plan limit, reduced after Supabase connection saturation)
  └── Dashboard: app.inngest.com

n8n Signal Harvester Workflow (qrnItYAUlVcgchZO)
  └── Uses: Supabase credential (reads signal_source_configs)
  └── Uses: N8N_WEBHOOK_SECRET (HMAC signing in Code node)
  └── POSTs to: https://content-intelligence-eight.vercel.app/api/webhooks/n8n
  └── Schedule: every 30 min, Mon-Fri 8am-6pm
  └── Flow: Supabase configs → Loop brands → RSS Read → Normalize + HMAC → POST webhook

src/middleware.ts (Clerk Auth)
  └── Matcher exclusions: /api/webhooks(.*), /api/health, /api/inngest
  └── NOTE: Without these exclusions, Clerk blocks unauthenticated API calls (n8n, Inngest Cloud, health probes)
  └── Used by: All route protection + the excluded API routes above
```

## Session 8 New Files

```
src/lib/connectors/adapter.ts
  └── Uses: src/lib/connectors/types.ts (PublishInput, CHARACTER_LIMITS, MEDIA_CONSTRAINTS)
  └── Uses: src/lib/errors/app-error.ts (mapPlatformError)
  └── Used by: ALL 15 platform adapters (implement ConnectorAdapter interface)
  └── Used by: publish-post.ts, verify-post.ts (Inngest functions)

src/lib/connectors/registry.ts
  └── Uses: src/lib/connectors/adapter.ts (ConnectorAdapter type)
  └── Used by: publish-post.ts, verify-post.ts (getAdapter(platform))
  └── Used by: Platform adapters (registerAdapter on import)

src/server/inngest/functions/publish-post.ts
  └── Uses: events.ts (PostPublish, PostVerify), registry.ts (getAdapter)
  └── Uses: schema/publishing.ts (posts, postResults), schema/ops.ts (auditLog)
  └── Uses: schema/content.ts (drafts), schema/connectors.ts (connectors)
  └── Used by: Inngest serve route (registered in functions/index.ts)
  └── Triggered by: PostPublish event (from drafts.publish tRPC mutation)

src/server/inngest/functions/verify-post.ts
  └── Uses: events.ts (PostVerify), registry.ts (getAdapter)
  └── Uses: schema/publishing.ts (posts, postResults), schema/ops.ts (auditLog)
  └── Used by: Inngest serve route (registered in functions/index.ts)
  └── Triggered by: PostVerify event (from publish-post.ts after 10min delay)

src/components/ideas/add-source-dialog.tsx
  └── Uses: src/lib/trpc/client.tsx (signals.addSource mutation)
  └── Used by: src/components/ideas/source-rail.tsx

src/components/ideas/source-rail.tsx (REWRITTEN Session 8)
  └── Uses: src/lib/trpc/client.tsx (signals.listSources, toggleSource, deleteSource)
  └── Uses: add-source-dialog.tsx
  └── Used by: src/app/(app)/ideas/page.tsx

Inngest Cloud (Updated Session 8 — CP1)
  └── 5 functions synced (was 3): + publish-post, verify-post
  └── Free plan: 5 concurrency per function, 5 active functions limit — AT CAPACITY
  └── NOTE: Adding more functions requires Inngest plan upgrade or consolidation
```

## Session 8 Vertical Slice New Files

```
src/lib/ai/generate.ts
  └── Uses: @google/generative-ai (Gemini 2.0 Flash), src/db/index.ts, src/db/schema (aiCalls), src/lib/logging
  └── Used by: src/server/inngest/functions/generate-draft.ts
  └── Config: gemini-2.0-flash, structured JSON output, glass-box logging (model, cost, latency, tokens, status)

src/lib/ai/seed.ts
  └── Uses: src/db/index.ts, src/db/schema (prompts table)
  └── Used by: src/server/inngest/functions/generate-draft.ts
  └── Behavior: reads prompt by task name from DB; falls back to hardcoded default if no row found

src/server/inngest/functions/generate-draft.ts
  └── Uses: events.ts (DraftGenerate), generate.ts, seed.ts, db/schema (drafts, ideas, brands, brandBriefs)
  └── Used by: Inngest serve route (registered in functions/index.ts)
  └── Triggered by: DraftGenerate event (from drafts.generate tRPC mutation)
  └── Steps: fetch-idea-context → fetch-brand-brief → build-prompt → call-llm → save-draft

src/lib/connectors/adapters/linkedin.ts (PUBLISHING adapter — distinct from OAuth adapter in src/lib/connectors/oauth/linkedin.ts)
  └── Uses: src/lib/connectors/adapter.ts (ConnectorAdapter interface), src/lib/connectors/registry.ts
  └── Uses: src/lib/errors/app-error.ts (mapPlatformError)
  └── Used by: publish-post.ts, verify-post.ts (via getAdapter("linkedin"))
  └── Quirks: ID in x-restli-id header, LinkedIn-Version: 202604 required, refresh TTL doesn't reset

src/app/(app)/drafts/[id]/page.tsx (NEW — Draft Editor)
  └── Uses: src/lib/trpc/client.tsx (drafts.getById, drafts.update, drafts.approve, drafts.publish)
  └── Auto-polls while status=draft (content not yet generated)
  └── Used by: Idea Wall "Generate" button redirect, Drafts list page links

src/app/(app)/drafts/page.tsx (REWRITTEN — was stub)
  └── Uses: src/lib/trpc/client.tsx (drafts.list)
  └── Filter tabs: all / draft / graded / approved / scheduled / live
  └── Used by: Sidebar nav → /drafts route

Inngest Cloud (Updated Session 8 — Vertical Slice)
  └── 6 functions synced (was 5 after CP1): + generate-draft
  └── Free plan: 5 active functions limit EXCEEDED — plan upgrade needed
  └── NOTE: 6th function (generate-draft) may not register on free plan
```

## Session 8 Multi-Model + UI Polish New Files

```
src/lib/ai/llm-router.ts (NEW — replaces single-provider generate.ts for routing)
  └── Uses: src/lib/ai/models.ts (model config lookup)
  └── Uses: @google/generative-ai (Google AI provider)
  └── Uses: @anthropic-ai/sdk (Anthropic provider)
  └── Uses: OpenRouter API via fetch (GPT-5.4 + others via OpenRouter)
  └── Uses: src/db/index.ts, src/db/schema (aiCalls — glass-box logging)
  └── Used by: src/server/inngest/functions/generate-draft.ts
  └── NOTE: generate.ts (single-provider Gemini utility) is superseded by this router

src/lib/ai/models.ts (NEW — model registry)
  └── Uses: nothing (pure config)
  └── Used by: src/lib/ai/llm-router.ts (lookup by modelId)
  └── Used by: src/components/ui/model-select.tsx (display name, provider, thinking flag)
  └── Models: gemini-3-flash (standard), claude-sonnet-4 (standard), claude-opus-4 (thinking), gpt-5.4 (thinking), gemini-3.1-pro (thinking)

src/components/ui/model-select.tsx (NEW — model picker dropdown)
  └── Uses: src/lib/ai/models.ts (model list, providerId, thinking flag)
  └── Uses: Provider SVG logos (Anthropic, OpenAI, Google — inline SVG)
  └── Props: value, onChange, dropUp (boolean)
  └── Used by: src/app/(app)/ideas/page.tsx (generate button)
  └── Used by: src/app/(app)/drafts/[id]/page.tsx (regenerate button)

src/components/ui/confirm-dialog.tsx (NEW — styled modal confirmation)
  └── Uses: React state (open/close), Tailwind CSS
  └── Props: open, onClose, onConfirm, title, message, confirmLabel
  └── Used by: src/components/ideas/source-rail.tsx (delete source)
  └── Used by: src/app/(app)/drafts/[id]/page.tsx (delete draft)
  └── Replaces: native browser confirm() — consistent UX, dark theme compatible

Session 8 New Env Vars
  └── ANTHROPIC_API_KEY — Anthropic SDK for Claude Sonnet 4 + Claude Opus 4
  └── OPENROUTER_API_KEY — OpenRouter API for GPT-5.4 + other OpenRouter models
  └── (GEMINI_API_KEY already present from Session 6)
```

## Critical: Files That Break Everything If Wrong

1. `src/db/schema/enums.ts` — Every other schema file imports from here
2. `src/db/schema/index.ts` — Barrel export, if missing an export = migration fails
3. `src/lib/security/scoped-db.ts` — Missing scope = cross-tenant data leak
4. `src/lib/errors/app-error.ts` — Every error handler depends on error classification
5. `CLAUDE.md` — Auto-loaded every session, wrong info = wrong decisions
6. `src/server/trpc.ts` — initTRPC + error formatter, every router depends on it
7. `src/server/routers/_app.ts` — Merged router, client type inference depends on it

---

## How to Update

When modifying a file, check this map:
1. Find the file in the tree above
2. Look at "Used by" — those files may need updating
3. Look at "Uses" — those files must exist first
4. If adding a new dependency, add it to this map
