# Content Intelligence Agent — Ultra Plan

## Context

Building a voice-faithful B2B content automation platform. Web session (Ultraplan on claude.ai) completed Phase 1 scaffolding on branch `claude/refine-local-plan-0mbkl` — Next.js 15 + React 19 + Tailwind CSS 4, all 17+ routes stubbed, primitives + shell built, design tokens ported. +9,744 lines, build clean, pushed to GitHub at `neerajkumar-builds/content-intelligence`.

**This Ultra Plan goes beyond the existing 8-phase build plan.** It adds production-grade depth: per-platform API contracts, n8n vs direct decisions, complete database schema, error handling architecture, scaling strategy, security model, and operational runbooks.

**Separation from web session:** All Ultra Plan work happens in a **new directory** `ultra-plan/` inside the Content Intelligence project. This is research + architecture artifacts only — no code that conflicts with the scaffolded app. When ready, artifacts merge into the main codebase as reference docs or direct code drops.

---

## Part 1: Per-Platform Connector Deep Dive

### Decision Matrix: n8n vs Direct API

| # | Platform | Recommendation | Rationale |
|---|----------|---------------|-----------|
| 1 | LinkedIn | **Direct** (Inngest) | Complex 2-phase media upload, need fine-grained error handling, high priority |
| 2 | X/Twitter | **Direct** (Inngest) | v2 API pay-per-use ($0.015/post, $0.20 with URL). No free tier since Feb 2026. 2h token expiry. |
| 3 | Substack | **n8n** (paste fallback) | No public API — n8n can automate browser-based paste via Puppeteer node |
| 4 | Beehiiv | **Direct** (Inngest) | Simple REST API, workspace token auth, need tight control on token refresh |
| 5 | Facebook | **Direct** (Inngest) | Meta Graph API shared with IG/Threads — single adapter handles all 3 |
| 6 | Instagram | **Direct** (Inngest) | Media container creation is multi-step, shares Meta Graph auth with FB |
| 7 | YouTube | **Hybrid** | Direct for metadata/shorts, n8n for long-form video upload (large file handling) |
| 8 | TikTok | **Direct** (Inngest) | Content Posting API with aggressive token expiry — need proactive refresh |
| 9 | Threads | **Direct** (Inngest) | Shares Meta Graph auth, simple text-first API |
| 10 | Reddit | **Direct** (Inngest) | Simple OAuth, but subreddit allowlist + spam-filter pre-check need app logic |
| 11 | Pinterest | **Direct** (Inngest) | Standard OAuth, pin creation is single-step |
| 12 | Bluesky | **Direct** (Inngest) | AT Protocol is clean, app password auth (no OAuth complexity) |
| 13 | HubSpot | **n8n** | Attribution sync is event-driven, n8n excels at webhook-to-CRM flows |
| 14 | Medium | **Direct** (Inngest) | Token-based auth, simple POST to create story |
| 15 | Mastodon | **Direct** (Inngest) | ActivityPub API is well-documented, instance-specific endpoint |

**Summary:** 12 direct, 2 n8n, 1 hybrid. Direct wins when: precise error handling matters, token lifecycle is complex, or multi-step media upload requires fine control. n8n wins when: workflow orchestration > API precision (CRM syncs, browser automation).

### Per-Platform API Contracts

#### Tier 1: LinkedIn
- **Publish**: `POST https://api.linkedin.com/rest/posts` (header: `LinkedIn-Version: 202405`)
- **Input**: `author` (URN), `commentary` (max 3000 chars), `visibility`, `content.media` (pre-registered asset URN)
- **Media upload**: 2-phase — (1) `POST /rest/images?action=initializeUpload` → `uploadUrl`, (2) PUT binary → reference URN
- **Output**: `x-restli-id` header = post URN. No JSON body on 201.
- **Media limits**: Images max 20MB (JPEG/PNG/GIF), Videos max 200MB (MP4, 3s-10min), Carousels PDF max 100MB
- **Rate limits**: 100 posts/day per member
- **Key constraint**: External links in body kill algorithmic reach — handle in anti-AI rules
- **Latency**: ~800ms-2s for text post, 5-30s for media upload

#### Tier 1: X/Twitter
- **Publish**: `POST https://api.x.com/2/tweets` (v2 API)
- **Input**: `text` (max 280 chars), `media.media_ids` (max 4 images or 1 video), `reply.in_reply_to_tweet_id` (threads)
- **Media upload**: `POST https://upload.twitter.com/1.1/media/upload.json` (v1.1, chunked for video)
- **Output**: `{ data: { id, text, edit_history_tweet_ids } }`
- **Media limits**: Images 5MB (JPEG/PNG/GIF/WEBP), Videos 512MB (MP4, 0.5s-140s), GIF 15MB
- **Rate limits**: 1,500 posts/month (free), 17 requests/15 min (v2 endpoints)
- **Key constraint**: 0 hashtags recommended (algorithmic suppression), thread support critical for B2B

#### Tier 1: Beehiiv
- **Publish**: `POST https://api.beehiiv.com/v2/publications/{pubId}/posts`
- **Input**: `title`, `subtitle`, `content` (HTML), `status` (draft/confirmed/archived), `send_to` (all/premium/free)
- **Output**: `{ data: { id, title, web_url, status, publish_date } }`
- **Auth**: Workspace API key (Bearer token), no OAuth flow
- **Rate limits**: 100 API calls/min
- **Key constraint**: HTML content — need HTML serializer for rich text drafts

#### Tier 2: Instagram (Business via Meta Graph)
- **Publish**: 2-step — (1) `POST /{ig-user-id}/media` creates container, (2) `POST /{ig-user-id}/media_publish` publishes
- **Input**: `image_url` or `video_url`, `caption` (max 2,200 chars), `media_type` (IMAGE/VIDEO/CAROUSEL_ALBUM/REELS)
- **Output**: `{ id: "media_id" }` — construct URL as `https://www.instagram.com/p/{shortcode}/`
- **Media limits**: Images: JPEG, 8MB, aspect 4:5 to 1.91:1 (1080x1350 optimal). Reels: MP4, 1GB, 3-90s
- **Rate limits**: 25 API calls/hour for content publish
- **Key constraint**: Media REQUIRED — no text-only posts. Hook within first 125 chars (before "...more")

#### Tier 2: YouTube
- **Publish**: `POST https://www.googleapis.com/upload/youtube/v3/videos?part=snippet,status`
- **Input**: `snippet.title` (max 100), `snippet.description` (max 5000), `snippet.tags`, `status.privacyStatus`
- **Output**: `{ id, snippet: { title, publishedAt }, status: { uploadStatus } }`
- **Auth**: OAuth 2.0 with refresh token (no expiry on refresh token itself)
- **Rate limits**: 10,000 quota units/day (video upload = 1,600 units → ~6 uploads/day)
- **Key constraint**: Upload is slow (minutes for large files) — use n8n for files >100MB

#### Tier 2: TikTok
- **Publish**: `POST https://open.tiktokapis.com/v2/post/publish/video/init/`
- **Input**: `post_info.title`, `post_info.privacy_level` (MUTUAL_FOLLOW_FRIENDS/SELF_ONLY/PUBLIC_TO_EVERYONE), `source_info`
- **Auth**: OAuth 2.0 — **24h expiry for sandbox, 30 days for production** (most aggressive expiry of all platforms)
- **Rate limits**: 3 posts/day for unaudited apps
- **Key constraint**: Must handle aggressive token refresh; privacy_level is REQUIRED

#### Tier 2: Reddit
- **Publish**: `POST https://oauth.reddit.com/api/submit`
- **Input**: `kind` (self/link/image/video), `sr` (subreddit), `title`, `text` (markdown), `flair_id`
- **Output**: `{ json: { data: { id, name, url } } }`
- **Auth**: OAuth 2.0 with refresh token (permanent for "installed" apps)
- **Rate limits**: 10 requests/minute, 100 requests/10 min
- **Key constraint**: Subreddit allowlist enforcement, spam filter pre-check, flair selection per subreddit

