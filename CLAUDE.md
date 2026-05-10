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

- **Phase 0 (Foundation):** COMPLETE. Merged to `main` via PR #1. 27 tables live in Supabase.
- **Phase 1 (Scaffolding):** COMPLETE. Merged to `main` via PR #1. +9,744 lines.
- **Phase 2 (Data Model):** COMPLETE. Branch `phase-2/data-model`. tRPC v11, 7 routers, seed data.
- **Phases 3-8:** Not started. Next: Phase 3 (Brand Brief + Anti-AI Rules)
- **GitHub:** https://github.com/neerajkumar-builds/content-intelligence
- **n8n:** https://full-funnel.app.n8n.cloud/ (connected via MCP)

## How to Resume

1. Read `ultra-plan/PROGRESS.md` for current state and next task
2. Read `ultra-plan/LEARNINGS.md` for mistakes NOT to repeat
3. Check `ultra-plan/DEPENDENCY-MAP.md` before modifying any file
4. Check git branches: `main` (Phase 0+1 merged), `phase-2/data-model` (Phase 2)
5. Agent artifacts in `ultra-plan/reference/` have all code ready to paste
6. Design spec in `design_handoff_content_intelligence_agent/CLAUDE.md`

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
| Drizzle schema (LIVE) | `src/db/schema/*.ts` (9 files, 27 tables) |
| DB client | `src/db/index.ts` (@neondatabase/serverless) |
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
| tRPC routers (7) | `src/server/routers/*.ts` (brand, rules, connectors, ideas, drafts, schedule, audit) |
| tRPC app router | `src/server/routers/_app.ts` |
| tRPC API route | `src/app/api/trpc/[trpc]/route.ts` |
| tRPC client hooks | `src/lib/trpc/client.tsx` |
| tRPC server caller | `src/lib/trpc/server.ts` |
| Dev seed script | `src/db/seed.ts` (uses pg, not neon HTTP) |
| Reference code (paste-ready) | `ultra-plan/reference/01-06*.md` |
| n8n workflow code (ready) | `ultra-plan/n8n-workflows/` |
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
| 2 | Data Model (tRPC v11, 7 routers, seed data) | DONE |
| 3 | Brand Brief + Anti-AI Rules (CRUD, versioning, strict mode) | NOT STARTED |
| 4 | Connectors (15 adapters, circuit breaker, contract tests) | NOT STARTED |
| 5 | Idea Wall (n8n ingestion, pgvector ranking) | NOT STARTED |
| 6 | Drafts + 7-Dim Grading (core surface, glass-box) | NOT STARTED |
| 7 | Schedule + Publish (idempotency, fan-out, ghost detection) | NOT STARTED |
| 8 | Insights + Remaining (home, competitors, prompt studio, onboarding) | NOT STARTED |
