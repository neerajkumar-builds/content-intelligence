# Content Intelligence Agent — Dependency Map

> What depends on what. Check before modifying any file.

---

## Schema Dependencies (change cascades downward)

```
enums.ts
  ├── workspaces.ts (uses memberRole)
  ├── brands.ts (uses severity, ruleCategory)
  ├── connectors.ts (uses connectorState, tier)
  ├── signals.ts (uses signalSource)
  ├── content.ts (uses postStatus, severity)
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

src/lib/security/scoped-db.ts
  └── Uses: Drizzle client (src/db/index.ts)
  └── Used by: ALL tRPC procedures (every query must go through scopedDb)

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
  └── Uses: src/server/trpc.ts, ALL 7 domain routers
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
  └── Uses: src/server/trpc.ts, src/server/middleware.ts, src/db/schema (brandCorpus, brands)
  └── Used by: src/server/routers/_app.ts, Brand Brief page (corpus section)
```

## UI → Backend Dependencies (Phase 2: NOW WIRED)

```
/govern/brand       → tRPC: brand.get, brand.update → brand_briefs table
/govern/rules       → tRPC: rules.list, rules.create, rules.update → anti_ai_rules table
/govern/connectors  → tRPC: connectors.list → connectors + oauth_credentials + contract_test_results
/ideas              → tRPC: ideas.list → ideas + signals tables + pgvector
/drafts             → tRPC: drafts.list, drafts.get → drafts + draft_grades + ai_calls
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
