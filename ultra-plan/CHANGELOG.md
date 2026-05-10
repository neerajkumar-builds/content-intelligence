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
