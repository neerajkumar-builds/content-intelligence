# Module 2A: Signal Intelligence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add profile-based competitor/thought leader tracking with multi-platform source discovery (RSS, YouTube RSS, Google News RSS, Reddit RSS) and LLM signal classification.

**Architecture:** Two new tables (profiles, profile_platform_links) extend the existing signal pipeline. Auto-discovery utilities resolve user URLs into RSS feeds. A new Gemini Flash classification step enriches signals. Profile detail pages replace placeholder /competitors and /leaders routes.

**Tech Stack:** Next.js 16.2.6, tRPC 11.13.0, Drizzle 0.45.2, Inngest 4.3.0, Zod 4.4.3, Gemini 2.0 Flash (classification), Supabase (direct SQL migration)

**Spec:** `docs/superpowers/specs/2026-05-13-signal-intelligence-design.md`

**Critical constraints:**
- NEVER use drizzle-kit push (shared Supabase DB with Meeting Intelligence tables)
- Every push to main = production deploy (Vercel auto-deploy)
- Inngest stays at 6 functions — classification is a step inside process-signal
- ctx.workspaceId = Clerk orgId (string), ctx.scoped.workspaceId = UUID

---

## Dependency Graph

```
Task 1: Schema + Migration (foundation)
    |
    +---> Task 2: RSS Discovery Utility (independent)
    +---> Task 3: YouTube Utils (independent)
    +---> Task 4: Google News Utils (independent)
    |        |
    v        v
Task 5: Profiles Router (uses schema + all 3 utils)
    |
    +---> Task 6: Webhook Enhancement (profileId + sourceUrl dedup)
    +---> Task 7: Process-Signal Enhancement (classify step)
    |
    v
Task 8: Competitors Page
Task 9: Leaders Page
Task 10: Profile Detail Pages
Task 11: Add Profile Dialog
    |
    v
Task 12: Existing Page Enhancements
    |
    v
Task 13: n8n Workflow Update
    |
    v
Task 14: Build Verification + Hygiene
```

Tasks 2-4 are parallelizable. Tasks 8-11 are parallelizable.

---

### Task 1: Schema + Enums + Migration

**Files:**
- Create: `src/db/schema/profiles.ts`
- Modify: `src/db/schema/enums.ts`
- Modify: `src/db/schema/signals.ts`
- Modify: `src/db/schema/index.ts`

- [ ] **Step 1:** Add 4 new pgEnums to `src/db/schema/enums.ts` after `exportStatusEnum`: profileTypeEnum (competitor, thought_leader, content_creator), profileImportanceEnum (high, medium, low), profilePlatformEnum (website, linkedin, twitter, youtube, instagram, tiktok, reddit, substack, medium, podcast), fetchMethodEnum (rss, rss_discovery, youtube_rss, reddit_rss, google_news, apify, manual).

- [ ] **Step 2:** Create `src/db/schema/profiles.ts` with profiles table (id, workspaceId FK cascade, name, type, website, description, importance default medium, notes, metadata jsonb, archivedAt nullable, timestamps) and profilePlatformLinks table (id, profileId FK cascade, platform, url, feedUrl nullable, fetchMethod, enabled default true, lastFetchedAt nullable, metadata jsonb, timestamps). Constraints: unique(workspaceId, name, type) on profiles, unique(profileId, platform) on links. Indexes: profiles_ws_idx, profiles_ws_type_idx, ppl_profile_idx. Follow exact Drizzle patterns from `src/db/schema/integrations.ts`.

- [ ] **Step 3:** Add profileId (uuid nullable), publishedAt (timestamptz nullable) to signals table in `src/db/schema/signals.ts`. Add profileId (uuid nullable), fetchMethod (fetchMethodEnum nullable), lastErrorAt (timestamptz nullable), lastErrorMessage (text nullable) to signalSourceConfigs table. Import fetchMethodEnum from enums.

- [ ] **Step 4:** Add barrel export to `src/db/schema/index.ts`: `export { profiles, profilePlatformLinks } from "./profiles";`