#### Tier 2: Bluesky
- **Publish**: `POST https://bsky.social/xrpc/com.atproto.repo.createRecord`
- **Input**: `repo` (DID), `collection` ("app.bsky.feed.post"), `record.text` (max 300 chars), `record.facets` (links/mentions)
- **Auth**: App password (no OAuth, no refresh needed, persistent)
- **Rate limits**: No official limit, but honor `ratelimit-remaining` headers
- **Key constraint**: 300 char limit (shorter than Twitter), rich text requires facets array for links

#### Tier 3: HubSpot (via n8n)
- **Flow**: n8n workflow triggers on `post.published` event → creates content event in HubSpot for attribution
- **Endpoint**: `POST https://api.hubapi.com/cms/v3/blogs/posts` or custom event via Marketing Events API
- **Auth**: OAuth 2.0, 6-month token expiry
- **Key constraint**: This is attribution tracking, not content publishing — different data flow

---

## Part 2: Complete Database Schema

### Table Architecture (21 tables across 5 domains)

```
src/db/schema/
  index.ts                  — barrel re-export
  enums.ts                  — all pgEnum definitions
  workspaces.ts             — workspaces table
  brands.ts                 — brands table
  members.ts                — members table
  brand-briefs.ts           — versioned brand briefs
  brand-corpus.ts           — voice corpus entries + pgvector
  anti-ai-rules.ts          — 62 rules, categories, severities
  connectors.ts             — 15 platforms
  oauth-tokens.ts           — encrypted tokens
  signals.ts                — raw ingested signals
  ideas.ts                  — ranked content ideas + pgvector
  drafts.ts                 — generated content with status lifecycle
  draft-grades.ts           — 7-dim grades per draft
  draft-anti-ai-hits.ts     — anti-AI violations per draft
  schedules.ts              — calendar slots
  posts.ts                  — published post records + idempotency keys
  post-results.ts           — per-channel publish results
  prompts.ts                — versioned system prompts
  model-routes.ts           — per-task model routing
  audit-log.ts              — append-only, partitioned by month
  ai-calls.ts               — glass-box LLM call log
```

### Key Schema Decisions

**Enums (in `enums.ts`):**
```
postStatus:     draft | graded | approved | scheduled | publishing | live | failed
severity:       block | warn | suggest | log
connectorState: healthy | reconnect | paste | disconnected
tier:           tier1 | tier2 | tier3
memberRole:     owner | admin | editor | approver | viewer
signalSource:   rss | reddit | linkedin | twitter | apify | manual | competitor | thought_leader
ruleCategory:   punctuation | transition | filler | corporate | cliche | custom
```

**Critical constraints:**
- `posts.idempotency_key` — UNIQUE, format `idem_<draftId>_v<version>_<channel>_<yyyymmdd>`
- `audit_log` — append-only (INSERT + SELECT grants only, no UPDATE/DELETE)
- `brand_briefs` — versioned (every save = new row, never update in place)
- `brand_corpus.embedding` — pgvector `vector(1536)` column with IVFFlat index

**Indexes for performance:**
- `posts`: `(workspace_id, scheduled_at, status)` partial WHERE status IN (scheduled, publishing)
- `drafts`: `(brand_id, status, updated_at DESC)`
- `audit_log`: BRIN index on `created_at` (append-only, time-ordered)
- `ai_calls`: `(workspace_id, created_at)` partial WHERE created_at > NOW() - 30 days
- `ideas`: `(brand_id, score DESC, created_at DESC)`

### Data Flow: Signal → Publish

```
n8n webhook POST /api/webhooks/n8n
  → HMAC-SHA256 verify
  → Zod validate payload
  → INSERT into signals table
  → Inngest event: content-intelligence/signal.ingested
  → Inngest function: embed signal with Voyage-3
  → Cosine similarity vs brand corpus
  → INSERT into ideas table with score
  → Operator sees idea on Idea Wall
  → "Draft this" → Inngest: content-intelligence/draft.generate
  → Vercel AI SDK → claude-sonnet-4.5 (or fallback)
  → Anti-AI rules check (62 rules, regex + vector)
  → 7-dim grading (hook/voice/evidence/format-fit/controversy/specificity/CTA)
  → Glass-box: log to ai_calls table
  → INSERT draft + draft_grades + draft_anti_ai_hits
  → Operator reviews, edits, approves
  → Schedule → INSERT into schedules table
  → Inngest cron picks up at scheduled time
  → Generate idempotency key
  → Fan-out: one Inngest event per selected channel
  → Each channel: connector adapter.publish()
  → Circuit breaker check → rate limit check → API call
  → INSERT into posts + post_results
  → Ghost detection at +10 min
  → Audit log entry for every step
```

---

## Part 3: Error Handling Architecture

### Error Classification (4 classes)

| Class | Examples | Action |
|-------|----------|--------|
| **Transient** (retry-safe) | Network timeout, 429, 502/503, AI overloaded | Exponential backoff with jitter |
| **Permanent** (no retry) | 400, 401, 403, content policy, anti-AI block | Fail immediately, notify operator |
| **Ambiguous** (investigate) | 500 from platform, timeout no response, partial success | Retry once, then DLQ + investigate |
| **Silent** (ghost detection) | API returns 200 but post never appears | Verify at +10 min, alert if missing |

### Retry Strategy

| Error Type | Base Delay | Max Delay | Max Retries | Jitter |
|-----------|-----------|-----------|-------------|--------|
| Network timeout | 1s | 30s | 5 | 500ms |
| HTTP 429 | `Retry-After` header (fallback 5s) | 120s | 8 | 1s |
| HTTP 502/503 | 2s | 60s | 4 | 1s |
| AI model overloaded | 3s | 60s | 3 | 2s |
| DB connection | 500ms | 10s | 3 | 200ms |

### Circuit Breaker (per connector)

- **Closed** (normal): requests flow through
- **Open** (failing): reject immediately, scheduled posts move to `held` state
- Threshold: 5 consecutive failures OR 50% failure rate over 10 requests
- **Half-open**: after 60s, allow 1 request. Success → close. Failure → re-open for 2 min
- When open: generate copy-paste fallback file (Blotato pattern)

### Dead Letter Queue

Table `dead_letter_queue`: failed jobs stored with `job_type`, `payload` (JSONB), `error_code`, `error_class`, `attempts`, `resolution` (retried/discarded/manual). Operator UI in API & Logs screen. Auto-archive after 30 days.

### Platform-Specific Error Handling

| Platform | 401 | 429 | Ghost Risk | Special |
|----------|-----|-----|-----------|---------|
| LinkedIn | Re-auth flow, token URN may change | 100/day member limit | Low | `serviceErrorCode` in JSON body |
| X/Twitter | Re-auth, check v2 quota | 1,500/month — hard cap | Medium (shadow ban) | Error array format differs from v1 |
| Instagram | Meta Graph re-auth | 25/hour content publish | Low | Container creation can succeed but publish fail |
| TikTok | Re-auth every 24h sandbox | 3/day unaudited | High (content review) | `privacy_level` missing = 400 |
| Reddit | Re-auth | 10/min | High (spam filter) | Subreddit automod can silently remove |
| YouTube | Refresh token (permanent) | Quota units/day | Low | Upload 1,600 units — ~6 uploads/day |

---

## Part 4: Production Operations

### Inngest Job Architecture

| Job | Concurrency | Priority | Timeout |
|-----|------------|----------|---------|
| `publish` | 5/workspace | Critical | 120s |
| `grade` | 10/workspace | Standard | 30s |
| `generate-draft` | 3/workspace | Standard | 120s |
| `ingest-signal` | 20 global | Standard | 30s |
| `refresh-token` | 3 global | Critical | 30s |
| `contract-test` | 2/connector | Background | 60s |
| `ghost-detect` | 5 global | Critical | 30s |
| `data-export` | 1/workspace | Background | 600s |

### Fan-Out Pattern (Multi-Platform Publish)

