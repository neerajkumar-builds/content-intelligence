# Content Intelligence Agent — Changelog

> Format: `[DATE] [PHASE.TASK] — What changed (files) — Why — Impact`

---

## 2026-05-11

### Planning Session (Ultra Plan)

- **[PLAN] Ultra Plan created** — 20 parts, 11,800 lines across 7 files — Production-grade architecture for 15-platform connector system
  - Files: `ultra-plan/ULTRA-PLAN.md`, `ultra-plan/reference/01-06*.md`
  - Impact: Defines schema (27 tables), connector adapters (20 files), error handling, n8n workflows

- **[PLAN] API research completed** — Verified all 15 platform APIs against live docs
  - Key findings: X pay-per-use ($0.20/URL post), IG JPEG-only, TikTok SELF_ONLY for unaudited, YouTube 100 quota units/upload
  - Impact: Changes connector adapter implementations, rate limit configs, cost tracking

- **[PERSISTENCE] Context persistence layer created**
  - Files: `CLAUDE.md`, `ultra-plan/PROGRESS.md`, `ultra-plan/.env.example`
  - Memory: 9 files (3 existing + 6 new)
  - Impact: New sessions auto-load full project context

### Phase 0: Foundation (Local Session)

- **[0.16-0.20] Infrastructure utilities** — 5 files completing Phase 0
  - Files: scoped-db.ts, /api/health/route.ts, logging/index.ts, feature-flags/index.ts, audit/index.ts (322 lines)
  - What: scopedDb (composable workspace scope helper), health endpoint (DB check + 503 on degraded), structured JSON logging (trace IDs, child loggers), feature flags (3-level scoping: global < workspace < brand), audit log (append-only, batch writes)
  - Fix: scopedDb initially used `.from(table)` generic wrapper — Drizzle 0.45.2 strict types rejected it. Refactored to composable `scope(column)` pattern.
  - Commit: 82a2a12 on `ultra-plan/foundation`

- **[0.12-0.15] Error handling + connector infrastructure** — circuit breaker, rate limiter, connector types, token manager
  - Commits: a0e9586, 205fec8, b0990fc, 35dfae9

- **[0.10-0.11] First migration + verification** — 27 tables live in Supabase
  - Files: `drizzle/0000_great_jocasta.sql` (468 lines)
  - What: Generated via `drizzle-kit generate`, applied via Supabase MCP (`apply_migration`) in 3 batches. pgvector extension enabled. 10 enum types, 27 tables, 34 FKs, 60 indexes (2 HNSW, 7 partial, 1 CHECK)
  - Why: Schema must exist before tRPC, queries, or connector adapters
  - Method: No DATABASE_URL needed locally — used Supabase MCP instead of `drizzle-kit push`
  - Supabase project: FF_Internal_Initiatives (`burcfsxsxgabknmodsrd`)
  - Commit: a389b22 on `ultra-plan/foundation`

- **[0.6-0.8] Content + Publishing + AI + Ops schemas** — 16 tables across 4 files
  - Commit: 6bb6ced (content), db01a0c (publishing), 95d3ec9 (AI+ops)

- **[0.5] Connectors schema** — 3 tables: connectors, oauth_credentials, contract_test_results
  - Files: `src/db/schema/connectors.ts` (112 lines)
  - What: 15-platform connector with tier/state enums, encrypted OAuth creds (IV+tag for AES-256-GCM), contract test tracking with latency
  - Why: Publishing pipeline depends on connector state + token availability
  - Fix: Reference had `unique` imported but unused (`.unique()` is column method), `boolean` used but not imported
  - Note: Platform uses `"x"` here (Drizzle) vs `"twitter"` in TypeScript enum — intentional per reference, reconcile in Task 0.14
  - Commit: 3017437 on `ultra-plan/foundation`

