# Content Intelligence Agent — Build Progress

> Last updated: 2026-05-11 (Session 5)
> Current phase: Phase 4A-wire (Onboarding DB Wiring) — DONE + E2E VERIFIED
> Next action: Phase 5 (Signal Ingestion / Learn)

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
| 4B — Connector Publishing | NOT STARTED | — | — |
| 5 — Signal Ingestion / Learn | NOT STARTED | — | — |
| 6 — Drafts + Grading | NOT STARTED | — | — |
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