1. Operator schedules draft for 5 channels
2. `schedule-multi` function receives event
3. Emits 5 independent `publish` events (one per channel, each with unique idempotency key)
4. Each publishes independently with own retry/circuit-breaker
5. Each creates separate `post` record with own status
6. Draft status stays `publishing` until all channels resolve

### LLM Cost Control

- Per-workspace monthly budget caps (stored in `workspace_plans` table)
- Per-call token limit: max 4,096 completion tokens
- Cost tracking in `ai_calls` table (model, tokens in/out, calculated cost)
- `model_pricing` table with per-provider rates
- Alert at 80% budget consumption (P2), block at 100%
- Response caching for deterministic tasks (grading/scoring) — SHA-256 prompt hash, 24h TTL

### Model Fallback Chain (from prototype Models screen)

| Task | Primary | Fallback |
|------|---------|----------|
| Hook generation | claude-sonnet-4.5 | gpt-4.1 |
| Body draft | claude-sonnet-4.5 | gpt-4.1 |
| Voice scoring | claude-haiku-4.5 | gpt-4.1-mini |
| Anti-AI audit | claude-haiku-4.5 | gemini-2.5-flash |
| Idea ranking | claude-haiku-4.5 | — |
| Embeddings | voyage-3 | — |
| Rerank | rerank-3 | — |

Fallback triggers: 2 retries failed, latency > 3x p50, rate limited.

### Health Endpoint (`GET /api/health`)

Components checked: database (SELECT 1), Inngest (queue depth), Clerk (session verify), AI providers (latency), connectors (circuit state), n8n (last webhook received). Status: healthy/degraded/unhealthy.

### Alerting Severity

| P0 (page now) | P1 (15 min) | P2 (dashboard) | P3 (log) |
|---------------|-------------|----------------|----------|
| Failed publish of scheduled post | Connector circuit opened | Anti-AI suggest hit | Successful retry |
| All connector circuits open | AI fallback chain exhausted | Voice fidelity < 0.80 | Cache hit |
| OAuth expired with posts in 1h | Ghost detection triggered | Individual retry success | Health check pass |

---

## Part 5: Security

### OAuth Token Encryption
- AES-256-GCM encryption at rest
- Key in env var `OAUTH_ENCRYPTION_KEY`, never in DB
- Decrypt only at point of use (connector adapter), never cache decrypted
- Proactive refresh: daily cron refreshes tokens expiring within 7 days

### tRPC Middleware Stack
```
rateLimitMiddleware → authMiddleware → workspaceScopeMiddleware
→ brandScopeMiddleware → traceMiddleware → auditMiddleware → procedure
```

### Workspace Isolation
- `scopedDb` helper wraps Drizzle, auto-appends `WHERE workspace_id = $current`
- Supabase RLS as defense-in-depth (even if app code has scoping bug)
- Integration tests verify workspace isolation on every query

### Webhook Security
- n8n: HMAC-SHA256 signature verification
- Platform webhooks: per-platform verification (LinkedIn `X-Li-Signature`, Meta `X-Hub-Signature-256`)

---

## Part 6: What to Build in `ultra-plan/` (Separate from Web Session)

### Artifacts to Create

```
ultra-plan/
  README.md                         — this plan (reference doc)
  schemas/
    drizzle-schema.ts               — complete Drizzle schema (21 tables)
    enums.ts                        — all enum definitions
    indexes.sql                     — performance indexes
    seed.sql                        — dev seed data
  connectors/
    adapter-interface.ts            — TypeScript connector adapter interface
    platform-contracts/
      linkedin.md                   — LinkedIn API contract (endpoints, limits, errors)
      twitter.md                    — X/Twitter API contract
      instagram.md                  — Instagram API contract
      ...per platform...
    contract-tests.ts               — 11 contract test interface
  error-handling/
    error-taxonomy.ts               — AppError class + classification
    circuit-breaker.ts              — circuit breaker implementation
    retry-strategy.ts               — exponential backoff with jitter
  operations/
    health-check.ts                 — health endpoint logic
    alerting-rules.md               — severity tiers + routing
    runbook.md                      — operational runbook (what to do when X breaks)
  security/
    oauth-encryption.ts             — AES-256-GCM token encryption
    workspace-isolation.ts          — scopedDb helper
```

### How These Merge Into Main Codebase

1. `schemas/` → drops into `src/server/db/schema/` when Phase 2 starts
2. `connectors/` → drops into `src/lib/connectors/` when Phase 4 starts
3. `error-handling/` → drops into `src/lib/errors/` during Phase 0 (foundation)
4. `operations/` → drops into `src/lib/ops/` and `src/app/api/health/`
5. `security/` → drops into `src/lib/security/` and tRPC middleware

---

## Part 7: Build Sequence (Ultra-Enhanced)

### Phase 0: Foundation (NEW — before any features)
- [ ] Error taxonomy + `AppError` class
- [ ] Structured logging with trace ID generation
- [ ] Audit log table (append-only, partitioned)
- [ ] Feature flags table + check utility
- [ ] Health endpoint skeleton
- [ ] `scopedDb` workspace isolation helper

### Phase 1: Scaffolding ✅ (DONE by web session)
- [x] Next.js 15 + React 19 + Tailwind CSS 4
- [x] Design tokens ported
- [x] 6 primitives + full AppShell
- [x] 17+ route stubs
- [x] Build clean

### Phase 2: Data Model
- [ ] Complete Drizzle schema (21 tables from Ultra Plan Part 2)
- [ ] Enums: postStatus, severity, connectorState, tier, memberRole, signalSource, ruleCategory
- [ ] pgvector extension enabled on Supabase
- [ ] tRPC router skeleton (one router per domain)
- [ ] First migration + verify
- [ ] Dev seed data (mock signals, ideas, drafts with fixture shapes)

### Phase 3: Brand Brief + Anti-AI Rules
- [ ] Brand Brief CRUD with versioning (every save = new row)
- [ ] Voice fidelity sparkline (cosine similarity vs corpus)
- [ ] Anti-AI Rules CRUD (62 rules, 4 severities, strict mode toggle)
- [ ] Pattern types: regex + vector match
- [ ] Channel scope per rule

### Phase 4: Connectors
- [ ] Connector adapter interface (TypeScript discriminated union)
- [ ] OAuth token encryption (AES-256-GCM)
- [ ] Circuit breaker per connector
- [ ] **Tier 1 first**: LinkedIn adapter → X/Twitter adapter
- [ ] Platform-specific field declarations per connector
- [ ] 11 contract tests per connector (Inngest hourly cron)
- [ ] Copy-paste fallback for failed/unconfigured connectors
- [ ] Error handling: 401→re-auth, 429→Retry-After, char limit→ask operator
- [ ] Rate limit tracking in Postgres (per-platform sliding window)
- [ ] **Before each connector**: read platform API docs via Context7 to verify current flows

### Phase 5: Idea Wall + Signal Ingestion
- [ ] n8n webhook endpoint with HMAC-SHA256 verification
- [ ] Signal ingestion → pgvector embedding (Voyage-3)
- [ ] Idea ranking (cosine similarity vs brand corpus)
- [ ] Idea Wall UI (filter bar + 3-column grid)
- [ ] Source attribution (RSS, Reddit, competitor, thought leader)

### Phase 6: Drafts + 7-Dim Grading (core surface)
- [ ] 3-pane editor (list / editor / grading panel)
- [ ] 7-dim rubric UI as horizontal bar chart (NOT in prototype — build from spec)
- [ ] Glass-box panel: model, prompt (editable), tokens, cost, latency, anti-AI hits
- [ ] AI generation via Vercel AI SDK with model fallback chain
- [ ] Anti-AI rules enforcement pre-publish
- [ ] Voice fidelity scoring (pgvector cosine similarity)
- [ ] `ai_calls` table logging for every AI call

### Phase 7: Schedule + Publish Loop
- [ ] Calendar grid + queue table
- [ ] Inngest publish jobs with idempotency keys
- [ ] Fan-out: one event per channel, independent retry
- [ ] Status transitions enforced by state machine
- [ ] Ghost detection at +10 min post-publish
- [ ] Dead letter queue for failed publishes
- [ ] Copy-paste fallback generation
- [ ] Bulk actions on queue

