# Content Intelligence Agent — Learnings & Anti-Patterns

> What we learned the hard way (or from research). Read before writing code.

---

## Platform API Gotchas (DO NOT ignore)

### LinkedIn
- Version header `LinkedIn-Version: 202604` is REQUIRED — no default, request fails without it
- Refresh token TTL does NOT reset on refresh — 365-day countdown from original grant
- Post response: ID is in `x-restli-id` HEADER, not JSON body (201 with empty body)
- No organic carousel via API — use PDF/Document carousel instead
- Article posts don't auto-scrape URLs — you must provide thumbnail, title, description

### X/Twitter
- No free tier since Feb 2026. Pay-per-use: $0.015/post, $0.20 with URL (13x more!)
- Auth code expires in 30 SECONDS (not minutes) — exchange immediately
- Access token only 2 hours — shortest of all platforms
- Media upload uses multipart/form-data (NOT JSON) — exception to v2 conventions
- Quote-posting requires Enterprise tier — not available on self-serve

### Instagram
- JPEG ONLY via API — PNG uploads fail silently
- 50 containers per 24h rolling window (not 25/hour as commonly cited)
- API does NOT support 3:4 aspect ratio even though native app does
- Media URL must be publicly accessible — IG fetches from your URL

### TikTok
- Unaudited apps can ONLY use SELF_ONLY privacy — all other levels require passing TikTok's app audit
- `is_aigc: true` MANDATORY for AI-generated content since Sep 2025
- Token expires every 24 hours — daily refresh cron required
- Up to 35 photos per carousel (more than any other platform)

### Reddit
- AutoModerator silently removes posts — API returns success but post is invisible
- Must verify post visibility by checking unauthenticated — ghost detection critical
- `api_type=json` is CRITICAL — without it, returns jQuery format instead of JSON
- Reddit removed self-service API access — must apply for approval

### Beehiiv
- Default status is `confirmed` which AUTO-PUBLISHES immediately
- ALWAYS set status explicitly to `draft` first, then confirm when ready
- Send API (Create Post + auto-send) is Enterprise-only beta
- `<style>` and `<link>` tags are stripped from HTML content

### Bluesky
- Rich text facets use BYTE offsets (not character offsets) — critical for emoji/Unicode
- Posts are immutable — no editing after creation
- Link previews must be built manually (fetch OG tags, upload thumbnail, embed)
- GIFs display as static images

### YouTube
- Refresh token is PERMANENT in Production mode but only 7 DAYS in Testing mode
- Must publish OAuth app to Production to get permanent refresh tokens
- Upload = 100 quota units (not 1,600 as commonly cited) — ~50 uploads/day possible
- Shorts: no separate API, auto-detected by 9:16 aspect + under 60s duration

### Threads
- Separate OAuth flow from Instagram — can't reuse IG tokens
- URL-only media upload (no direct file upload)
- 500 character limit (not 300 as initially assumed)
- No scheduling, no editing, no delete via API

---

## Architecture Decisions & Rationale

- **12 direct + 2 n8n + 1 hybrid**: Direct gives better error control for publishing. n8n only for HubSpot (attribution workflow) and Substack (no API, browser automation).
- **27 tables (not 21)**: Added 6 infrastructure tables (rate_limit_windows, webhook_deliveries, dead_letter_queue, feature_flags, contract_test_results, model_pricing) — these prevent operational blind spots.
- **Circuit breaker per connector**: Prevents cascade failures. When LinkedIn is down, don't keep hammering it — hold posts and auto-retry when circuit half-opens.
- **Audit log is append-only**: INSERT + SELECT grants only. No UPDATE, no DELETE. Ever. This is the legal compliance layer.

---

## Reference Code Bugs Found