- **[0.4] Brands schema** — 4 tables: brands, brand_briefs, brand_corpus, anti_ai_rules
  - Files: `src/db/schema/brands.ts` (118 lines)
  - What: Brand with voice score, immutable versioned briefs, pgvector corpus (HNSW index, 1536-dim), anti-AI rules with severity/category enums + channel scoping
  - Why: Core domain tables. Drafts, ideas, and AI calls all FK to brands.
  - Fix: Reference had `check` imported but unused, `unique` used but not imported — corrected imports
  - Commit: a327bf2 on `ultra-plan/foundation`

- **[0.3] Workspaces schema** — 3 tables: workspaces, members, feature_flags
  - Files: `src/db/schema/workspaces.ts` (83 lines)
  - What: Clerk org binding, plan tiers (creator/team/agency), AI budget tracking, member roles with brand access array, feature flags with 3-level scoping
  - Why: Root of all FK chains — every other schema table references workspaces.id
  - Commit: 14fd843 on `ultra-plan/foundation`

- **[0.2] pgEnums (10 enums)** — Drizzle pgEnum definitions for all schema tables
  - Files: `src/db/schema/enums.ts` (78 lines)
  - What: 10 pgEnums — postStatus, severity, connectorState, tier, memberRole, signalSource, ruleCategory, aiTaskType, exportFormat, exportStatus
  - Why: Every schema file (Tasks 0.3–0.8) imports from here. Must exist first.
  - Commit: e95b21a on `ultra-plan/foundation`

- **[0.1] AppError class + error taxonomy + Platform enum** — Error handling foundation
  - Files: `src/lib/errors/app-error.ts` (140 lines), `src/lib/platforms.ts` (17 lines)
  - What: ErrorClass type, AppErrorOptions interface, AppError class (toJSON, isRateLimited, isAuthError), 23 ErrorCodes, classifyHttpStatus()
  - Why: Every connector adapter, Inngest function, and tRPC error handler depends on this
  - Decision: Platform enum extracted to `src/lib/platforms.ts` (shared domain concept, not error-specific)
  - Commit: c254402 on `ultra-plan/foundation`
  - Flag: Drizzle schema uses `"x"` vs TypeScript enum `"twitter"` — reconcile in Task 0.2 or 0.14

### Phase 1 (Web Session — Ultraplan)

- **[1.1-1.7] Scaffolding complete** — Next.js 15 + React 19 + Tailwind 4, all routes, primitives, shell
  - Branch: `claude/refine-local-plan-0mbkl`
  - Files: +9,744 lines across `src/app/`, `src/components/`
  - Impact: Foundation for all UI work. No backend yet.

### Phase 0+1 Merge (PR #1)
- Merged `ultra-plan/foundation` → `main` (91 files, +29,912 lines)
- Both Phase 0 and Phase 1 now on `main`

### Phase 2: Data Model (Session 3)

- **2.1-2.4** tRPC v11 infrastructure
  - Files: `src/server/context.ts`, `trpc.ts`, `middleware.ts`, `src/server/routers/_app.ts`, `src/app/api/trpc/[trpc]/route.ts`, `src/lib/trpc/client.tsx`, `query-client.ts`, `server.ts`
  - Why: Bridge UI (Phase 1) and DB (Phase 0). Every subsequent phase depends on tRPC.
  - Impact: Full tRPC stack — context (Clerk auth + scopedDb + traceId), middleware chain (auth → workspace → trace), API route handler, client provider with React Query, server-side caller for RSC.

- **2.5-2.12** Domain routers (7 routers merged into appRouter)
  - Files: `src/server/routers/brand.ts`, `rules.ts`, `connectors.ts`, `ideas.ts`, `drafts.ts`, `schedule.ts`, `audit.ts`
  - Why: One router per domain, all workspace-scoped via scopedDb.
  - Impact: brand.get/list/update, rules.list/create/update, connectors.list, ideas.list (paginated), drafts.list/get (with grades), schedule.list (with joins), audit.list (paginated).
  - Bug fixed: rules.ts category enum had wrong values (structure/hedge/adverb → matched DB enum: punctuation/transition/filler/corporate/cliche/custom).