### Phase 8: Insights + Remaining Screens
- [ ] Home: briefing, decisions queue, channel strip, mission control
- [ ] Insights: Inputs vs Outputs reframe
- [ ] Competitors + Thought Leaders
- [ ] Prompt Studio, Models, Audit Log, Data Export, Members, Settings
- [ ] Onboarding wizard (7 steps)
- [ ] Empty states + skeleton loaders
- [ ] Keyboard nav + focus-visible

---

## Part 8: Verification Plan

After each phase:
1. `pnpm build` — zero type errors
2. `pnpm dev` — screens render, visual diff against prototype HTML
3. Light/dark theme toggle works
4. Sidebar nav resolves all routes
5. tRPC queries return fixture-shaped data
6. Error handling: intentionally trigger each error class, verify classification + response
7. Security: verify workspace isolation (query with wrong workspace_id returns empty)

### Integration Test Checklist (Phase 4+)
- [ ] LinkedIn: create post, verify on LinkedIn, delete post
- [ ] Token refresh: expire token, verify auto-refresh
- [ ] Idempotency: send same key twice, verify no duplicate
- [ ] Circuit breaker: simulate 5 failures, verify circuit opens
- [ ] Ghost detection: publish, verify exists at +10 min
- [ ] Rate limit: burst to limit, verify backoff

---

## Part 9: What Wakes You Up at 3 AM

1. **OAuth token expired with posts scheduled in next hour** → Proactive refresh 7 days out + P0 alert on refresh failure
2. **Ghost publish (200 but never appears)** → +10 min verification job, contract test #7
3. **Bad deploy publishes content violating anti-AI rules** → Anti-AI check at publish time (not just grade time)
4. **LLM cost runaway** → Per-workspace monthly cap, per-call token limit, P0 at 80%
5. **Cross-workspace data leak** → `scopedDb` + Supabase RLS + integration tests
6. **Idempotency key collision** → Postgres UNIQUE + `ON CONFLICT DO NOTHING` + version increment
7. **Silent voice quality drift** → Rolling 10-draft voice fidelity average, P2 alert below 0.80

---

## Critical Files Reference

| Purpose | Path |
|---------|------|
| Engineering spec | `design_handoff_content_intelligence_agent/CLAUDE.md` |
| Screen inventory | `design_handoff_content_intelligence_agent/README.md` |
| Dev prompts | `design_handoff_content_intelligence_agent/DEV_PROMPTS.md` |
| Design tokens | `design_handoff_content_intelligence_agent/app/tokens.css` |
| Connectors spec | `design_handoff_content_intelligence_agent/app/screens/govern.jsx` |
| Models/Prompts/Audit | `design_handoff_content_intelligence_agent/app/screens/extra.jsx` |
| Content engine framework | `~/AI Automation Projects/Fresh/braindump/track-g-content/content-engine-framework.md` |
| Existing build plan | `~/.claude/plans/read-claude-md-users-neerajkumar-ai-auto-foamy-scroll.md` |
| n8n instance | `https://full-funnel.app.n8n.cloud/` (connected via MCP) |
| GitHub repo | `https://github.com/neerajkumar-builds/content-intelligence` |
| Web session branch | `claude/refine-local-plan-0mbkl` |

---

## Part 10: Verified API Reference (Live Research, May 2026)

> All data below verified from official API docs on 2026-05-11. This replaces estimates in Part 1.

### LinkedIn (Community Management API)

| Field | Value |
|-------|-------|
| **Publish endpoint** | `POST https://api.linkedin.com/rest/posts` |
| **Version header** | `LinkedIn-Version: 202604` (REQUIRED, no default) |
| **OAuth scopes** | `w_member_social` (person), `w_organization_social` (org page) |
| **Access token TTL** | 60 days |
| **Refresh token TTL** | 365 days (does NOT reset on refresh — counts from original grant) |
| **Auth code TTL** | 30 minutes |
| **Text limit** | 3,000 chars. "See more" at ~210 chars desktop / ~140 mobile |
| **Image upload** | 2-step: `POST /rest/images?action=initializeUpload` → PUT binary. Max 20MB, JPG/PNG/GIF |
| **Video upload** | 4-step chunked: initializeUpload → split 4MB chunks → PUT each → finalizeUpload. Max 500MB, MP4, 3s-30min |
| **Document/Carousel** | 2-step: `POST /rest/documents?action=initializeUpload` → PUT binary. PDF/PPT/DOC, max 100MB |
| **Rate limits** | 100,000 API calls/day (app-level). ~100 posts/day (member-level) |
| **Response** | 201 Created, post ID in `x-restli-id` header. No JSON body |
| **Error format** | JSON with `status`, `message`. Key: INVALID_URN_TYPE, ACCESS_DENIED, TOO_MANY_REQUESTS |
| **429 handling** | No `Retry-After` header. Use exponential backoff |
| **Webhook** | `X-LI-Signature` HMAC-SHA256. Batched (10 events), retained 60 days |
| **Gotchas** | API version sunsets after ~12 months. No organic carousel (use PDF carousel). Article posts don't auto-scrape URLs |

### X/Twitter (v2 API)

| Field | Value |
|-------|-------|
| **Publish endpoint** | `POST https://api.x.com/2/tweets` |
| **Pricing (NEW since Feb 2026)** | Pay-per-use default: $0.015/post (no URL), **$0.20/post (with URL)**. No free tier for new devs |
| **Legacy tiers** | Grandfathered: Free (~500 posts/mo), Basic ($200/mo), Pro ($5K/mo), Enterprise ($42K+/mo) |
| **OAuth flow** | PKCE. Scopes: `tweet.write`, `tweet.read`, `users.read`, `offline.access`, `media.write` |
| **Access token TTL** | **2 hours** (shortest of all platforms!) |
| **Refresh token TTL** | No documented expiry. Requires `offline.access` scope |
| **Auth code TTL** | **30 SECONDS** (exchange immediately!) |
| **Text limit** | 280 chars standard. 25,000 chars with X Premium ($8/mo) |
| **Media upload** | `POST https://api.x.com/2/media/upload` (multipart/form-data, NOT JSON). Chunked: INIT → APPEND → FINALIZE → poll STATUS |
| **Media limits** | Images: 5MB (JPEG/PNG/GIF/WEBP). Videos: 512MB (MP4, 0.5s-140s). GIF: 15MB |
| **Rate limits** | 10,000 tweets/24h (app), 100 tweets/15min (user). Headers: `x-rate-limit-remaining`, `x-rate-limit-reset` |
| **Thread creation** | No thread API. Chain replies: create tweet 1, use its ID as `reply.in_reply_to_tweet_id` for tweet 2, repeat |
| **Response** | `{ "data": { "id": "...", "text": "...", "edit_history_tweet_ids": [...] } }` |
| **Gotchas** | URL posts 13x more expensive. Quote-posting requires Enterprise. v1.1 media deprecated → use /2/media/upload. Follows/Likes/Quote-Posts removed from API writes for self-serve |

### Facebook (Meta Graph API v25.0)

| Field | Value |
|-------|-------|
| **Publish endpoint** | `POST /v25.0/{page_id}/feed` |
| **Scopes** | `pages_manage_posts`, `pages_manage_engagement`, `pages_read_engagement` |
| **Token lifecycle** | Short-lived (1-2h) → exchange for long-lived (60 days) → Page Token (**never expires**) |
| **Page token invalidation** | Only by: password change, app deauth, secret reset, admin removal |
| **Rate limits** | 4,800 × `engaged_users` calls per 24h per page |
| **Native scheduling** | Set `scheduled_publish_time` (10 min to 30 days out) |
| **Error format** | `{ "error": { "message", "type", "code", "error_subcode", "fbtrace_id" } }`. Key code 4 = app rate limit, 190 = token expired, 506 = duplicate |
| **Webhook** | `X-Hub-Signature-256` HMAC-SHA256 with App Secret |