1. **brands.ts imports**: `check` imported but unused, `unique` used but not imported. Fixed in Task 0.4 (a327bf2).
2. **connectors.ts imports**: `unique` imported but unused (`.unique()` is column method, not named constraint), `boolean` used but not imported. Fixed in Task 0.5 (3017437). Pattern: always verify reference imports against actual usage before pasting.
3. **Drizzle 0.45.2 strict generics**: `PgTableWithColumns<any>` can't be passed directly to `.from()` — Drizzle's `TableLikeHasEmptySelection` conditional type rejects it. Fixed scopedDb by using composable `scope(column)` pattern instead of wrapping `.from()`. (Task 0.16, 82a2a12)
4. **rules.ts Zod enum mismatch**: Zod category enum had values not in DB (structure/hedge/adverb). DB ruleCategoryEnum has: punctuation/transition/filler/corporate/cliche/custom. Always check `src/db/schema/enums.ts` before writing Zod validators. (Task 2.6, e5636b5)
5. **@neondatabase/serverless neon() HTTP mode**: Does NOT work from local Node.js against Supabase. The `neon()` function makes HTTP requests to a Neon-specific `/sql` endpoint that Supabase doesn't provide. For local scripts (seed, ad-hoc), use `pg` with `drizzle-orm/node-postgres` and `DATABASE_URL_DIRECT`. (Task 2.13, 006d8f0)

6. **DB driver must match hosting provider**: Switched from `@neondatabase/serverless` (neon-http) to `postgres` (postgres-js) because Supabase doesn't expose Neon's `/sql` HTTP endpoint. Always verify driver compatibility before deploying. Use `prepare: false` for pgbouncer/Supavisor. (Session 5, f5e84bf)
7. **Supabase migrated to Supavisor**: Old hostname `db.<ref>.supabase.co` may not resolve. New format: `postgresql://postgres.<ref>:<pw>@aws-1-<region>.pooler.supabase.com:6543/postgres`. Username includes project ref. Password `@` must be URL-encoded as `%40`. (Session 5)
8. **Clerk orgId ≠ workspace UUID**: `ctx.scoped.workspaceId` is Clerk org ID (`org_xxx`), NOT the internal `workspaces.id` UUID. Any table with `workspaceId` UUID FK (like `antiAiRules`) needs the internal UUID, not the Clerk ID. Always look up workspace first: `WHERE clerkOrgId = ctx.workspaceId` → use `ws.id`. (Session 5, 9e5a6c8)
9. **Theme detection needs OS fallback**: `localStorage.getItem("cia.theme")` is null in incognito/first-visit. Fall back to `window.matchMedia("prefers-color-scheme: dark").matches`. (Session 5, c36ffba)

---

## Session 6 Learnings (Phase 5)

### pgvector halfvec
10. **pgvector HNSW dimension limits**: vector type max 2000 dims for HNSW indexes, halfvec type max 4000 dims. Gemini embedding-001 outputs 3072 dims — MUST use halfvec(3072), not vector(3072). Using vector(3072) with HNSW will fail silently or error at index creation. Always check `halfvec_cosine_ops` operator class for halfvec columns. (Session 6)

### Inngest v4 API
11. **Inngest v4 `eventType()` is lowercase**: The function to define typed events is `eventType()` (lowercase), NOT `EventType.create()` or similar class-based patterns. First positional arg is the event name string. Inngest v4 docs are sparse — always check the actual SDK types. (Session 6)

### Zod v4 Record
12. **Zod v4 `z.record()` requires 2 args**: In Zod v4, `z.record(z.unknown())` fails — you must provide both key and value schemas: `z.record(z.string(), z.unknown())`. This is a breaking change from Zod v3 where single-arg was valid. (Session 6)

### Postgres Error Codes
13. **postgres-js throws PostgresError with `.code` field**: Don't check `error.message.includes("unique")` — it's fragile and may match unrelated errors. Check `error.code === "23505"` for unique violation. Other useful codes: 23502 (not null), 23503 (FK violation), 42P01 (undefined table). The error object from postgres-js is PostgresError, not standard Error. (Session 6)