- [ ] **Step 5:** Run SQL migration via Supabase MCP (`apply_migration`). Create types, create tables, alter existing tables. Include indexes and partial unique index on signals(workspaceId, sourceUrl) WHERE sourceUrl IS NOT NULL.

- [ ] **Step 6:** Run `pnpm build` — must pass with zero errors.

- [ ] **Step 7:** Commit: `feat(schema): profiles + platform links tables, 4 new enums, signal columns (Module 2A)`

---

### Task 2: RSS Auto-Discovery Utility

**Files:**
- Create: `src/lib/signals/rss-discovery.ts`

- [ ] **Step 1:** Create `src/lib/signals/rss-discovery.ts` with `discoverRssFeeds(websiteUrl: string)` function. Returns `{ feeds: Array<{url, title, type}>, errors: string[] }`. Algorithm: normalize URL, fetch HTML (8s timeout), parse link[rel=alternate] tags for RSS/Atom, resolve relative URLs, probe common paths (/feed, /rss, /rss.xml, /atom.xml, /blog/feed, /blog/rss.xml, /feed.xml, /index.xml) via HEAD + content-type check, validate each candidate by fetching first 200 bytes checking for xml/rss/feed markers. All fetches use AbortController timeouts and User-Agent header.

- [ ] **Step 2:** Run `pnpm build` — must pass.

- [ ] **Step 3:** Commit: `feat(signals): RSS auto-discovery utility`

---

### Task 3: YouTube Channel Utils

**Files:**
- Create: `src/lib/signals/youtube-utils.ts`

- [ ] **Step 1:** Create `src/lib/signals/youtube-utils.ts` with `resolveYouTubeRss(youtubeUrl: string)` function. Returns `{ channelId, feedUrl }` or `{ error }`. Handles /channel/UC... (direct extract), /@handle (fetch HTML, parse meta itemprop=channelId or regex for UC pattern), /c/name and /user/name (same HTML parsing). Constructs feed URL: `youtube.com/feeds/videos.xml?channel_id={id}`. 8s timeout on HTML fetch.

- [ ] **Step 2:** Run `pnpm build` — must pass.

- [ ] **Step 3:** Commit: `feat(signals): YouTube channel ID extraction + RSS URL construction`

---

### Task 4: Google News URL Utility

**Files:**
- Create: `src/lib/signals/google-news.ts`

- [ ] **Step 1:** Create `src/lib/signals/google-news.ts` with `buildGoogleNewsUrl({ query, contextTerms?, recencyDays?, language? })` (pure function, returns URL string) and `resolveGoogleNewsRedirect(googleUrl)` (async, follows HEAD redirect to get actual article URL, 5s timeout, returns original on failure). Default recency 30 days, language en-US.

- [ ] **Step 2:** Run `pnpm build` — must pass.

- [ ] **Step 3:** Commit: `feat(signals): Google News RSS URL builder + redirect resolver`

---

### Task 5: Profiles Router

**Files:**
- Create: `src/server/routers/profiles.ts`
- Modify: `src/server/routers/_app.ts`
- Modify: `src/server/routers/signals.ts`

- [ ] **Step 1:** Create `src/server/routers/profiles.ts` as 14th tRPC router with procedures: list (filter by type, exclude archived by default, return profiles with platform links and signal counts via JOINs), getById (workspace-scoped, return profile + links + source configs), create (insert profile, run auto-discovery in parallel via Promise.allSettled — RSS from website, Google News from name, YouTube/Reddit/social from platform URLs, create platform_links and signal_source_configs for each discovered feed), update (partial update, workspace-scoped), archive (set archivedAt, disable all source configs), delete (hard delete, workspace-scoped), addPlatformLink (discover single link, create platform_link + source_config), removePlatformLink (delete link + associated source_config), togglePlatformLink (toggle enabled on link + source_config), getProfileSignals (paginated signals by profileId).

- [ ] **Step 2:** Register in `src/server/routers/_app.ts`: import profilesRouter, add `profiles: profilesRouter`.

- [ ] **Step 3:** In `src/server/routers/signals.ts`, add optional `profileId: z.string().uuid().optional()` to addSource input. Pass through to signalSourceConfigs insert.