### Instagram (Meta Graph API — Content Publishing)

| Field | Value |
|-------|-------|
| **Publish flow** | 2-step: `POST /{ig_id}/media` (create container) → `POST /{ig_id}/media_publish` |
| **Image format** | **JPEG ONLY via API** (no PNG!) |
| **Media URL** | Must be publicly accessible (IG fetches from your URL) |
| **Container limit** | **50 containers per 24-hour rolling window** (check via `GET /{ig_id}/content_publishing_limit`) |
| **Carousel** | Up to 10 items per carousel |
| **Aspect ratio** | 1.91:1 to 4:5. **API does NOT support 3:4** even though native app does |
| **Reels** | Supported. MP4, 3-90s, max 1GB |
| **Caption limit** | 2,200 chars, 30 hashtags max |

### Threads (Meta Threads API)

| Field | Value |
|-------|-------|
| **Publish flow** | 2-step: `POST https://graph.threads.net/v1.0/{user_id}/threads` → `/threads_publish` |
| **OAuth** | **Separate flow** from Instagram: `threads.net/oauth/authorize`, scopes `threads_basic`, `threads_content_publish` |
| **Token lifecycle** | Short-lived (1h) → long-lived (60 days) via `th_exchange_token` |
| **Text limit** | **500 characters** (corrected from earlier 300 estimate) |
| **Carousel** | Up to 20 items |
| **Media upload** | **URL-only** (no direct file upload) |
| **GIFs** | Via GIPHY only |
| **Rate limit** | **250 posts per user per 24 hours** |
| **Gotchas** | No scheduling. No editing. Separate tokens from Instagram. Posts are permanent (no delete via API confirmed) |

### TikTok (Content Posting API)

| Field | Value |
|-------|-------|
| **Direct post** | `POST https://open.tiktokapis.com/v2/post/publish/video/init/` |
| **Inbox (drafts)** | `POST /v2/post/publish/inbox/video/init/` |
| **Photo/Carousel** | `POST /v2/post/publish/content/init/` — up to **35 images** per carousel |
| **Access token TTL** | **24 hours** |
| **Refresh token TTL** | **365 days** (then creator must fully re-authorize) |
| **Privacy levels** | `PUBLIC_TO_EVERYONE`, `MUTUAL_FOLLOW_FRIENDS`, `FOLLOWER_OF_CREATOR`, `SELF_ONLY` |
| **CRITICAL** | **Unaudited apps can ONLY use SELF_ONLY** — all other levels require TikTok app audit |
| **Rate limits** | 6 req/min per user token. ~15 posts/day/creator. Max 5 pending uploads/24h |
| **Video limits** | MP4/WebM, max 4GB prod (128MB sandbox), 3s-10min, min 720p, 23-60fps |
| **AI disclosure** | `is_aigc: true` **MANDATORY since Sep 2025** for AI-generated content |
| **Content disclosure** | `brand_content_toggle` (paid partnership), `brand_organic_toggle` (own brand) |
| **Error codes** | 25 documented codes covering auth, spam, format, transfer, rate limits, app status |

### YouTube (Data API v3)

| Field | Value |
|-------|-------|
| **Upload endpoint** | `POST https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status` |
| **Upload flow** | Resumable: POST initiate → get upload URI from Location header → PUT binary. Chunks must be 256KB multiples |
| **Quota** | 10,000 units/day. **Upload = 100 units** (corrected from 1,600). Thumbnail = 50. Search = 100. **~50 uploads/day possible** |
| **Access token TTL** | 1 hour |
| **Refresh token TTL** | **PERMANENT in Production mode, 7 DAYS in Testing mode** — must publish OAuth app |
| **Shorts** | No separate API. Same `videos.insert`. Auto-detected by 9:16 aspect + under 60s. Add `#Shorts` in title |
| **Thumbnail** | `POST /upload/youtube/v3/thumbnails/set?videoId={id}`. Max 2MB, JPEG/PNG. Requires phone-verified channel |
| **Scheduling** | `privacyStatus: "private"` + `publishAt: "ISO8601"` — YouTube auto-publishes |
| **AI disclosure** | `containsSyntheticMedia: true` in status object |
| **Video limits** | Max 256GB or 12 hours. Default max 15 min until phone verified |

### Reddit (OAuth API)

| Field | Value |
|-------|-------|
| **Submit endpoint** | `POST https://oauth.reddit.com/api/submit` with `api_type=json` (CRITICAL — otherwise jQuery format) |
| **Input** | `kind` (self/link/image/video), `sr` (subreddit), `title`, `text`/`url`, `flair_id`, `nsfw`, `spoiler` |
| **Media upload** | 3-step S3 presigned: lease → upload to S3 → submit with S3 URL |
| **Access token TTL** | 1 hour |
| **Refresh token TTL** | **Permanent** (with `duration=permanent` in auth request) |
| **Rate limits** | **60 requests/minute** (corrected from 10). Headers: `X-Ratelimit-Used/Remaining/Reset` |
| **Error format** | `json.errors` array of `[CODE, message, field]` tuples |
| **Ghost detection** | **#1 challenge**: AutoModerator silently removes posts. API returns success but post invisible. Must verify unauthenticated. Triggered by account age, karma, CQS score, domain blacklists |
| **API access** | Reddit removed self-service — must apply for approval |

### Bluesky (AT Protocol)

| Field | Value |
|-------|-------|
| **Auth** | `POST /xrpc/com.atproto.server.createSession` with app password → `accessJwt` + `refreshJwt` |
| **Post** | `POST /xrpc/com.atproto.repo.createRecord` with collection `app.bsky.feed.post` |
| **Text limit** | **300 graphemes / 3,000 bytes** |
| **Rich text** | Facets with **BYTE offsets** (not character offsets) — crucial for emoji/Unicode handling |
| **Images** | Up to 4 per post, 1MB each. Upload via `POST /xrpc/com.atproto.repo.uploadBlob` |
| **Video** | 1 per post, 100MB max, 3 min max |
| **Link previews** | Must build manually: fetch OG tags, upload thumbnail, attach as `app.bsky.embed.external` |
| **Rate limits** | 5,000 points/hour, 35,000/day. Post creation = 3 points (~1,666 posts/hour). 3,000 HTTP requests/5min/IP |
| **Gotchas** | Posts immutable (no editing). No scheduling. GIFs display as static images |

### Beehiiv (API v2)

| Field | Value |
|-------|-------|
| **Publish endpoint** | `POST https://api.beehiiv.com/v2/publications/{publicationId}/posts` |
| **Auth** | API key as Bearer token (no OAuth needed) |
| **Content methods** | `body_content` (raw HTML) OR `blocks` (structured array) — mutually exclusive |
| **Status values** | `draft` (save only) or `confirmed` (publishes immediately or at `scheduled_at`) |
| **DEFAULT STATUS** | **`confirmed` (auto-publish!)** — always set explicitly. Beehiiv plans to change default to `draft` |
| **Rate limits** | **180 requests/minute** per org. Headers: `RateLimit-Limit`, `RateLimit-Remaining`, `RateLimit-Reset` |
| **HTML gotchas** | `<style>` and `<link>` tags stripped. Inline styles preserved. Fixed compliance footer |
| **Send API** | Create Post + auto-send is **Enterprise-only beta** |
| **Audience targeting** | `recipients.email/web` with `tier_ids` (free/premium/all) + segment include/exclude |

---

## Part 11: Cross-Platform Comparison Matrix

