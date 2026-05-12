# Content Intelligence Agent

## What This Is

Voice-faithful B2B content automation platform. Ingests signals (RSS, competitors, thought leaders), surfaces ranked ideas, generates drafts in the operator's voice with anti-AI guardrails, grades on 7 dimensions, publishes to 15 channels with idempotency + audit trails. Glass-box AI: every prompt, model, cost, latency visible to operator.

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 15 (App Router) |
| UI | React 19 + Tailwind CSS 4 + shadcn/ui + Recharts |
| Auth | Clerk Organizations |
| DB | Postgres + Drizzle ORM + pgvector (Supabase) |
| API | tRPC v11 |
| Background | Inngest |
| LLM | Vercel AI SDK + custom router |
| Connectors | Custom OAuth adapters (12 direct, 2 n8n, 1 hybrid) |
| Fonts | Montserrat (UI), Lora (drafts), JetBrains Mono (IDs) |
| Hosting | Vercel |

## Critical Product Rules (NEVER violate)

1. **Status vocabulary LOCKED:** `draft -> graded -> approved -> scheduled -> publishing -> live | failed`
2. **Idempotency keys MANDATORY:** format `idem_<draftId>_v<version>_<channel>_<yyyymmdd>`
3. **Glass-box AI:** NEVER hide model, prompt, cost, or anti-AI hit from operator
4. **7-dim rubric:** Hook, Voice, Evidence, Format-fit, Controversy, Specificity, CTA (each 0-10)
5. **62 anti-AI rules:** 4 severities (block/warn/suggest/log), operator-editable
6. **15 connectors:** 11 contract tests each (token-refresh, idempotency replay, retry 429, rate-limit backoff, media validator, account warm-up, ghost detection, health probe, scope verification, webhook listener, cost meter)
7. **Workspace + brand separate:** workspaces contain brands. Voice corpus is per-brand.

## Current Build State