- [ ] **Step 4:** Run `pnpm build` — must pass. 14 routers registered.

- [ ] **Step 5:** Commit: `feat(api): profiles router (14th) — CRUD, auto-discovery, platform link management`

---

### Task 6: Webhook Enhancement

**Files:**
- Modify: `src/lib/webhooks/schemas.ts`
- Modify: `src/app/api/webhooks/n8n/route.ts`
- Modify: `src/server/inngest/events.ts`

- [ ] **Step 1:** Add `profileId: z.string().uuid().optional()` and `publishedAt: z.string().datetime().optional()` to signalPayloadSchema in schemas.ts.

- [ ] **Step 2:** Add `profileId: z.string().uuid().optional()` to SignalIngested event data in events.ts.

- [ ] **Step 3:** In webhook route.ts: (a) Add error payload handling at start — if parsed.error === true, update signal_source_configs.lastErrorAt + lastErrorMessage, return 200. (b) Add sourceUrl-based dedup before CTE insert — SELECT existing signal by (workspaceId, sourceUrl), skip if found. (c) Pass profileId and publishedAt through to signals INSERT. (d) Include profileId in Inngest event send.

- [ ] **Step 4:** Run `pnpm build` — must pass.

- [ ] **Step 5:** Commit: `feat(webhook): profileId passthrough, sourceUrl dedup, error payload handling`

---

### Task 7: Process-Signal Enhancement (LLM Classification)

**Files:**
- Modify: `src/server/inngest/functions/process-signal.ts`

- [ ] **Step 1:** Add `step.run("classify-signal", ...)` after the embed step and before the brand loop. Call Gemini 2.0 Flash with signal title + first 1000 chars of body. Parse JSON response with contentType, themes[], suggestedFormats[], contentAngle, relevanceScore. Store in signals.metadata.classification via JSONB merge. Wrap in try/catch — on failure, return null and log error (graceful degradation).

- [ ] **Step 2:** In the idea creation section (inside brand loop), prefer classification data when available: use classification.suggestedFormats instead of inferFormats() if present, use classification.contentAngle instead of inferAngle() if present.

- [ ] **Step 3:** Run `pnpm build` — must pass. process-signal still function 5 of 6.

- [ ] **Step 4:** Commit: `feat(inngest): LLM signal classification via Gemini Flash in process-signal`

---

### Task 8: Competitors Page

**Files:**
- Create: `src/app/(app)/competitors/page.tsx`
- Create: `src/components/profiles/profile-card.tsx`

- [ ] **Step 1:** Create ProfileCard component (`src/components/profiles/profile-card.tsx`). Displays name, website, description, importance badge, platform status dots (green=active, amber=apify_needed, red=error), signal count, idea count, active/total sources, last activity. Click navigates to detail page. Follows styling from idea-card.tsx.

- [ ] **Step 2:** Replace competitors page placeholder with real page. Uses trpc.profiles.list({ type: "competitor" }). Top bar: importance filter chips + "Add Competitor" button. Card grid (auto-fill minmax 320px). Empty state. Skeleton loader.

- [ ] **Step 3:** Verify on localhost: `/competitors` renders empty state.

- [ ] **Step 4:** Commit: `feat(ui): competitors page with profile cards and importance filter`

---

### Task 9: Leaders Page

**Files:**
- Create: `src/app/(app)/leaders/page.tsx`

- [ ] **Step 1:** Replace leaders page placeholder. Same structure as competitors but type="thought_leader". Person cards with avatar initials (first letter of first + last name). Shows title/company from metadata. "Add Thought Leader" button. Empty state.

- [ ] **Step 2:** Verify on localhost: `/leaders` renders empty state.

- [ ] **Step 3:** Commit: `feat(ui): thought leaders page with person cards`

---

### Task 10: Profile Detail Pages

**Files:**
- Create: `src/components/profiles/profile-detail.tsx`
- Create: `src/app/(app)/competitors/[id]/page.tsx`
- Create: `src/app/(app)/leaders/[id]/page.tsx`