| Platform | Token TTL | Refresh TTL | Post Limit | Media Required | Ghost Risk | Cost |
|----------|-----------|-------------|-----------|----------------|------------|------|
| LinkedIn | 60 days | 365 days (no reset) | ~100/day | No | Low | Free |
| X/Twitter | **2 hours** | Permanent | 10K/day (app) | No | Medium (shadow ban) | **$0.015-0.20/post** |
| Facebook | Never (page) | N/A | 4800×users/day | No | Low | Free |
| Instagram | 60 days | N/A | 50 containers/24h | **YES** | Low | Free |
| Threads | 60 days | N/A | 250/24h | No | Low | Free |
| TikTok | **24 hours** | 365 days | 6 req/min, ~15/day | **YES (video/photo)** | High (review) | Free |
| YouTube | 1 hour | Permanent (prod) | 50/day (quota) | **YES (video)** | Low | Free |
| Reddit | 1 hour | Permanent | 60 req/min | No | **HIGH (AutoMod)** | Free |
| Bluesky | Session-based | Session-based | ~1,666/hour | No | Low | Free |
| Beehiiv | N/A (API key) | N/A | 180 req/min | No | Low | Free (read), Enterprise (send) |

### Cost Impact Analysis (X/Twitter)

At $0.20 per URL post, publishing 5 LinkedIn-style B2B posts/week (all with links) = **$52/year per brand**. At 10 brands = $520/year just on X posting. Factor into workspace pricing.

Non-URL posts at $0.015 = $3.90/year per brand. Consider: strip URLs from X posts and put links in reply thread (common B2B pattern).

---

## Part 12: Skills Architecture (Claude Code Skills per Platform)

Each platform gets a dedicated Claude Code skill for content generation + publishing:

| Skill | Trigger | What It Does |
|-------|---------|--------------|
| `linkedin-publish` | Draft approved for LinkedIn | Format for 3,000 chars, no external links in body, contractions, short paragraphs |
| `twitter-publish` | Draft approved for X | 280 char version, thread if longer, 0 hashtags, no URLs in body (reply thread) |
| `instagram-publish` | Draft approved for IG | Hook in 125 chars, 3-5 hashtags, JPEG media required, 4:5 aspect |
| `threads-publish` | Draft approved for Threads | 500 char version, no hashtags needed, text-first |
| `tiktok-publish` | Draft approved for TikTok | Video/photo required, set `is_aigc: true`, privacy level based on audit status |
| `youtube-publish` | Draft approved for YouTube | Title < 100, description < 5,000, tags, thumbnail, `containsSyntheticMedia` |
| `reddit-publish` | Draft approved for Reddit | Subreddit selection, flair, markdown formatting, spam-safe language |
| `bluesky-publish` | Draft approved for Bluesky | 300 grapheme limit, facets for links (byte offsets!), manual link previews |
| `beehiiv-publish` | Draft approved for Beehiiv | HTML or blocks format, status MUST be explicit, audience targeting |
| `facebook-publish` | Draft approved for Facebook | Page token auth, optional scheduling, link with OG metadata |

These skills handle platform-specific formatting BEFORE the connector adapter does the API call. The skill ensures content fits the platform's constraints; the adapter handles auth + HTTP.

---

## Part 13: Drizzle Schema — Verified Design (27 tables, 9 files)

> Full schema code in agent artifact: `i-want-you-to-federated-whistle-agent-ac6217e215e979dbe.md`
> All syntax verified against Drizzle ORM 0.45.2 + Context7 docs.

### File Structure
```
src/db/schema/
  enums.ts          — 10 pgEnums (postStatus, severity, connectorState, tier, memberRole, signalSource, ruleCategory, aiTaskType, exportFormat, exportStatus)
  workspaces.ts     — workspaces, members, feature_flags (3 tables)
  brands.ts         — brands, brand_briefs, brand_corpus, anti_ai_rules (4 tables)
  connectors.ts     — connectors, oauth_credentials, contract_test_results (3 tables)
  signals.ts        — signals, ideas (2 tables)
  content.ts        — drafts, draft_grades, draft_anti_ai_hits (3 tables)
  publishing.ts     — schedules, posts, post_results (3 tables)
  ai.ts             — prompts, model_routes, ai_calls, model_pricing (4 tables)
  ops.ts            — audit_log, exports, rate_limit_windows, webhook_deliveries, dead_letter_queue (5 tables)
  index.ts          — barrel re-export
src/db/index.ts     — Neon serverless Drizzle client
drizzle.config.ts   — migration config
```

### Key Schema Decisions
- All PKs: `uuid().defaultRandom()` (gen_random_uuid)
- All timestamps: `withTimezone: true` for UTC-safe storage
- `$onUpdate(() => new Date())` on every `updatedAt` column
- HNSW indexes on vector columns: `brand_corpus.embedding`, `signals.embedding`
- Partial indexes on boolean flags (active brands, enabled rules, unprocessed signals)
- Check constraint on `ideas.hot_score` (0-100 range)
- Immutable tables (brand_briefs, audit_log) have NO `updatedAt`
- `onDelete: 'cascade'` on parent FKs, `onDelete: 'set null'` on optional refs
- Composite unique constraints on rate_limit_windows, model_pricing, feature_flags

---

## Part 14: n8n Workflows — Validated SDK Code (5 workflows)

> Full SDK code in agent artifact: `i-want-you-to-federated-whistle-agent-aab90368e159caac3.md`
> All workflows validated via n8n `validate_workflow` MCP tool.

### Workflow Inventory

| # | Workflow | Trigger | Nodes | Purpose |
|---|----------|---------|-------|---------|
| 1 | Signal Ingestion Pipeline | Cron `*/30 8-18 * * 1-5` | 19 | RSS + Reddit + Apify → HMAC-signed webhook to app |
| 2 | HubSpot Attribution Sync | Webhook (`post.published`) | 9 | Create marketing event in HubSpot for content attribution |
| 3 | Substack Paste Automation | Webhook (`post.approved`) | 7 | Format to markdown → Google Drive → Slack notification |
| 4 | Contract Test Runner | Cron (hourly, minute 5) | 13 | Health probe + token expiry + rate limit check → Slack alert |
| 5 | YouTube Long-Form Upload | Webhook (`post.approved`) | 11 | Download video → resumable upload → thumbnail → result callback |

### Deployment Order
1. Contract Test Runner (standalone, no app dependency)
2. Signal Ingestion Pipeline (core pipeline, needs RSS config in Supabase)
3. HubSpot Attribution Sync (needs app publish events)
4. Substack Paste Automation (needs app publish events)
5. YouTube Long-Form Upload (most complex, needs video handling)

### n8n Node Availability Audit
**Native nodes exist for:** YouTube, Twitter/X, LinkedIn, Reddit, Medium, HubSpot, Facebook (Graph API), RSS, Supabase, Slack, Google Drive
**No native node (use HTTP Request):** Instagram, TikTok, Pinterest, Threads, Bluesky, Beehiiv, Substack (no API at all)

### Credentials Required in n8n (8 total)
1. Supabase API
2. Reddit OAuth2
3. Apify API Token
4. HubSpot App Token
5. Google Drive OAuth2
6. Slack OAuth2
7. YouTube OAuth2
8. Webhook Auth Header (HMAC shared secret)

---

## Part 15: Connector Adapter System — Complete TypeScript Design (20 files)

> Full TypeScript code in agent artifact: `i-want-you-to-federated-whistle-agent-a9446a050b53ab16a.md`
> Zero `any` types. All verified API data encoded as typed constants.

### File Structure
```
src/lib/connectors/
  types.ts              — Platform enum, PublishInput (discriminated union), PublishResult, all constants
  errors.ts             — AppError class with 4-class classification
  adapter.ts            — ConnectorAdapter interface (10 methods) + BaseAdapter abstract class
  circuit-breaker.ts    — Postgres-backed 3-state circuit breaker with exponential backoff
  rate-limiter.ts       — Dual-mode (sliding window + token bucket), Postgres-backed
  token-manager.ts      — AES-256-GCM encrypted storage, proactive refresh, batch refresh
  registry.ts           — Platform adapter registry with lookup + filtering
  index.ts              — Barrel export
  adapters/
    linkedin.ts         — 2-phase media upload, URN-based response parsing
    twitter.ts          — Pay-per-use cost tracking, multipart media upload, thread chaining
    instagram.ts        — JPEG-only enforcement, 2-step container→publish, aspect ratio validation
    threads.ts          — Separate OAuth from IG, URL-only media, 500 char limit
    facebook.ts         — Page token auth (never expires), Graph API v25.0
    tiktok.ts           — 24h token refresh, is_aigc mandatory, privacy level enforcement
    youtube.ts          — Resumable upload, quota tracking, Shorts auto-detection
    reddit.ts           — S3 presigned media upload, AutoMod ghost detection, api_type=json
    bluesky.ts          — Session auth (app password), grapheme counting via Intl.Segmenter, byte-offset facets
    beehiiv.ts          — API key auth, explicit status setting (avoid auto-publish), blocks vs body_content
    substack.ts         — Paste-only adapter (supportsPublish = false), generates copy-paste markdown
    hubspot.ts          — CRM attribution only (supportsPublish = false), marketing event creation
    pinterest.ts        — Standard OAuth, pin creation
    medium.ts           — Token auth, no delete support
    mastodon.ts         — Instance-specific endpoint, ActivityPub
```