- **Phase 0 (Foundation):** COMPLETE. Merged PR #1. 27 tables live in Supabase.
- **Phase 1 (Scaffolding):** COMPLETE. Merged PR #1. +9,744 lines.
- **Phase 2 (Data Model):** COMPLETE. Merged PR #2. tRPC v11, 10 routers.
- **Phase 2.5 (Quality Fixes):** COMPLETE. Merged PR #3.
- **Phase 3 (Brand Brief + Rules):** COMPLETE. Merged PR #4. 12 new procedures, 2 UI pages.
- **Phase 3.5 (Onboarding):** COMPLETE. Merged PR #5. 4-step wizard, Clerk auth, middleware.
- **Phase 4A (Connector OAuth):** COMPLETE. Merged PR #6. LinkedIn OAuth, encrypt, sign-in/sign-up pages.
- **Phase 4A-wire (Onboarding DB Wiring):** COMPLETE. E2E verified. 5 mutations wired, Clerk org creation, postgres-js driver, Supavisor pooler, toast notifications, dark theme.
- **Phase 5 (Signal Ingestion):** ALL COMPLETE (5A-5E). E2E verified. Inngest (3 functions), Gemini embeddings (halfvec 3072), webhook, signal pipeline, Idea Wall UI. n8n workflow deployed (qrnItYAUlVcgchZO).
- **Scope Fix (Session 7):** Systemic workspace scoping bug fixed — scopedDb() now async, resolves Clerk orgId→UUID. 8 routers (24 procedures) fixed with zero per-router changes. corpus.delete cross-tenant vuln fixed.
- **Checkpoint 0 (Session 7):** First Vercel deploy, Inngest Cloud connected, n8n workflow activated with production URL.
- **Clerk Middleware Fix (Session 7):** Excluded `/api/webhooks(.*)`, `/api/health`, `/api/inngest` from Clerk matcher — without this, Clerk blocks n8n webhooks, Inngest Cloud, and health probes.
- **Inngest Cloud (Session 7):** 3 functions synced via Vercel integration (auto-injects INNGEST_SIGNING_KEY + INNGEST_EVENT_KEY). process-signal concurrency = 5 (reduced from 20 plan limit after Supabase connection saturation).
- **E2E Pipeline Verified (Session 7):** n8n RSS -> webhook -> Inngest Cloud -> Gemini embed -> rank -> idea. 1.7s per signal. 121 signals ingested, 12+ processed to ideas.
- **Checkpoint 1 (Session 8):** Publishing Foundation DONE. ConnectorAdapter interface, BaseAdapter, adapter registry, 3 Inngest events (PostPublish, PostVerify, TokenRefreshDue), publish-post function (10-step pipeline + ghost detection), verify-post function, 3 tRPC mutations (publish, publishMulti, getPublishStatus). 5 Inngest functions total (was 3). Idempotency keys: `idem_{draftId}_v{version}_{channel}_{yyyymmdd}`.
- **Add Source UI (Session 8):** Add Source dialog with 6 source types (RSS active, others "coming soon"). SourceRail + button, toggle live/paused, delete with confirm. E2E tested: "Sam Altman Blog" RSS added successfully.
- **Vertical Slice (Session 8):** End-to-end Idea → Draft → LinkedIn publish complete. 8 commits, ~2,500 lines. Draft generation via Gemini 2.0 Flash (glass-box), generate-draft Inngest function (5 steps), drafts list page (status filter tabs), draft editor page (auto-poll, edit, approve, publish), LinkedIn publishing adapter (publish/verify/delete/refresh/healthProbe), token decrypt + inline refresh in publish-post. 6 Inngest functions total.
- **Multi-Model LLM Router (Session 8):** 3 providers (Google AI, Anthropic, OpenRouter), 5 models (Gemini 3.0 Flash, Claude Sonnet 4, Claude Opus 4, GPT-5.4, Gemini 3.1 Pro). Custom model picker dropdown with provider SVG logos and Standard/Thinking groups. llm-router.ts replaces single-provider generate.ts. generate-draft Inngest function updated to use router with per-request modelId. Inngest free plan at 6 functions — at capacity.
- **UI Polish (Session 8):** Lora font on draft body, channel label mapping, animated generation loader (5 steps), stuck draft timeout (>90s → Retry/Delete), title textarea wrap, ConfirmDialog component (replaces native confirm()), Copy/Download/Share actions on editor.
- **Session 9 Fixes:** model_id + format columns on drafts. Draft status badges on Idea Wall. Generate Popover (channel + format + model). Verified char limits. Regenerate timeout fix. Gemini 2.5 Flash recategorized.
- **Session 9B (4 checkpoints + UX + data):** A) Source link + dedup score. B) Config consolidation (3 config files). C) Brand Brief wired (edit, version history, diff). D) Regenerate with instructions + draft_snapshots. Plus: instruction area UX, version preview, hot score fix, freshness fix, publishedAt column, relevance sort. 18 commits, ~2,200 lines.
- **Session 10 (6 commits, +450 lines, production verified):** Manual sync button (n8n webhook trigger), date range filter (COALESCE), Brand Brief auto-generate (Gemini Flash), progressive generation loader (timer + escape hatch), brand name in header, websiteUrl persisted. Fixed: n8n REST API 405 (created webhook wrapper workflow qKxPjg3Cl2VetQ51), Inngest lost 3 functions (manual resync), URL auto-prepend. n8n has 2 workflows now: Signal Harvester (qrnItYAUlVcgchZO) + Manual Sync Trigger (qKxPjg3Cl2VetQ51).
- **Session 10 part 2 (+671 lines):** Prompt Studio (prompts router + full editor page with variable reference + interpolated preview). Signal Explorer (listSignals query + table page with filters/pagination/expand + nav entry). 12 routers now (was 11). 24 routes (was 23).
- **Next:** More RSS sources → Phase 6 (grading, needs Inngest upgrade) → Deep onboarding redesign
- **Full product vision:** See `memory/project_product_vision.md` — deep onboarding, knowledge base, competitor detection
- **Schema now:** 30 tables (29 + draft_snapshots). brands.websiteUrl added. ideas.publishedAt added. drafts.format + drafts.modelId added.
- **Production URL:** https://content-intelligence-eight.vercel.app
- **GitHub:** https://github.com/neerajkumar-builds/content-intelligence
- **n8n:** https://full-funnel.app.n8n.cloud/ (connected via MCP)
- **Inngest:** app.inngest.com (Vercel integration, auto-injected keys)

## How to Resume