### Inngest Local Dev
14. **Inngest local dev requires INNGEST_DEV=1**: Without this env var, Inngest client tries to connect to Inngest Cloud and fails. Set `INNGEST_DEV=1` in `.env.local` for local development. The Inngest dev server runs separately via `npx inngest-cli dev`. (Session 6)

### Clerk orgId Systemic Issue — RESOLVED in Session 7
15. **Clerk orgId != workspace UUID — FIXED AT SOURCE**: `scopedDb()` is now async and resolves Clerk orgId→UUID internally. All 11 routers get the correct UUID via `ctx.scoped.workspaceId` without any per-router changes. Fix was Approach A (fix the utility) rather than Approach B (fix each router). This eliminated duplicate `getWorkspaceUuid()` helpers in ideas.ts and signals.ts. (Session 7, commit d6c88cc)

---

## Mistakes NOT to Make

1. **Don't stack unverified layers** — Schema → verify tables → then tRPC. Never write tRPC before schema is confirmed.
2. **Don't assume API response shapes** — LinkedIn returns ID in header. IG needs JPEG. Reddit lies about success. Always parse actual responses.
3. **Don't skip idempotency** — Implement UNIQUE constraint on posts.idempotency_key BEFORE any publish logic. Double-posts damage credibility.
4. **Don't auto-publish without gates** — Beehiiv's default is `confirmed`. TikTok requires `is_aigc`. One missed field = wrong content goes live.
5. **Don't mix workspace data** — Every query through `scopedDb`. Missing scope = cross-tenant leak. This is the #1 security risk.
6. **Don't hardcode token refresh intervals** — Use the token_manager with platform-specific schedules. TikTok needs daily, X needs every 90 min.
7. **Don't "improve" prototype fixture shapes** — Fixtures ARE the API contract. Changing shapes breaks UI integration.
8. **Don't use string matching for Postgres errors** — Always use error.code (e.g., "23505" for unique). String matching is fragile and locale-dependent.
9. **Don't assume vector type works for all dimensions** — pgvector HNSW caps at 2000 dims for vector, 4000 for halfvec. Check limits before choosing column type.
10. **Don't forget INNGEST_DEV=1 locally** — Without it, Inngest client silently fails to connect. Always set in .env.local for dev.
11. **Don't trust Clerk orgId as a UUID FK** — It's `org_xxx` format, not UUID. Every DB query with workspaceId FK needs the internal UUID lookup first.
12. **Strip quotes when pushing .env.local to Vercel** — .env.local uses `KEY="value"` format. Vercel stores the literal string including quotes. Must strip with `value="${value%\"}"; value="${value#\"}"` before `vercel env add`. First Vercel deploy failed due to `"postgresql://..."` instead of `postgresql://...`. (Session 7)
13. **n8n can't manage per-customer OAuth tokens** — n8n credentials are per-workspace (one credential per n8n account). For multi-tenant SaaS with 50+ customers, MUST use Direct API adapters via Inngest. Never send decrypted customer tokens to n8n Cloud. (Session 7 research)
14. **Clerk dev-browser cookie blocks webhooks on Vercel** — Clerk Development instance adds `x-clerk-auth-reason: dev-browser-missing` to ALL requests through middleware, causing 500 on webhook POSTs. Fix: exclude /api/webhooks, /api/health, /api/inngest from matcher entirely (not just isPublicRoute). (Session 7)
15. **Inngest concurrency must match plan** — Free plan caps at 5 concurrent. Setting higher (e.g., 20) causes sync Error and functions won't register. Always check plan limits before deploying. (Session 7)
16. **Inngest events lost before function registration** — Events fired before Inngest Cloud syncs functions are lost. Must re-fire via `POST https://inn.gs/e/{EVENT_KEY}` for signals ingested during this gap. (Session 7)