- **2.13** Dev seed data
  - Files: `src/db/seed.ts`, seeded via Supabase MCP (local DNS can't reach Supabase)
  - Why: Fixture data for UI rendering. Shapes match design handoff JSX files.
  - Impact: 1 workspace, 2 brands, 1 member, 12 rules, 5 connectors, 6 ideas, 3 drafts (2 graded), 4 schedules, 9 audit entries.

- **Deps added:** superjson, zod v4, server-only, pg (dev), tsx (dev)

### Phase 3: Brand Brief + Anti-AI Rules (Session 4)

- **3.1** Schema changes
  - Files: `src/db/schema/brands.ts`, `drizzle/0001_sparkling_red_wolf.sql`
  - Added: brands.strictMode (boolean), brandBriefs.changelog (text), antiAiRules.patternType (phrase/regex)
  - Changed: brandCorpus.embedding made nullable (for Phase 3 corpus upload without embeddings)

- **3.2** Production bug fixes
  - Files: `src/lib/logging/index.ts`, `src/lib/security/scoped-db.ts`, `src/server/routers/brand.ts`, `src/server/routers/rules.ts`
  - Fixed: 2x `as any` in logging → proper type guards, generic Error in scopedDb → TRPCError FORBIDDEN, brand.update + rules.update null → NOT_FOUND

- **3.3-3.6** Backend routers (12 new procedures)
  - brand.create, brand.toggleStrictMode
  - brief.create (versioned), brief.get, brief.list, brief.diff
  - corpus.add, corpus.list, corpus.delete
  - rules.get, rules.delete, patternType in rules.create
  - Registered brief + corpus in _app.ts

- **3.7** Seed data (via Supabase MCP)
  - 2 brand briefs (v1, v2 for FullFunnel.co)
  - 3 corpus items (LinkedIn posts, no embeddings)
  - 3 regex-type anti-AI rules

- **3.8-3.9** UI pages
  - Brand Brief page: 2-column grid, version tabs, brief cards, voice fidelity, fed-into, versioning
  - Anti-AI Rules page: KPI strip, strict mode toggle, rules table with type/action/severity pills

### Phase 4A-wire: Onboarding DB Wiring (Session 5)

- **4Aw.1** TRPCProvider added to onboarding layout
  - Files: `src/app/onboarding/layout.tsx`
  - Why: tRPC hooks require TRPCProvider upstream — was missing from onboarding route

- **4Aw.2** Onboarding page rewritten to wire all mutations
  - Files: `src/app/onboarding/page.tsx`
  - What: 5 tRPC mutations wired (saveBrandIdentity, saveCorpusItems, saveBrief, saveGuardrails, complete), Clerk org creation via useOrganizationList + setActive, brandId/workspaceId threaded between steps, error/loading states, "Other" field resolution, skip handlers persist to DB
  - Fixes: Gap 1 (data loss), Gap 3 (Clerk org chicken-and-egg), Gap 4 (complete never called), Gap 5 (brandId not threaded), Gap 6 ("Other" not resolved)

- **4Aw.3** App layout redirect for null orgId
  - Files: `src/app/(app)/layout.tsx`
  - What: Users without Clerk org redirected to /onboarding instead of dashboard
  - Fixes: Gap 7 (new users bypass onboarding)

- **4Aw.4** saveGuardrails made idempotent
  - Files: `src/server/routers/onboarding.ts`
  - What: Delete existing rules before inserting — prevents duplicate rules on retry
  - Why: Self-review found partial failure (guardrails saved + complete fails) causes duplicate inserts

- **4Aw.5** Step 4 stuck state auto-recovery
  - Files: `src/app/onboarding/page.tsx`
  - What: getStep returns 4 (guardrails saved, complete failed) → auto-call complete + redirect
  - Uses useRef guard to prevent multiple calls

- **4Aw.6** Clerk Organizations enabled
  - Config: Clerk dashboard — Organizations set to "Membership required" (Standard)
  - Why: useOrganizationList hook requires Organizations feature. "Membership required" matches B2B workspace model.