### ConnectorAdapter Interface (10 methods)
```typescript
interface ConnectorAdapter {
  readonly platform: Platform;
  readonly tier: Tier;
  readonly supportsPublish: boolean;
  readonly supportsDelete: boolean;
  
  publish(input: PublishInput, idempotencyKey: string): Promise<PublishResult>;
  verifyPublish(platformPostId: string): Promise<VerifyResult>;
  deletePost(platformPostId: string): Promise<void>;
  refreshToken(credential: OAuthCredential): Promise<TokenResult>;
  verifyScopes(credential: OAuthCredential): Promise<ScopeResult>;
  healthProbe(): Promise<HealthResult>;
  validateMedia(media: MediaInput): Promise<MediaValidationResult>;
  getCharacterLimit(): CharacterLimit;
  getPlatformFields(): PlatformFieldDeclaration[];
  mapError(response: PlatformResponse): AppError;
}
```

### Error Classification
```typescript
enum ErrorClass {
  Transient = 'transient',     // retry-safe: 429, 502, timeout
  Permanent = 'permanent',     // no retry: 400, 401, 403, policy
  Ambiguous = 'ambiguous',     // investigate: 500, timeout-no-response
  Silent = 'silent'            // ghost: 200 but post missing
}
```

### Circuit Breaker Config
- Open threshold: 5 consecutive failures OR 50% failure rate over 10 requests
- Half-open: 1 probe after 60s, success → close, failure → re-open for 2x duration
- Max backoff: 32x base (capped)
- Only trips on transient errors (permanent errors pass through)

### Token Refresh Schedule (Inngest cron)
| Platform | Refresh Frequency | Cron Expression |
|----------|------------------|-----------------|
| TikTok | Every 20 hours (24h token) | `0 */20 * * *` |
| X/Twitter | Every 90 min (2h token) | `*/90 * * * *` |
| YouTube | Every 45 min (1h token) | `*/45 * * * *` |
| Reddit | Every 45 min (1h token) | `*/45 * * * *` |
| LinkedIn | Weekly (60d token) | `0 0 * * 1` |
| Meta (FB/IG/Threads) | Monthly (60d token) | `0 0 1 * *` |
| Bluesky | Never (app password) | N/A |
| Beehiiv | Never (API key) | N/A |

---

## Part 16: X/Twitter Cost Tracking (User Decision: Include URLs, Track Costs)

Per user preference: include URLs in tweets, track costs in billing dashboard.

### Implementation
1. `ai_calls` table already tracks `cost_cents` — extend `post_results` to also track `platform_cost_cents`
2. X/Twitter adapter calculates cost per post: `hasUrl ? 20 : 1.5` (in cents)
3. Model pricing table already exists — add `platform_pricing` table or column on `connectors`
4. Home screen KPI card: "X/Twitter spend this month: $X.XX" (alongside AI spend)
5. Draft editor: when X channel selected, show cost badge: "Post with URL: $0.20" or "Text only: $0.015"
6. Monthly workspace billing: `SUM(post_results.platform_cost_cents) WHERE channel = 'x'`

---

## Summary: What Gets Built

### Artifacts (27 tables + 20 connector files + 5 n8n workflows + 10 skills)

| Category | Count | Status |
|----------|-------|--------|
| Drizzle schema tables | 27 | Designed, code ready |
| Connector adapter files | 20 | Designed, code ready |
| n8n workflows | 5 | Designed, validated via SDK |
| Platform skills | 10 | Spec'd (triggers + formatting rules) |
| Error handling files | 6 | Designed (taxonomy, circuit breaker, retry, DLQ) |
| Operations files | 3 | Designed (health, alerting, runbook) |
| Security files | 2 | Designed (encryption, workspace isolation) |
| **Total deliverables** | **73 files** | **Ready to build** |

---

## Part 17: Gap Analysis — Self-Review

### Gaps Found & Resolution

| # | Gap | Severity | Resolution |
|---|-----|----------|-----------|
| 1 | **No project-level CLAUDE.md** — future sessions lose context | CRITICAL | Create `CLAUDE.md` at project root with stack, rules, build state, artifact locations |
| 2 | **MEMORY.md has only 3 entries** — session learnings not persisted | CRITICAL | Add 5+ memory files: API research findings, schema decisions, connector architecture, build progress, platform gotchas |
| 3 | **No progress tracking file** — can't resume across sessions | HIGH | Create `PROGRESS.md` in ultra-plan/ tracking which phases/files are done |
| 4 | **No .env.example** — env vars not documented | HIGH | Create template with all 12+ required secrets |
| 5 | **No test strategy** — plan says "verify" but no test framework | MEDIUM | Add: Vitest for unit, Playwright for e2e, test fixtures from prototype data |
| 6 | **No Supabase project setup steps** — pgvector, RLS, connection pooling | HIGH | Add setup checklist: create project, enable pgvector, configure RLS, get connection strings |
| 7 | **No Clerk Organizations setup** — workspace/brand model | MEDIUM | Add setup checklist: create Clerk app, enable Organizations, configure OAuth providers |
| 8 | **Web session overlap risk** — Phase 1 on branch, we're building Phase 0 | HIGH | Phase 0 goes on separate branch `ultra-plan/foundation`. Merge into main after Phase 1 PR merges |
| 9 | **Agent artifact files scattered** — 6 files in .claude/plans/ | MEDIUM | Consolidate into ultra-plan/ directory as reference docs when we exit plan mode |
| 10 | **No Inngest setup** — background jobs designed but no dev environment | MEDIUM | Add: Inngest dev server, event catalog, function registration |
| 11 | **Platform API keys not inventoried** — which ones do we have? | HIGH | Audit: which OAuth apps are created? Which API keys exist? Document in connectors checklist |
| 12 | **No mobile/responsive plan** — prototype is desktop-only | LOW | Defer to Phase 8. Mobile is not MVP. |

### Tools/APIs/Skills Access Audit

| Resource | Available? | How to Access |
|----------|-----------|--------------|
| **Supabase MCP** | YES | `mcp__plugin_supabase_supabase__*` tools. Can create projects, run SQL, manage migrations |
| **n8n MCP** | YES | `mcp__claude_ai_n8n__*` tools. Can create workflows, validate, execute |
| **Context7 (API docs)** | YES | `mcp__plugin_context7_context7__*` + `mcp__claude_ai_Context7__*`. Library doc lookup |
| **Google Drive MCP** | YES | `mcp__claude_ai_Google_Drive__*`. For Substack copy-paste files |
| **Slack MCP** | YES | `mcp__claude_ai_Slack__*`. For alerts and notifications |
| **Gmail MCP** | YES | `mcp__claude_ai_Gmail__*`. For operator alerts |
| **Vercel MCP** | YES | `mcp__claude_ai_Vercel__*`. For deployment |
| **GitHub (gh CLI)** | YES | Via Bash. Repo at neerajkumar-builds/content-intelligence |
| **Granola (meetings)** | YES | `mcp__claude_ai_Granola__*`. Not needed for this project |
| **Lucid (diagrams)** | YES | `mcp__claude_ai_Lucid__*`. For architecture diagrams |
| **Firebase** | YES | `mcp__plugin_firebase_firebase__*`. Not needed |