- [ ] **Step 1:** Create shared ProfileDetailPage component. Props: profileId, backUrl, backLabel. Calls trpc.profiles.getById. Two-column layout: left panel (280px, platform links with status/toggle/signal count, notes textarea, "Add platform link") and right panel (tabs: "Their Content" using trpc.profiles.getProfileSignals, "Your Ideas" using trpc.ideas.list filtered by profile signal IDs). Each signal row: classification tag, title, excerpt, timestamp, ICP fit, "Generate Draft" button. Empty states per section.

- [ ] **Step 2:** Create competitor detail route (`/competitors/[id]`) and leader detail route (`/leaders/[id]`), both rendering ProfileDetailPage with appropriate backUrl.

- [ ] **Step 3:** Verify on localhost with a profile created.

- [ ] **Step 4:** Commit: `feat(ui): profile detail pages — platform links, signals feed, ideas tab`

---

### Task 11: Add Profile Dialog

**Files:**
- Create: `src/components/profiles/add-profile-dialog.tsx`

- [ ] **Step 1:** Create AddProfileDialog component. Props: open, onClose, defaultType. Fields: name, website, type (radio), importance (radio), optional platform URLs (LinkedIn, Twitter, YouTube expandable). "Add and Discover Sources" button calls trpc.profiles.create. Shows inline discovery results (green/amber/red per platform). Uses same overlay/backdrop pattern as add-source-dialog.tsx.

- [ ] **Step 2:** Wire dialog to competitors and leaders pages. Import, add state for dialog open/close, pass defaultType.

- [ ] **Step 3:** Verify E2E: add a competitor, see discovery results, profile card appears.

- [ ] **Step 4:** Commit: `feat(ui): add profile dialog with inline auto-discovery results`

---

### Task 12: Existing Page Enhancements

**Files:**
- Modify: `src/components/ideas/filter-bar.tsx`
- Modify: `src/components/ideas/idea-card.tsx`
- Modify: `src/app/(app)/signals/page.tsx`
- Modify: `src/app/(app)/page.tsx`
- Modify: `src/components/ideas/source-rail.tsx`

- [ ] **Step 1:** FilterBar: add "Competitor" and "Leader" chips to source filter options.

- [ ] **Step 2:** IdeaCard: show classification tag badge (colored by contentType) if signal metadata has classification. Show profile attribution in source badge.

- [ ] **Step 3:** Signal Explorer: add profile dropdown filter using trpc.profiles.list.

- [ ] **Step 4:** Home dashboard: add "Competitor Activity (7d)" stat card.

- [ ] **Step 5:** SourceRail: add "Link to profile" button on sources without profileId.

- [ ] **Step 6:** Verify all enhancements on localhost.

- [ ] **Step 7:** Commit: `feat(ui): profile attribution on Idea Wall, Signal Explorer filter, competitor activity stat`

---

### Task 13: n8n Workflow Update

- [ ] **Step 1:** Update n8n Signal Harvester workflow via MCP: modify Supabase query to include profile_id (JOIN profiles for name/type), add profileId + profileName + fetchMethod to webhook payload metadata, add date filtering (items newer than lastFetchedAt), add error reporting (POST error payload on fetch failure).

- [ ] **Step 2:** Test: manual sync, verify profileId in webhook payloads.

- [ ] **Step 3:** Document changes in DEPENDENCY-MAP.md.

---

### Task 14: Build Verification + Hygiene

- [ ] **Step 1:** Run `pnpm build` — zero errors.

- [ ] **Step 2:** Verify Supabase: profiles + profile_platform_links tables exist, signals has profile_id + published_at, signal_source_configs has new columns, partial unique index exists.

- [ ] **Step 3:** E2E on localhost: add competitor, sync signals, view profile detail, Idea Wall filter, Signal Explorer filter.

- [ ] **Step 4:** Update CLAUDE.md: tables 31 to 33, routers 13 to 14, procedures ~80, new file paths, Module 2A status.

- [ ] **Step 5:** Update ultra-plan tracking files (PROGRESS.md, CHANGELOG.md, QA-RESULTS.md, DEPENDENCY-MAP.md, LEARNINGS.md).

- [ ] **Step 6:** Commit: `chore(hygiene): Module 2A complete — profiles, multi-platform sources, LLM classification`