1. Read `ultra-plan/PROGRESS.md` for current state and next task
2. Read `ultra-plan/LEARNINGS.md` for mistakes NOT to repeat
3. Read memory `feedback_ui_testing.md` for 8 critical UX lessons from Session 4
4. Check `ultra-plan/DEPENDENCY-MAP.md` before modifying any file
5. All work on `main` branch (all PRs merged). No stale branches.
6. Design spec in `design_handoff_content_intelligence_agent/CLAUDE.md`
7. **FIRST TASK next session:** Prompt Studio UI (placeholder exists at `src/app/(app)/prompts/page.tsx`, need: list prompts from DB, edit + save, linked from Draft editor glass-box panel) → then Signal Explorer page → then LinkedIn E2E publish test → then Phase 6 (7-dim grading: grade-draft Inngest function, GradePanel UI on editor). **NOTE: Inngest free plan at 6 functions (at capacity) — adding a grade-draft function requires plan upgrade or consolidation.**
8. **Key context:** `ctx.workspaceId` = Clerk orgId (for OAuth). `ctx.scoped.workspaceId` = UUID (for DB). Never confuse them.
9. **Production is LIVE:** content-intelligence-eight.vercel.app auto-deploys from main. Inngest Cloud + n8n workflow are active. Test locally before pushing.
10. **DANGER: NEVER use drizzle-kit push** — Supabase DB has 7 tables from another project. `drizzle-kit push` tries to DELETE them (~2,200 rows). Schema changes: edit Drizzle schema file + apply SQL directly via postgres-js or Supabase MCP.
10. **Connector strategy plan:** Read `/Users/neerajkumar/.claude/plans/unified-sniffing-island.md` for the 13-part deep research plan before starting Phase 4B.

## Task Completion Protocol (MANDATORY after every task)

```
1. Code the task
2. pnpm build — must pass
3. pnpm dev — check on localhost
4. Commit with descriptive message
5. Update ultra-plan/PROGRESS.md — mark task DONE with verification result
6. Update ultra-plan/CHANGELOG.md — what changed, why, which files
7. Update ultra-plan/QA-RESULTS.md — build/test results
8. If mistake found → add to ultra-plan/LEARNINGS.md
9. If dependency changed → update ultra-plan/DEPENDENCY-MAP.md
10. Push after every 2-3 tasks
```

## Tracking Files (separate concerns, separate files)

| File | Purpose | Update When |
|------|---------|-------------|
| `ultra-plan/PROGRESS.md` | Checklist of all micro tasks with status | Every task completion |
| `ultra-plan/CHANGELOG.md` | What changed, why, which files, impact | Every task completion |
| `ultra-plan/QA-RESULTS.md` | Build/test/localhost verification results | Every QA check |
| `ultra-plan/LEARNINGS.md` | Mistakes, gotchas, what NOT to do | When something breaks or surprises |
| `ultra-plan/DEPENDENCY-MAP.md` | What depends on what, cascade impact | When adding/changing dependencies |
| `ultra-plan/ULTRA-PLAN.md` | Full architecture plan (20 parts) | When architecture decisions change |
| `ultra-plan/.env.example` | All required environment variables | When new env vars added |

## Key File Locations