### Skills Access Audit

| Skill | Available? | Use For |
|-------|-----------|---------|
| `linkedin-post` | YES | Content formatting for LinkedIn |
| `twitter-thread` | YES | Thread creation for X |
| `instagram-post` | YES | IG content formatting |
| `youtube-episode` | YES | YouTube metadata + description |
| `reddit-post` | YES | Reddit submission formatting |
| `blog-post` | YES | Blog content from drafts |
| `newsletter-section` | YES | Newsletter formatting |
| `content-kit` | YES | Multi-platform repurposing |
| `content-brief` | YES | Brief generation |
| `content-research` | YES | Signal research |
| `content-calendar` | YES | Weekly planning |
| `frontend-design` | YES | UI implementation quality |
| `deploy` | YES | Pre-deploy checklist |
| `test` | YES | Type check + build verification |
| `db` | YES | Database/Payload CMS operations |
| `backend` | YES | API route development |
| `frontend` | YES | Page/component development |

### Hooks Access

| Hook | Purpose |
|------|---------|
| `caveman` | Token-efficient communication (active) |
| `session-start` | Initialize with project context |
| `session-end` | Sync memory, log progress |

---

## Part 18: Context Persistence Strategy

### Files to Create When Exiting Plan Mode

#### 1. Project CLAUDE.md (at project root)
```
Location: /Content Intelligence/CLAUDE.md
Purpose: Auto-loaded by Claude Code every session. Source of truth for project context.
Contains:
  - Product definition (1 paragraph)
  - Tech stack table
  - Critical product rules (status vocab, 7-dim, 62 rules, glass-box, idempotency)
  - Current build state (which phases complete)
  - File locations (design handoff, ultra-plan, schemas, connectors)
  - Platform API gotchas (top 10 surprises from research)
  - How to resume: "Read PROGRESS.md first"
```

#### 2. Progress Tracking (ultra-plan/PROGRESS.md)
```
Location: /Content Intelligence/ultra-plan/PROGRESS.md
Purpose: Track what's done, what's next, blockers, decisions
Format: Checklist with timestamps
Updated: After every build session
```

#### 3. Memory Files to Create/Update
```
New memories:
  - project_build_state.md — Current phase, branch, what's deployed
  - project_api_research.md — Key API gotchas (X pricing, IG JPEG-only, TikTok SELF_ONLY)
  - project_schema_decisions.md — Why 27 tables, key constraints, index strategy
  - project_connector_architecture.md — Adapter pattern, circuit breaker, token refresh schedule
  - feedback_thorough_planning.md — User wants gap analysis + persistence before building

Update MEMORY.md index with all new entries
```

#### 4. Environment Template (.env.example)
```
Location: /Content Intelligence/.env.example (or ultra-plan/.env.example)
Contains: All 12+ required env vars with descriptions, no actual values
```

#### 5. Ultra Plan Local Copy
```
Location: /Content Intelligence/ultra-plan/ULTRA-PLAN.md
Purpose: Local copy of the full plan for reference (doesn't depend on .claude/plans/)
Also copy: All 6 agent artifact files as reference docs in ultra-plan/reference/
```

### How Future Sessions Resume

1. Claude Code auto-loads `CLAUDE.md` → knows project, stack, rules
2. Memory auto-loads → knows API gotchas, schema decisions, build state
3. Session reads `ultra-plan/PROGRESS.md` → knows exactly where we left off
4. Agent artifact files in `ultra-plan/reference/` → has all code ready to paste
5. Design handoff in `design_handoff_content_intelligence_agent/` → pixel-perfect spec

### Cross-Session Continuity Checklist
- [ ] CLAUDE.md at project root (auto-loaded)
- [ ] MEMORY.md updated with all learnings (auto-loaded)
- [ ] PROGRESS.md tracks build state (manual read)
- [ ] Agent artifacts consolidated in ultra-plan/reference/
- [ ] .env.example documents all required secrets
- [ ] Git branch strategy documented (Phase 0 on separate branch)
- [ ] n8n workflows saved as JSON in ultra-plan/n8n-workflows/
- [ ] Drizzle schema files ready in ultra-plan/schemas/
- [ ] Connector adapter files ready in ultra-plan/connectors/

---

## Part 19: Supabase + Infrastructure Setup Checklist

### Supabase Project Setup
- [ ] Create Supabase project (or use existing Full Funnel project)
- [ ] Enable pgvector extension: `CREATE EXTENSION IF NOT EXISTS vector;`
- [ ] Configure connection pooling (pgBouncer on port 6543)
- [ ] Get connection strings: pooled (for app) + direct (for migrations)
- [ ] Enable Row-Level Security on all tables
- [ ] Create application role with restricted grants (INSERT+SELECT only on audit_log)
- [ ] Configure Supabase Vault for OAuth token encryption (or use app-level AES-256-GCM)

### Clerk Organizations Setup
- [ ] Create Clerk application
- [ ] Enable Organizations feature
- [ ] Configure roles: owner, admin, editor, approver, viewer
- [ ] Set up OAuth providers for social login (optional)
- [ ] Get CLERK_SECRET_KEY and NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY

### Inngest Setup
- [ ] Install Inngest dev server (`npx inngest-cli@latest dev`)
- [ ] Create Inngest client (`src/server/inngest/client.ts`)
- [ ] Register event catalog (publish, grade, ingest, refresh, contract-test, ghost-detect, export)
- [ ] Get INNGEST_SIGNING_KEY and INNGEST_EVENT_KEY

### Vercel Setup
- [ ] Link project to Vercel
- [ ] Configure environment variables (all 12+ secrets)
- [ ] Set up preview deployments for PRs
- [ ] Configure health check endpoint

---

## Part 20: Test Strategy

### Test Framework
- **Unit tests**: Vitest (compatible with Next.js 15+)
- **Integration tests**: Vitest + Drizzle test helpers (real Postgres, no mocks)
- **E2E tests**: Playwright (defer to Phase 8)
- **Contract tests**: Custom Inngest functions (11 tests per connector)

### What to Test Per Phase

**Phase 0 (Foundation):**
- Error taxonomy: classify known errors correctly
- Circuit breaker: state transitions (closed→open→half-open)
- Rate limiter: sliding window + token bucket calculations
- Token manager: encrypt/decrypt roundtrip
- Workspace isolation: `scopedDb` blocks cross-workspace queries

**Phase 2 (Data Model):**
- Schema migration runs clean
- All FK constraints enforced
- Idempotency key uniqueness
- Status enum constraints
- pgvector embedding storage + cosine similarity query

**Phase 4 (Connectors):**
- LinkedIn adapter: publish text, publish with media, handle 429, handle expired token
- Token refresh: verify new token works after refresh
- Ghost detection: verify post exists after publish
- Circuit breaker integration: 5 failures → open → held posts

**Phase 6 (Drafts):**
- 7-dim grading produces valid 0-10 scores
- Anti-AI rules catch known violations
- Glass-box: every AI call logged to ai_calls table
- Voice fidelity: cosine similarity against corpus

### Build Sequence for Local Session

**Phase 0** (Foundation — build first, here locally):
1. Create `ultra-plan/` directory with all artifact files
2. Error taxonomy + AppError class
3. Drizzle schema (all 27 tables)
4. Connector adapter interface + base class
5. Circuit breaker + rate limiter + token manager
6. Health endpoint skeleton

**Phase 2** (Data Model — merge into main codebase):
1. Copy schema files from `ultra-plan/` → `src/db/schema/`
2. Run first migration
3. Seed dev data
4. tRPC router skeleton

**Phase 4** (Connectors — merge adapters):
1. Copy connector files from `ultra-plan/` → `src/lib/connectors/`
2. Implement LinkedIn adapter first (Tier 1)
3. Wire contract tests as Inngest cron
4. Deploy n8n workflows 1 + 4

Then Phases 5-8 follow the existing build plan with the foundation in place.
