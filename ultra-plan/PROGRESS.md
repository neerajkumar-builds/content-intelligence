# Content Intelligence Agent — Build Progress

> Last updated: 2026-05-12 (Session 9 COMPLETE — 18 commits, ~2,200 lines)
> Current phase: All 4 checkpoints + data quality fixes + UX polish done.
> Next action: Manual sync button → Date filter → Brand Brief auto-generate → Prompt Studio → Signal Explorer

---

## Quick Status

| Phase | Status | Branch | PR |
|-------|--------|--------|----|
| 0 — Foundation | DONE | `ultra-plan/foundation` | Merged (PR #1) |
| 1 — Scaffolding | DONE | `claude/refine-local-plan-0mbkl` | Merged (PR #1) |
| 2 — Data Model | DONE | `phase-2/data-model` | Merged (PR #2) |
| 3 — Brand Brief + Rules | DONE | `phase-3/brand-brief-rules` | Merged (PR #4) |
| 3.5 — Onboarding | DONE | `phase-3.5/onboarding-wizard` | Merged (PR #5) |
| 4A — Connector OAuth | DONE | `phase-4a/connector-oauth` | Merged (PR #6) |
| 4A-wire — Onboarding DB Wiring | DONE | `main` | Pending |
| 5A — Inngest + Embeddings | DONE | `main` | Session 6 |
| 5B — Schema Migration + Corpus Backfill | DONE | `main` | Session 6 |
| 5C — Webhook + Signal Processing | DONE | `main` | Session 6 |
| 5D — Routers + Idea Wall UI | DONE | `main` | Session 6 |
| SCOPE-FIX — Workspace UUID Retrofit | DONE | `main` | Session 7 |
| 5E — n8n Workflow Deployment | DONE | n8n Cloud | Session 7 |
| CP0 — Vercel Deploy + Inngest Cloud + n8n Activation | DONE | Vercel + n8n | Session 7 |
| CP1 — Publishing Foundation (adapter interface, publish pipeline, tRPC mutations) | DONE | `main` | Session 8 |
| Add Source UI — dialog + SourceRail actions | DONE | `main` | Session 8 |
| VS — Vertical Slice (Idea→Draft→LinkedIn publish, end-to-end) | DONE | `main` | Session 8 |
| Multi-Model — LLM Router (3 providers, 5 models, custom picker) | DONE | `main` | Session 8 |
| UI Polish — Lora font, stuck draft timeout, channel labels, loader, title wrap | DONE | `main` | Session 8 |
| S9-Fix — Model display bug + Idea Wall draft status + SourceRail icons | DONE | `main` | Session 9 |
| S9-Popover — Generate Popover (channel + format + model selection) | DONE | `main` | Session 9 |
| S9-Limits — Verified char limits against official API docs | DONE | `main` | Session 9 |
| S9-CkptA — Source link on IdeaCard + dedupScore for near-misses | DONE | `main` | Session 9B |
| S9-CkptB — Config consolidation (3 config files, 5 consumers updated) | DONE | `main` | Session 9B |
| S9-CkptC — Brand Brief page wired (edit, version history, diff) | DONE | `main` | Session 9B |
| S9-CkptD — Regenerate with instructions + draft version snapshots | DONE | `main` | Session 9B |
| S9-UX — Instruction area visibility + version preview + snapshot refresh | DONE | `main` | Session 9B |
| S9-Data — Hot score fix + freshness fix + publishedAt + sort by relevance | DONE | `main` | Session 9B |
| 4B — Connector Publishing | IN PROGRESS (LinkedIn adapter done) | `main` | Session 8 |
| 6 — Drafts + Grading | IN PROGRESS (generation done, grading NOT STARTED) | `main` | Session 8 |
| 7 — Schedule + Publish | NOT STARTED | — | — |
| 8 — Insights + Remaining | NOT STARTED | — | — |

---

## Phase 0: Foundation — Micro Tasks

| # | Task | Files | Status | Verified | Committed | Session |
|---|------|-------|--------|----------|-----------|---------|
| 0.1 | AppError class + error taxonomy | `src/lib/errors/app-error.ts`, `src/lib/platforms.ts` | DONE | pnpm build OK | c254402 | 2026-05-11 |
| 0.2 | pgEnums (10 enums) | `src/db/schema/enums.ts` | DONE | pnpm build OK | e95b21a | 2026-05-11 |
| 0.3 | Workspaces schema (workspaces, members, feature_flags) | `src/db/schema/workspaces.ts` | DONE | pnpm build OK | 14fd843 | 2026-05-11 |
| 0.4 | Brands schema (brands, briefs, corpus, rules) | `src/db/schema/brands.ts` | DONE | pnpm build OK | a327bf2 | 2026-05-11 |
| 0.5 | Connectors schema (connectors, oauth, test_results) | `src/db/schema/connectors.ts` | DONE | pnpm build OK | 3017437 | 2026-05-11 |
| 0.6 | Content schema (signals, ideas, drafts, grades, hits) | `src/db/schema/signals.ts`, `content.ts` | DONE | pnpm build OK | 6bb6ced | 2026-05-11 |
| 0.7 | Publishing schema (schedules, posts, post_results) | `src/db/schema/publishing.ts` | DONE | pnpm build OK | db01a0c | 2026-05-11 |
| 0.8 | AI + Ops schema (prompts, model_routes, ai_calls, audit_log, exports, DLQ) | `src/db/schema/ai.ts`, `ops.ts` | DONE | pnpm build OK | 95d3ec9 | 2026-05-11 |
| 0.9 | Schema barrel export + DB client | `src/db/schema/index.ts`, `src/db/index.ts`, `drizzle.config.ts` | DONE | pnpm build OK | 0f57870 | 2026-05-11 |
| 0.10 | Run first migration against Supabase | `drizzle/0000_great_jocasta.sql` | DONE | 27 tables live | a389b22 | 2026-05-11 |
| 0.11 | Verify all 27 tables exist in Supabase | — | DONE | 35 total (27 new + 8 pre-existing) | — | 2026-05-11 |
| 0.12 | Circuit breaker | `src/lib/errors/circuit-breaker.ts` | DONE | pnpm build OK | a0e9586 | 2026-05-11 |
| 0.13 | Rate limiter | `src/lib/errors/rate-limiter.ts` | DONE | pnpm build OK | 205fec8 | 2026-05-11 |
| 0.14 | Connector types (Platform enum, PublishInput union) | `src/lib/connectors/types.ts` | DONE | pnpm build OK | b0990fc | 2026-05-11 |
| 0.15 | Token manager (AES-256-GCM) | `src/lib/security/token-manager.ts` | DONE | pnpm build OK | 35dfae9 | 2026-05-11 |
| 0.16 | Workspace isolation (scopedDb helper) | `src/lib/security/scoped-db.ts` | DONE | pnpm build OK | 82a2a12 | 2026-05-11 |
| 0.17 | Health endpoint skeleton | `src/app/api/health/route.ts` | DONE | pnpm build OK | 82a2a12 | 2026-05-11 |
| 0.18 | Structured logging + trace ID | `src/lib/logging/index.ts` | DONE | pnpm build OK | 82a2a12 | 2026-05-11 |
| 0.19 | Feature flags utility | `src/lib/feature-flags/index.ts` | DONE | pnpm build OK | 82a2a12 | 2026-05-11 |
| 0.20 | Audit log write utility | `src/lib/audit/index.ts` | DONE | pnpm build OK | 82a2a12 | 2026-05-11 |

## Phase 1: Scaffolding (DONE)

| # | Task | Status | Verified | Session |
|---|------|--------|----------|---------|
| 1.1 | Next.js 15 + React 19 + Tailwind 4 | DONE | build clean | Web (Ultraplan) |
| 1.2 | Design tokens ported | DONE | light/dark themes | Web |
| 1.3 | Primitives (Icon, ChannelMark, ScoreSwatch, Sparkline, Tooltip, Avatar) | DONE | render correct | Web |
| 1.4 | AppShell (Sidebar, TopBar, BrandSwitcher, UserMenu) | DONE | nav works | Web |
| 1.5 | 17+ route stubs | DONE | all resolve | Web |
| 1.6 | Fonts (Montserrat, JetBrains Mono, Lora) | DONE | render correct | Web |
| 1.7 | Build + push to GitHub | DONE | +9,744 lines | Web |

## Phase 2: Data Model (DONE)

| # | Task | Files | Status | Verified | Committed | Session |
|---|------|-------|--------|----------|-----------|---------|
| 2.1 | tRPC init + context + base procedures | `src/server/context.ts`, `src/server/trpc.ts` | DONE | pnpm build OK | 483ff85 | 2026-05-11 |
| 2.2 | tRPC middleware (auth, workspace, trace) | `src/server/middleware.ts` | DONE | pnpm build OK | 483ff85 | 2026-05-11 |
| 2.3 | API route handler | `src/app/api/trpc/[trpc]/route.ts` | DONE | pnpm build OK | 483ff85 | 2026-05-11 |
| 2.4 | Client provider + hooks | `src/lib/trpc/client.tsx`, `query-client.ts`, `server.ts` | DONE | pnpm build OK | 483ff85 | 2026-05-11 |
| 2.5 | Brand router | `src/server/routers/brand.ts` | DONE | pnpm build OK | e5636b5 | 2026-05-11 |
| 2.6 | Rules router | `src/server/routers/rules.ts` | DONE | pnpm build OK | e5636b5 | 2026-05-11 |
| 2.7 | Connectors router | `src/server/routers/connectors.ts` | DONE | pnpm build OK | e5636b5 | 2026-05-11 |
| 2.8 | Ideas router | `src/server/routers/ideas.ts` | DONE | pnpm build OK | e5636b5 | 2026-05-11 |
| 2.9 | Drafts router | `src/server/routers/drafts.ts` | DONE | pnpm build OK | e5636b5 | 2026-05-11 |
| 2.10 | Schedule router | `src/server/routers/schedule.ts` | DONE | pnpm build OK | e5636b5 | 2026-05-11 |
| 2.11 | Audit router | `src/server/routers/audit.ts` | DONE | pnpm build OK | e5636b5 | 2026-05-11 |
| 2.12 | App router (merge all) | `src/server/routers/_app.ts` | DONE | pnpm build OK | e5636b5 | 2026-05-11 |
| 2.13 | Dev seed data | `src/db/seed.ts` + Supabase MCP | DONE | 45 rows seeded | 006d8f0 | 2026-05-11 |
| 2.14 | Build verify + tracking | — | DONE | pnpm build OK | — | 2026-05-11 |

## Phase 3: Brand Brief + Anti-AI Rules (DONE)

| # | Task | Status | Verified | Committed |
|---|------|--------|----------|-----------|
| 3.1 | Schema changes (strictMode, changelog, patternType, nullable embedding) | DONE | pnpm build OK + migration applied | 32818ed |
| 3.2 | Fix logging as any, scopedDb TRPCError, mutation NOT_FOUND | DONE | pnpm build OK | bcee700 |
| 3.3 | brand.create + toggleStrictMode | DONE | pnpm build OK | 73acb7d |
| 3.4 | Brief router (create, get, list, diff) | DONE | pnpm build OK | 0356bd0 |
| 3.5 | Corpus router (add, list, delete) | DONE | pnpm build OK | 7d5ddcf |
| 3.6 | Rules get + delete + patternType + router registration | DONE | pnpm build OK | 936212c |
| 3.7 | Seed brand briefs, corpus, regex rules | DONE | counts verified | via MCP |
| 3.8 | Brand Brief page UI | DONE | pnpm build OK | 8a74f4e |
| 3.9 | Anti-AI Rules page UI | DONE | pnpm build OK | 3c3e175 |

## Phase 4A-wire: Onboarding DB Wiring (DONE)

| # | Task | Files | Status | Verified | Session |
|---|------|-------|--------|----------|---------|
| 4Aw.1 | Add TRPCProvider to onboarding layout | `src/app/onboarding/layout.tsx` | DONE | pnpm build OK | 2026-05-11 |
| 4Aw.2 | Wire all 5 mutations + Clerk org creation to onboarding page | `src/app/onboarding/page.tsx` | DONE | pnpm build OK | 2026-05-11 |
| 4Aw.3 | Fix app layout redirect for null orgId | `src/app/(app)/layout.tsx` | DONE | pnpm build OK | 2026-05-11 |
| 4Aw.4 | Make saveGuardrails idempotent (delete before insert) | `src/server/routers/onboarding.ts` | DONE | pnpm build OK | 2026-05-11 |
| 4Aw.5 | Handle step 4 stuck state (auto-complete) | `src/app/onboarding/page.tsx` | DONE | pnpm build OK | 2026-05-11 |
| 4Aw.6 | Enable Clerk Organizations (Membership required) | Clerk dashboard | DONE | Dialog confirmed | 2026-05-11 |
| 4Aw.7 | E2E test (sign-in → onboarding → Supabase) | — | DONE | All 5 tables verified | 2026-05-11 |
| 4Aw.8 | Fix DB driver (neon-http → postgres-js) | `src/db/index.ts` | DONE | pnpm build OK | 2026-05-11 |
| 4Aw.9 | Fix Supabase connection (Supavisor migration) | `.env.local` | DONE | SELECT count(*) OK | 2026-05-11 |
| 4Aw.10 | Fix antiAiRules UUID mismatch (Clerk orgId vs workspace.id) | `onboarding.ts` | DONE | 57 rules inserted | 2026-05-11 |
| 4Aw.11 | Toast notifications (sonner) | `layout.tsx`, `page.tsx` | DONE | pnpm build OK | 2026-05-11 |
| 4Aw.12 | Theme detection (OS prefers-color-scheme fallback) | `theme-provider.tsx` | DONE | Dark mode in incognito | 2026-05-11 |
| 4Aw.13 | Redesign welcome + sign-in/sign-up pages | 3 files | DONE | Dark theme, animations | 2026-05-11 |

## Phase 5A: Inngest Infrastructure + Embedding Utility (DONE)

| # | Task | Files | Status | Verified | Session |
|---|------|-------|--------|----------|---------|
| 5A.1 | Inngest client | `src/server/inngest/client.ts` | DONE | pnpm build OK | 2026-05-11 |
| 5A.2 | Typed events with Zod (3 events) | `src/server/inngest/events.ts` | DONE | pnpm build OK | 2026-05-11 |
| 5A.3 | Inngest serve route | `src/app/api/inngest/route.ts` | DONE | pnpm build OK | 2026-05-11 |
| 5A.4 | Gemini embedding utility (3072 dims, glass-box) | `src/lib/ai/embed.ts` | DONE | pnpm build OK | 2026-05-11 |
| 5A.5 | Remove dead @neondatabase/serverless from package.json | `package.json` | DONE | pnpm build OK | 2026-05-11 |

## Phase 5B: Schema Migration + Corpus Backfill (DONE)

| # | Task | Files | Status | Verified | Session |
|---|------|-------|--------|----------|---------|
| 5B.1 | Migrate vector(1536) to halfvec(3072) on brand_corpus + signals | `src/db/schema/brands.ts`, `signals.ts` | DONE | Supabase verified | 2026-05-11 |
| 5B.2 | Rebuild HNSW indexes with halfvec_cosine_ops (m=16, ef=64) | Migration SQL | DONE | Supabase verified | 2026-05-11 |
| 5B.3 | Create signal_source_configs table | `src/db/schema/signals.ts` | DONE | pnpm build OK | 2026-05-11 |
| 5B.4 | Create match_brand_corpus + match_signal_ideas RPC functions | Supabase RPCs | DONE | Supabase verified | 2026-05-11 |
| 5B.5 | Corpus-backfill Inngest function | `src/server/inngest/functions/` | DONE | 3 functions registered | 2026-05-11 |
| 5B.6 | Corpus-embed-item Inngest function | `src/server/inngest/functions/` | DONE | 3 functions registered | 2026-05-11 |
| 5B.7 | corpus.ts router emits Inngest event on new items | `src/server/routers/corpus.ts` | DONE | pnpm build OK | 2026-05-11 |

## Phase 5C: Webhook + Signal Processing Pipeline (DONE)

| # | Task | Files | Status | Verified | Session |
|---|------|-------|--------|----------|---------|
| 5C.1 | n8n webhook endpoint with HMAC-SHA256 | `src/app/api/webhooks/n8n/route.ts` | DONE | curl 202 Accepted | 2026-05-11 |
| 5C.2 | HMAC verify utility (timingSafeEqual) | `src/lib/security/hmac.ts` | DONE | pnpm build OK | 2026-05-11 |
| 5C.3 | Zod schemas for webhook payloads (single + batch) | Webhook route | DONE | pnpm build OK | 2026-05-11 |
| 5C.4 | process-signal Inngest function (embed, rank, dedup, create idea) | `src/server/inngest/functions/` | DONE | Completed in 5.5s | 2026-05-11 |
| 5C.5 | Atomic CTE for webhook_deliveries + signals insert (idempotency) | Webhook route | DONE | Idempotency verified | 2026-05-11 |

## Phase 5D: Enhanced Routers + Idea Wall UI (DONE)

| # | Task | Files | Status | Verified | Session |
|---|------|-------|--------|----------|---------|
| 5D.1 | Signals router (11 procedures) | `src/server/routers/signals.ts` | DONE | pnpm build OK | 2026-05-11 |
| 5D.2 | Ideas router rewrite (getById, dismiss, addManual, enhanced list) | `src/server/routers/ideas.ts` | DONE | pnpm build OK | 2026-05-11 |
| 5D.3 | Workspace UUID lookup for all queries (Clerk orgId != UUID) | All new routers | DONE | pnpm build OK | 2026-05-11 |
| 5D.4 | Register signals router in _app.ts (11 routers total) | `src/server/routers/_app.ts` | DONE | pnpm build OK | 2026-05-11 |
| 5D.5 | IdeaCard, SourceRail, FilterBar components | `src/components/ideas/` | DONE | UI renders | 2026-05-11 |
| 5D.6 | Idea Wall full implementation (replaced placeholder) | `src/app/(app)/ideas/page.tsx` | DONE | Card renders | 2026-05-11 |

## Phase 5 Self-Review Fixes (DONE)

| # | Task | Status | Session |
|---|------|--------|---------|
| SR.1 | HMAC timing-safe comparison | DONE | 2026-05-11 |
| SR.2 | Postgres error code 23505 detection (not string matching) | DONE | 2026-05-11 |
| SR.3 | Atomic CTE for webhook insert | DONE | 2026-05-11 |
| SR.4 | dismiss uses hotScore=0 (not -1, violated CHECK constraint) | DONE | 2026-05-11 |
| SR.5 | Workspace scoping on getById, dismiss, toggleSource, deleteSource | DONE | 2026-05-11 |
| SR.6 | Brand ownership check on triggerBackfill | DONE | 2026-05-11 |
| SR.7 | Skip duplicate ideas (dedup > 0.85) | DONE | 2026-05-11 |
| SR.8 | Error status logging in embed.ts | DONE | 2026-05-11 |
| SR.9 | Cache invalidation after dismiss | DONE | 2026-05-11 |
| SR.10 | Inngest send failure logging | DONE | 2026-05-11 |
| SR.11-16 | Additional workspace scoping + error handling fixes | DONE | 2026-05-11 |

## Phase 5 Additional Fixes (DONE)

| # | Task | Files | Status | Session |
|---|------|-------|--------|---------|
| AF.1 | User menu top bar in onboarding layout | `src/app/onboarding/layout.tsx` | DONE | 2026-05-11 |
| AF.2 | "Skip to dashboard" button on onboarding welcome | `src/app/onboarding/page.tsx` | DONE | 2026-05-11 |
| AF.3 | Remove hardcoded sidebar badge counts (23/4/12) | `src/components/shell/` | DONE | 2026-05-11 |

## Phase 5E: n8n Workflow Deployment (DONE — Session 7)

| # | Task | Status | Verified | Session |
|---|------|--------|----------|---------|
| 5E.1 | Deploy RSS Signal Harvester n8n workflow (qrnItYAUlVcgchZO) | DONE | Workflow active, 30min cron | 2026-05-11 |
| 5E.2 | Seed 5 RSS source configs (SaaStr, HubSpot, Tomasz Tunguz, Lenny, First Round Review) | DONE | 5 rows in signal_source_configs (1 disabled — First Round 404) | 2026-05-11 |
| 5E.3 | Configure n8n Supabase credential for source config reads | DONE | n8n reads configs successfully | 2026-05-11 |
| 5E.4 | Set production webhook URL in n8n Code node | DONE | POSTs to content-intelligence-eight.vercel.app/api/webhooks/n8n | 2026-05-11 |
| 5E.5 | Set HMAC secret in n8n Code node | DONE | HMAC-SHA256 verified by webhook endpoint | 2026-05-11 |

> **Note:** Reddit, competitor, and thought leader workflows deferred — RSS-only for MVP. Additional workflows can reuse the same webhook endpoint.

## Scope Fix: Workspace UUID Retrofit (DONE — Session 7)

| # | Task | Status | Verified | Committed | Session |
|---|------|--------|----------|-----------|---------|
| SF.1 | Make scopedDb() async (resolves Clerk orgId -> UUID internally) | DONE | pnpm build OK | d6c88cc | 2026-05-11 |
| SF.2 | Fix 8 routers (24 procedures) to await scopedDb | DONE | pnpm build OK | d6c88cc | 2026-05-11 |
| SF.3 | Fix corpus.delete cross-tenant vulnerability | DONE | pnpm build OK | d6c88cc | 2026-05-11 |
| SF.4 | Complete corpus backfill (13/13 items embedded across 3 brands) | DONE | Gemini embeddings verified | 7861458 | 2026-05-11 |

## Checkpoint 0: Production Deploy + Inngest Cloud + n8n Activation (DONE — Session 7)

| # | Task | Status | Verified | Committed | Session |
|---|------|--------|----------|-----------|---------|
| CP0.1 | First Vercel production deploy | DONE | content-intelligence-eight.vercel.app live | eb13392 | 2026-05-11 |
| CP0.2 | Inngest Cloud connected via Vercel integration | DONE | 3 functions synced, keys auto-injected | — | 2026-05-11 |
| CP0.3 | Fix process-signal concurrency (20 -> 5, Supabase saturation) | DONE | Inngest Cloud accepted | 8b7fc8e | 2026-05-11 |
| CP0.4 | Fix Clerk middleware (exclude api/webhooks, api/health, api/inngest) | DONE | n8n + Inngest Cloud unblocked | 1ceeecb | 2026-05-11 |
| CP0.5 | Activate n8n workflow with production URL | DONE | Workflow sends to Vercel URL | — | 2026-05-11 |
| CP0.6 | E2E pipeline verified: n8n RSS -> webhook -> Inngest -> embed -> rank -> idea | DONE | 1.7s per signal, 121 signals ingested | — | 2026-05-11 |
| CP0.7 | Deep connector strategy research (13-part plan) | DONE | Plan at ~/.claude/plans/unified-sniffing-island.md | 54debee | 2026-05-11 |
| CP0.8 | Competitor analysis (Blotato, Hootsuite, Taplio, Typefully, Copy.ai) | DONE | Documented in connector architecture revised | 76b517b | 2026-05-11 |

---

## Checkpoint 1: Publishing Foundation (DONE — Session 8)

| # | Task | Status | Verified | Committed | Session |
|---|------|--------|----------|-----------|---------|
| CP1.1 | Extend error taxonomy + platform error mapping | DONE | pnpm build OK | ee88a9a | 2026-05-12 |
| CP1.2 | ConnectorAdapter interface + BaseAdapter abstract class | DONE | pnpm build OK | ee88a9a | 2026-05-12 |
| CP1.3 | Adapter registry (platform → adapter lookup) | DONE | pnpm build OK | ee88a9a | 2026-05-12 |
| CP1.4 | Inngest publish events (PostPublish, PostVerify, TokenRefreshDue) | DONE | pnpm build OK | ee88a9a | 2026-05-12 |
| CP1.5 | Inngest publish-post function (10-step pipeline + ghost delay) | DONE | pnpm build OK, 5 functions registered | ee88a9a | 2026-05-12 |
| CP1.6 | Inngest verify-post function (ghost detection at +10min) | DONE | pnpm build OK | ee88a9a | 2026-05-12 |
| CP1.7 | tRPC publish/publishMulti/getPublishStatus mutations | DONE | pnpm build OK | ee88a9a | 2026-05-12 |

## Add Source UI (DONE — Session 8)

| # | Task | Status | Verified | Committed | Session |
|---|------|--------|----------|-----------|---------|
| AS.1 | Add Source dialog with per-type input fields | DONE | E2E tested in browser | 04ea302 | 2026-05-12 |
| AS.2 | SourceRail: + button, toggle enable/disable, delete per source | DONE | Toggle + delete verified | 04ea302 | 2026-05-12 |
| AS.3 | E2E: added "Sam Altman Blog" RSS → appeared in SourceRail + Supabase | DONE | Supabase query confirmed | — | 2026-05-12 |

---

## Vertical Slice: Idea → Draft → Publish (DONE — Session 8)

### Part A: Draft Generation Backend

| # | Task | Files | Status | Verified | Committed | Session |
|---|------|-------|--------|----------|-----------|---------|
| VS-A1 | 4 new draft mutations: generate, create, update, approve | `src/server/routers/drafts.ts` | DONE | pnpm build OK | 229ba7d | 2026-05-12 |
| VS-A2 | DraftGenerate Inngest event | `src/server/inngest/events.ts` | DONE | pnpm build OK | 229ba7d | 2026-05-12 |
| VS-A3 | LLM generation utility (Gemini 2.0 Flash, glass-box ai_calls logging) | `src/lib/ai/generate.ts` | DONE | pnpm build OK | 229ba7d | 2026-05-12 |
| VS-A4 | Prompt seed utility (DB-stored configurable prompts) | `src/lib/ai/seed.ts` | DONE | pnpm build OK | 229ba7d | 2026-05-12 |
| VS-A5 | generate-draft Inngest function (5 steps: context → prompt → LLM → save) | `src/server/inngest/functions/generate-draft.ts` | DONE | pnpm build OK | 229ba7d | 2026-05-12 |
| VS-A6 | Generate button on Idea Wall wired → redirect to /drafts/{id} | `src/app/(app)/ideas/page.tsx` | DONE | Browser E2E tested | 229ba7d | 2026-05-12 |

### Part B: Drafts UI

| # | Task | Files | Status | Verified | Committed | Session |
|---|------|--------|----------|-----------|---------|---------|
| VS-B1 | Drafts list page with status filters (replaced stub) | `src/app/(app)/drafts/page.tsx` | DONE | Browser verified | c6673d2 | 2026-05-12 |
| VS-B2 | Draft editor page (/drafts/[id]): auto-poll, edit, approve, publish | `src/app/(app)/drafts/[id]/page.tsx` | DONE | Browser verified | c6673d2 | 2026-05-12 |
| VS-B3 | Regenerate button + source idea link on editor | `src/app/(app)/drafts/[id]/page.tsx` | DONE | Browser verified | c6673d2 | 2026-05-12 |

### Part C: LinkedIn Adapter + Publish Wiring

| # | Task | Files | Status | Verified | Committed | Session |
|---|------|-------|--------|----------|-----------|---------|
| VS-C1 | LinkedIn adapter (publish, verify, delete, refreshToken, healthProbe) | `src/lib/connectors/adapters/linkedin.ts` | DONE | pnpm build OK | c6673d2 | 2026-05-12 |
| VS-C2 | Token decrypt + inline refresh in publish-post Inngest function | `src/server/inngest/functions/publish-post.ts` | DONE | pnpm build OK | c6673d2 | 2026-05-12 |
| VS-C3 | Publish button wired to real LinkedIn connector | `src/app/(app)/drafts/[id]/page.tsx` | DONE | pnpm build OK | c6673d2 | 2026-05-12 |
| VS-C4 | Inngest concurrency key fix ({{ }} template syntax → simple limits) | `src/server/inngest/functions/*.ts` | DONE | pnpm build OK | c6673d2 | 2026-05-12 |

## Multi-Model LLM Router (DONE — Session 8)

| # | Task | Files | Status | Verified | Committed | Session |
|---|------|-------|--------|----------|-----------|---------|
| MM.1 | LLM Router (llm-router.ts) — Google AI, Anthropic, OpenRouter providers | `src/lib/ai/llm-router.ts` | DONE | pnpm build OK | Session 8 | 2026-05-12 |
| MM.2 | Models config (models.ts) — Gemini 3.0 Flash, Claude Sonnet 4, Claude Opus 4, GPT-5.4, Gemini 3.1 Pro | `src/lib/ai/models.ts` | DONE | pnpm build OK | Session 8 | 2026-05-12 |
| MM.3 | generate-draft Inngest function updated to use llm-router.ts | `src/server/inngest/functions/generate-draft.ts` | DONE | pnpm build OK | Session 8 | 2026-05-12 |
| MM.4 | Custom model picker dropdown with provider SVG logos (Anthropic/OpenAI/Google) | `src/components/ui/model-select.tsx` | DONE | Browser verified | Session 8 | 2026-05-12 |
| MM.5 | Model picker groups: Standard Models + Thinking Models | `src/components/ui/model-select.tsx` | DONE | Browser verified | Session 8 | 2026-05-12 |
| MM.6 | dropUp prop for action bar placement | `src/components/ui/model-select.tsx` | DONE | Browser verified | Session 8 | 2026-05-12 |
| MM.7 | Model picker wired on Idea Wall (generate button) + Draft editor (regenerate) | `ideas/page.tsx`, `drafts/[id]/page.tsx` | DONE | Browser verified | Session 8 | 2026-05-12 |

## UI Polish (DONE — Session 8)

| # | Task | Files | Status | Verified | Committed | Session |
|---|------|-------|--------|----------|-----------|---------|
| UP.1 | Lora font applied to draft body textarea (brand guideline) | `drafts/[id]/page.tsx` | DONE | Browser verified | Session 8 | 2026-05-12 |
| UP.2 | Channel label mapping (linkedin → LinkedIn) | `drafts/[id]/page.tsx` | DONE | Browser verified | Session 8 | 2026-05-12 |
| UP.3 | Consistent button styles across action bar | `drafts/[id]/page.tsx` | DONE | Browser verified | Session 8 | 2026-05-12 |
| UP.4 | Improved generation loader with animated progress steps | `drafts/[id]/page.tsx` | DONE | Browser verified | Session 8 | 2026-05-12 |
| UP.5 | Stuck draft handling (>90s timeout → Retry/Delete buttons) | `drafts/[id]/page.tsx` | DONE | Browser verified | Session 8 | 2026-05-12 |
| UP.6 | Title textarea wraps instead of truncating | `drafts/[id]/page.tsx` | DONE | Browser verified | Session 8 | 2026-05-12 |
| UP.7 | ConfirmDialog component (styled, replaces native confirm()) | `src/components/ui/confirm-dialog.tsx` | DONE | Browser verified | Session 8 | 2026-05-12 |
| UP.8 | Copy/Download/Share actions on draft editor | `drafts/[id]/page.tsx` | DONE | Browser verified | Session 8 | 2026-05-12 |

---

## How to Update This File

After completing a micro task:
```
1. Change status: TODO → IN PROGRESS → DONE
2. Add verified column: "pnpm build OK" or "migration ran" or "localhost checked"
3. Add committed column: commit hash (first 7 chars)
4. Add session column: session date or ID
5. If task created learnings, add to LEARNINGS.md
6. If task changed dependencies, add to DEPENDENCY-MAP.md
```