| Purpose | Path |
|---------|------|
| Ultra Plan (main) | `ultra-plan/ULTRA-PLAN.md` |
| Progress tracking | `ultra-plan/PROGRESS.md` |
| Design handoff spec | `design_handoff_content_intelligence_agent/CLAUDE.md` |
| Screen inventory | `design_handoff_content_intelligence_agent/README.md` |
| Dev prompts | `design_handoff_content_intelligence_agent/DEV_PROMPTS.md` |
| Design tokens | `design_handoff_content_intelligence_agent/app/tokens.css` |
| Connectors spec (prototype) | `design_handoff_content_intelligence_agent/app/screens/govern.jsx` |
| Drizzle schema (LIVE) | `src/db/schema/*.ts` (9 files, 28 tables) |
| DB client | `src/db/index.ts` (postgres-js, prepare: false) |
| Drizzle config | `drizzle.config.ts` |
| Migration SQL | `drizzle/0000_great_jocasta.sql` |
| Platform enum | `src/lib/platforms.ts` |
| Error handling | `src/lib/errors/app-error.ts`, `circuit-breaker.ts`, `rate-limiter.ts` |
| Connector types | `src/lib/connectors/types.ts` (PublishInput, MediaConstraints, etc.) |
| Token manager | `src/lib/security/token-manager.ts` (AES-256-GCM) |
| Workspace isolation | `src/lib/security/scoped-db.ts` |
| Logging | `src/lib/logging/index.ts` (structured JSON + trace IDs) |
| Feature flags | `src/lib/feature-flags/index.ts` (3-level scoping) |
| Audit log | `src/lib/audit/index.ts` (append-only) |
| Health endpoint | `src/app/api/health/route.ts` |
| tRPC init + context | `src/server/context.ts`, `src/server/trpc.ts` |
| tRPC middleware | `src/server/middleware.ts` (auth → workspace → trace) |
| tRPC routers (11) | `src/server/routers/*.ts` (brand, brief, corpus, rules, connectors, ideas, drafts, schedule, audit, onboarding, signals) |
| tRPC app router | `src/server/routers/_app.ts` |
| tRPC API route | `src/app/api/trpc/[trpc]/route.ts` |
| tRPC client hooks | `src/lib/trpc/client.tsx` |
| tRPC server caller | `src/lib/trpc/server.ts` |
| Brief router | `src/server/routers/brief.ts` (create, get, list, diff) |
| Corpus router | `src/server/routers/corpus.ts` (add, list, delete) |
| Brand Brief page | `src/app/(app)/brand/page.tsx` |
| Anti-AI Rules page | `src/app/(app)/rules/page.tsx` |
| Connectors page | `src/app/(app)/connectors/page.tsx` |
| Onboarding wizard | `src/app/onboarding/page.tsx` + `src/components/onboarding/*.tsx` |
| Clerk sign-in/sign-up | `src/app/sign-in/`, `src/app/sign-up/` |
| Clerk middleware | `src/middleware.ts` |
| OAuth flow (start+callback) | `src/app/api/auth/oauth/[platform]/start/`, `callback/` |
| OAuth encrypt/state/registry | `src/lib/connectors/oauth/*.ts` |
| LinkedIn OAuth adapter | `src/lib/connectors/oauth/linkedin.ts` |
| Default anti-AI rules (62) | `src/lib/rules/default-rules.ts` |
| Voice style templates | `src/components/onboarding/voice-templates.ts` |
| Inngest client + events | `src/server/inngest/client.ts`, `events.ts` |
| Inngest functions (6, AT FREE PLAN LIMIT) | `src/server/inngest/functions/*.ts` (corpus-backfill, corpus-embed-item, process-signal, publish-post, verify-post, generate-draft) |
| Inngest serve route | `src/app/api/inngest/route.ts` |
| Gemini embedding utility | `src/lib/ai/embed.ts` (gemini-embedding-001, 3072 dims, glass-box) |
| n8n webhook endpoint | `src/app/api/webhooks/n8n/route.ts` (HMAC-SHA256) |
| Webhook utilities | `src/lib/webhooks/verify-hmac.ts`, `schemas.ts` |
| Signals router | `src/server/routers/signals.ts` (source config CRUD + backfill) |
| Idea Wall page | `src/app/(app)/ideas/page.tsx` + `src/components/ideas/*.tsx` |
| Connector adapter interface | `src/lib/connectors/adapter.ts` (ConnectorAdapter + BaseAdapter) |
| Adapter registry | `src/lib/connectors/registry.ts` (getAdapter/registerAdapter) |
| LinkedIn publishing adapter | `src/lib/connectors/adapters/linkedin.ts` (publish/verify/delete/refresh/healthProbe) |
| Inngest publish function | `src/server/inngest/functions/publish-post.ts` (10-step pipeline + token decrypt/refresh) |
| Inngest verify function | `src/server/inngest/functions/verify-post.ts` (ghost detection) |
| Inngest generate-draft function | `src/server/inngest/functions/generate-draft.ts` (5-step: context→prompt→LLM→save) |
| LLM generation utility | `src/lib/ai/generate.ts` (Gemini 2.0 Flash, glass-box, structured JSON output — single-provider, superseded by llm-router) |
| LLM Router | `src/lib/ai/llm-router.ts` (Google AI + Anthropic + OpenRouter, routes by modelId, glass-box) |
| Models config | `src/lib/ai/models.ts` (5 models, 3 providers, Standard + Thinking categories) |
| Model picker dropdown | `src/components/ui/model-select.tsx` (provider SVG logos, dropUp prop, grouped sections) |
| Confirm dialog | `src/components/ui/confirm-dialog.tsx` (styled modal, replaces native confirm()) |
| Prompt seed utility | `src/lib/ai/seed.ts` (DB-stored prompts, hardcoded fallback) |
| Add Source dialog | `src/components/ideas/add-source-dialog.tsx` |
| Drafts list page | `src/app/(app)/drafts/page.tsx` (status filter tabs, replaced stub) |
| Draft editor page | `src/app/(app)/drafts/[id]/page.tsx` (auto-poll, edit, approve, publish, model picker, copy/download/share) |
| Supabase RPC functions | `match_brand_corpus()`, `match_signal_ideas()` (in DB, not files) |
| Dev seed script | `src/db/seed.ts` (uses pg, not neon HTTP) |
| Reference code (paste-ready) | `ultra-plan/reference/01-06*.md` |
| n8n workflow code (ready) | `ultra-plan/n8n-workflows/` |
| n8n Signal Harvester (LIVE) | Workflow `qrnItYAUlVcgchZO` on full-funnel.app.n8n.cloud |
| Blotato references | `knowledge_base/blotato_references/` |
| Brand guidelines PDF | `knowledge_base/FullFunnel_Brand Guidelines.pdf` |

## Platform API Gotchas (Top 10 — verified May 2026)

1. **X/Twitter:** No free tier since Feb 2026. Pay-per-use: $0.015/post, $0.20 with URL. Auth code expires in 30 SECONDS.
2. **Instagram:** JPEG ONLY via API (no PNG). 50 containers/24h. No 3:4 aspect ratio via API.
3. **TikTok:** Unaudited apps = SELF_ONLY privacy only. `is_aigc: true` mandatory for AI content since Sep 2025.
4. **LinkedIn:** Refresh token TTL does NOT reset on refresh — counts down from original 365-day grant.
5. **Threads:** Separate OAuth from Instagram. URL-only media upload. 500 char limit.
6. **YouTube:** Refresh token is PERMANENT in Production mode but 7 DAYS in Testing mode.
7. **Reddit:** AutoModerator silently removes posts (API returns success). Must verify unauthenticated.
8. **Beehiiv:** Default status is `confirmed` (auto-publish!). ALWAYS set status explicitly.
9. **Bluesky:** Rich text facets use BYTE offsets (not character offsets). Critical for emoji/Unicode.
10. **Facebook:** Page tokens never expire. Rate limit = 4,800 x engaged_users per 24h.

## Token Refresh Schedule

| Platform | Token TTL | Refresh Cron |
|----------|-----------|-------------|
| TikTok | 24h | `0 */20 * * *` (every 20h) |
| X/Twitter | 2h | `*/90 * * * *` (every 90min) |
| YouTube | 1h | `*/45 * * * *` (every 45min) |
| Reddit | 1h | `*/45 * * * *` (every 45min) |
| LinkedIn | 60d | `0 0 * * 1` (weekly) |
| Meta (FB/IG/Threads) | 60d | `0 0 1 * *` (monthly) |
| Bluesky | Session | N/A (app password) |
| Beehiiv | Never | N/A (API key) |

## Build Phases

| Phase | What | Status |
|-------|------|--------|
| 0 | Foundation (errors, logging, audit, feature flags, health, scopedDb) | DONE |
| 1 | Scaffolding (Next.js, design system, shell, routes) | DONE |
| 2 | Data Model (tRPC v11, 10 routers, seed data) | DONE |
| 2.5 | Quality Fixes (SQL queries, NOT_FOUND, display mapping) | DONE |
| 3 | Brand Brief + Anti-AI Rules (CRUD, versioning, strict mode, 2 UI pages) | DONE |
| 3.5 | Onboarding Wizard (4 steps, Clerk auth, middleware, voice templates) | DONE |
| 4A | Connector OAuth (LinkedIn OAuth, encrypt, sign-in/sign-up, connectors page) | DONE |
| 4A-wire | Onboarding DB wiring (5 mutations, Clerk org, postgres-js, Supavisor, toast, dark theme) | DONE |
| 5 (5A-5E) | Signal Ingestion (Inngest, Gemini embed, webhook, pipeline, Idea Wall, n8n workflow) | DONE |
| SCOPE-FIX | Workspace UUID retrofit (scopedDb async, 8 routers fixed, cross-tenant vuln fixed) | DONE |
| CP0 | Checkpoint 0: Vercel deploy, Inngest Cloud, n8n activated, E2E verified (1.7s/signal) | DONE |
| CP1 | Checkpoint 1: Publishing Foundation (adapter interface, publish pipeline, tRPC mutations) | DONE |
| Add Source | Add Source dialog + SourceRail actions (toggle, delete) — E2E tested | DONE |
| VS | Vertical Slice: Idea → Draft → LinkedIn publish (generation, editor, LinkedIn adapter) | DONE |
| 4B | Connector Publishing Adapters (LinkedIn done; 14 platforms remaining) | IN PROGRESS |
| 6 | Drafts + 7-Dim Grading (generation done; grading NOT STARTED) | IN PROGRESS |
| 7 | Schedule + Publish (idempotency, fan-out, ghost detection) | NOT STARTED |
| 8 | Insights + Remaining (home, competitors, prompt studio) | NOT STARTED |
