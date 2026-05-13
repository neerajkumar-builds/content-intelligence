# Module 2A: Signal Intelligence — Profiles + Multi-Platform Sources

## Context

Module 1 closed the output loop (approved drafts export to Google Drive + Slack). Module 2 expands the INPUT — moving from RSS-only signal ingestion to multi-platform monitoring of competitors, thought leaders, and content creators.

The existing n8n "Social Listening V2" workflow tracks 6 audience segments across 8 Google Sheets tabs. CI productizes this 10x better: automated ingestion, real-time scoring, profile-based tracking, and LLM classification.

**This spec covers Tier 1 (free sources).** Tier 2 (Apify for LinkedIn/Twitter/Instagram) is a follow-up spec. The architecture supports all tiers from day one.

**Goal:** Users add a competitor by name + website. System auto-discovers RSS feeds, generates Google News monitoring, resolves YouTube channels — then signals flow through the existing pipeline with richer classification and profile attribution.

---

## Architecture Overview

```
User adds profile (name + website + optional platform URLs)
    |
    v
Auto-discovery (RSS, YouTube RSS, Google News RSS)
    |
    v
signal_source_configs auto-created (profileId linked)
    |
    v
n8n Signal Harvester fetches (existing workflow, enhanced)
    |
    v
Webhook (HMAC verified, sourceUrl dedup, profileId passthrough)
    |
    v
process-signal Inngest function (existing, enhanced)
    |--- Step 1: Fetch signal (existing)
    |--- Step 2: Embed signal (existing — Gemini embedding-001, 3072 dims)
    |--- Step 3: Classify signal (NEW — Gemini Flash, ~$0.002/signal)
    |--- Step 4: Rank against brand corpus (existing)
    |--- Step 5: Create ideas per brand (existing, enhanced with classification)
    |--- Step 6: Mark processed (existing)
    |
    v
Ideas appear on Idea Wall + Profile detail pages
```

**What's NEW vs existing:** Profiles, platform links, auto-discovery utilities, LLM classification step, UI pages. The core pipeline (webhook → Inngest → embed → score → idea) stays intact.

---

## Schema Design

### New Enums

```sql
CREATE TYPE profile_type AS ENUM ('competitor', 'thought_leader', 'content_creator');
CREATE TYPE profile_importance AS ENUM ('high', 'medium', 'low');
CREATE TYPE profile_platform AS ENUM ('website', 'linkedin', 'twitter', 'youtube', 'instagram', 'tiktok', 'reddit', 'substack', 'medium', 'podcast');
CREATE TYPE fetch_method AS ENUM ('rss', 'rss_discovery', 'youtube_rss', 'reddit_rss', 'google_news', 'apify', 'manual');
```

### New Table: `profiles`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK, default gen_random_uuid() | |
| workspaceId | UUID | NOT NULL, FK workspaces(id) ON DELETE CASCADE | Workspace-scoped, NOT brand-scoped |
| name | TEXT | NOT NULL | "HubSpot" or "Pam Didner" |
| type | profile_type | NOT NULL | competitor, thought_leader, content_creator |
| website | TEXT | nullable | Primary website URL |
| description | TEXT | nullable | Auto-generated or user-written |
| importance | profile_importance | NOT NULL, default 'medium' | pgEnum for type safety |
| notes | TEXT | nullable | Qualitative observations |
| metadata | JSONB | NOT NULL, default '{}' | Type-specific: {industry, size, products} for companies, {title, company, expertise} for people |
| archivedAt | TIMESTAMPTZ | nullable | Soft delete — archived profiles stop fetching |
| createdAt | TIMESTAMPTZ | NOT NULL, default now() | |
| updatedAt | TIMESTAMPTZ | NOT NULL, default now() | |

**Constraints:**
- UNIQUE(workspaceId, name, type) — prevents duplicate profiles
- INDEX on workspaceId
- INDEX on (workspaceId, type) — for /competitors and /leaders page queries

### New Table: `profile_platform_links`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK, default gen_random_uuid() | |
| profileId | UUID | NOT NULL, FK profiles(id) ON DELETE CASCADE | |
| platform | profile_platform | NOT NULL | website, linkedin, twitter, youtube, etc. |
| url | TEXT | NOT NULL | User-provided URL |
| feedUrl | TEXT | nullable | System-discovered feed URL (differs from url) |
| fetchMethod | fetch_method | NOT NULL | How to get content from this URL |
| enabled | BOOLEAN | NOT NULL, default true | |
| lastFetchedAt | TIMESTAMPTZ | nullable | |
| metadata | JSONB | NOT NULL, default '{}' | Platform-specific extras |
| createdAt | TIMESTAMPTZ | NOT NULL, default now() | |
| updatedAt | TIMESTAMPTZ | NOT NULL, default now() | |

**Constraints:**
- UNIQUE(profileId, platform) — one link per platform per profile
- INDEX on profileId

### Modified Table: `signal_source_configs`

Add columns:
- `profileId` UUID, nullable, FK profiles(id) ON DELETE SET NULL
- `fetchMethod` fetch_method, nullable (for existing rows)
- `lastErrorAt` TIMESTAMPTZ, nullable
- `lastErrorMessage` TEXT, nullable
- INDEX on profileId

### Modified Table: `signals`

Add columns:
- `profileId` UUID, nullable, FK profiles(id) ON DELETE SET NULL
- `publishedAt` TIMESTAMPTZ, nullable (extracted from metadata during ingestion)
- INDEX on (workspaceId, profileId)
- UNIQUE on (workspaceId, sourceUrl) WHERE sourceUrl IS NOT NULL — sourceUrl-based dedup

### NOT Modified

- `ideas` — attribution flows through signal → profile relationship. `sourceLabel` is a snapshot at creation time (intentional — preserves history).

---

## User Flows

### Flow 1: Add Competitor

1. User clicks "Add Competitor" on /competitors page
2. Dialog opens with fields: Name*, Website*, Type (pre-selected: Competitor), Importance (default: Medium)
3. User enters "HubSpot" + "hubspot.com"
4. User optionally adds platform URLs (LinkedIn, Twitter, YouTube)
5. User clicks "Add & Discover Sources"
6. Backend creates profile row
7. Backend runs auto-discovery (synchronous, ~3-5s):
   a. **RSS Discovery:** Fetch hubspot.com HTML → parse `<link rel="alternate" type="application/rss+xml">` → try common paths (/feed, /rss, /rss.xml, /blog/rss) → validate candidates
   b. **Google News:** Generate `https://news.google.com/rss/search?q="HubSpot"+AND+("B2B"+OR+"CRM"+OR+"marketing")&when:30d&hl=en-US` — context terms from profile description or brand brief ICP
   c. **YouTube:** If URL provided, extract channel ID (parse HTML for `/@handle` format) → construct `youtube.com/feeds/videos.xml?channel_id={ID}`
   d. **LinkedIn/Twitter:** Store URL, set fetchMethod='apify', show "Apify needed" status
8. For each discovered feed:
   a. Create `profile_platform_links` row with url + feedUrl + fetchMethod
   b. Create `signal_source_configs` row with feedUrl + profileId + source type
   c. Config enabled=true by default
9. Return to /competitors page — new profile card appears with platform status badges
10. n8n picks up new configs on next run (30min) or user clicks "Refresh"

**When RSS auto-discovery fails:**
- Platform link shows warning: "No RSS feed found"
- Options: "Enter feed URL manually" (text input) or "Skip" (link stays with fetchMethod='manual')
- Google News always succeeds (URL template), so there's always at least one source

**LLM profile enrichment (one-time, on creation):**
- If user only provides name + website, call Gemini Flash with website HTML:
  "Describe this company/person in 2 sentences. What industry? What products? Who is their target customer?"
- Store result in profiles.description + profiles.metadata
- Cost: ~$0.005/profile (one-time)

### Flow 2: Add Thought Leader

Same as Flow 1, but:
- Type pre-selected: Thought Leader
- Person-specific fields in metadata: { title, company, expertise }
- Avatar initials generated from name (first letter of first + last name)
- Platform links tend to be LinkedIn + blog (not YouTube/news)

### Flow 3: View Profile Detail

1. User clicks profile card on /competitors or /leaders
2. Routes to `/competitors/{id}` or `/leaders/{id}`
3. Left panel: platform links with status, notes, edit button, "Add platform link" button, "Refresh Sources" button
4. Right panel tabs:
   - **Their Content**: raw signals from this profile, chronological, filterable by platform. Shows LLM classification tags (Product Launch, Tutorial, Funding, etc.)
   - **Your Ideas**: ideas generated from this profile's signals, ranked by composite score. "Generate Draft" button on each.

### Flow 4: Edit Profile

- Everything editable: name, type, website, importance, notes, description
- Changing type moves profile between /competitors and /leaders pages (confirmation dialog)
- Changing website triggers RSS re-discovery
- Platform links: add/remove/edit URLs, toggle enabled per link
- Each link shows connection status: healthy (green), error (red with message), pending (gray)

### Flow 5: Archive/Delete Profile

- Archive (soft delete): sets archivedAt, disables all source configs, profile disappears from main list but visible in "Archived" filter
- Delete: confirmation dialog showing counts — "This will disconnect 47 signals and stop 3 sources. Signals and ideas are preserved."
- ON DELETE SET NULL on signal_source_configs.profileId and signals.profileId

---

## Technical Design

### RSS Auto-Discovery

**File:** `src/lib/signals/rss-discovery.ts`

```typescript
export async function discoverRssFeeds(websiteUrl: string): Promise<{
  feeds: Array<{ url: string; title: string; type: 'rss' | 'atom' }>;
  errors: string[];
}>
```

Algorithm:
1. Fetch website HTML (8s timeout, follow redirects)
2. Parse `<head>` for `<link rel="alternate" type="application/rss+xml" href="...">` and `<link rel="alternate" type="application/atom+xml" href="...">`
3. Resolve relative URLs against base
4. If no `<link>` tags found, probe common paths: `/feed`, `/feed.xml`, `/rss`, `/rss.xml`, `/blog/feed`, `/blog/rss.xml`, `/atom.xml` — HTTP HEAD with 5s timeout, check Content-Type for `xml` or `rss` or `atom`
5. Validate each candidate: fetch first 100 bytes, check for `<?xml` or `<rss` or `<feed`
6. Return array of valid feeds

### YouTube Channel ID Extraction

**File:** `src/lib/signals/youtube-utils.ts`

```typescript
export async function resolveYouTubeRss(youtubeUrl: string): Promise<{
  channelId: string;
  feedUrl: string;
} | { error: string }>
```

Handles URL formats:
- `youtube.com/channel/UC...` → extract directly
- `youtube.com/@handle` → fetch page HTML, extract `<meta itemprop="channelId" content="UC...">`
- `youtube.com/c/customname` → same HTML parsing
- `youtube.com/user/username` → same HTML parsing
- Construct: `https://www.youtube.com/feeds/videos.xml?channel_id={channelId}`

### Google News RSS Construction

**File:** `src/lib/signals/google-news.ts`

```typescript
export function buildGoogleNewsUrl(options: {
  query: string;
  contextTerms?: string[];
  recencyDays?: number;
  language?: string;
}): string
```

- Default recency: 30 days (`when:30d`)
- Context terms added as AND clauses to reduce irrelevant results
- Context terms sourced from: profile description, brand brief ICP keywords, or user-provided
- URL template: `https://news.google.com/rss/search?q=${encodedQuery}&when:${days}d&hl=${lang}&gl=US&ceid=US:en`

**Google News redirect resolution:**

Google News RSS items contain redirect URLs (`https://news.google.com/rss/articles/...`). Resolve to actual article URL:
- Follow HTTP redirect (301/302) to get final URL
- Store final URL as `signals.sourceUrl`, original as `metadata.googleNewsUrl`
- Critical for dedup: two Google News entries may redirect to the same article

### LLM Signal Classification

**Added to:** `src/server/inngest/functions/process-signal.ts` as `step.run("classify-signal")`

**Model:** Gemini 2.0 Flash (fast, cheap, good classification accuracy)
**Cost:** ~$0.002/signal (~$12/month at 200 signals/day)

**Input:** Signal title + first 1000 chars of body + source type + profile type (if available)

**Output schema:**
```typescript
{
  contentType: 'blog_post' | 'video' | 'podcast' | 'social_post' | 'press_release' | 'report' | 'webinar' | 'newsletter' | 'case_study' | 'product_update' | 'hiring' | 'event',
  themes: string[],          // max 5, e.g. ["AI", "CRM", "enterprise"]
  suggestedFormats: string[], // e.g. ["linkedin-long", "newsletter"]
  contentAngle: string,       // e.g. "Counter-narrative: why human-in-the-loop beats autonomous"
  relevanceScore: number      // 0-1, how relevant to workspace's ICP
}
```

**Stored in:** `signals.metadata.classification`

**Graceful degradation:** If Gemini rate-limits (429) or errors, Inngest retries (3 retries). If all retries fail, proceed without classification — signal still gets embedded and scored. Log to dead_letter_queue. Rule-based `inferAngle()` and `inferFormats()` serve as fallback.

**Impact on idea creation:**
- `suggestedFormats` overrides rule-based `inferFormats()` when available
- `contentAngle` enriches `ideas.angle` field
- `contentType` added to signal metadata for UI tags ("Product Launch", "Tutorial")
- `relevanceScore` used as a secondary scoring signal

### Dedup Strategy (3 layers)

1. **Webhook payload hash** (existing): `webhook_deliveries.payload_hash` — catches byte-identical payloads
2. **sourceUrl uniqueness** (NEW): `signals` UNIQUE on (workspaceId, sourceUrl) WHERE sourceUrl IS NOT NULL — catches same article from different fetches
3. **n8n date filtering**: n8n only sends items newer than source config's `lastFetchedAt` — reduces payload to webhook

### Source Error Tracking

When n8n fetch fails:
1. n8n includes error info in webhook payload: `{ error: true, sourceConfigId, errorMessage }`
2. Webhook handler updates source config: `lastErrorAt`, `lastErrorMessage`
3. After 3 consecutive errors (tracked in metadata counter), auto-disable source
4. UI shows warning icon on profile card with error message
5. User can manually re-enable + retry

---

## UI Design

### /competitors Page

**Route:** `src/app/(app)/competitors/page.tsx` (replace placeholder)

**Layout:**
- Top bar: importance filter chips (All, High, Medium, Low) + "Add Competitor" button
- Card grid: `grid-template-columns: repeat(auto-fill, minmax(320px, 1fr))`
- Each card shows: name, website, description, importance badge, platform status badges (green=active, amber=Apify needed, red=error), signal count, idea count, active/total sources, last activity timestamp
- Click card → navigate to `/competitors/{id}`
- Empty state: "Track what competitors are publishing. Add your first competitor."

### /leaders Page

**Route:** `src/app/(app)/leaders/page.tsx` (replace placeholder)

**Layout:** Same as /competitors but:
- Person cards with avatar initials
- Shows title + company below name
- Type badge shows "Thought Leader" or "Content Creator"

### Profile Detail Page

**Routes:** `src/app/(app)/competitors/[id]/page.tsx` and `src/app/(app)/leaders/[id]/page.tsx`
Both render same `ProfileDetailPage` component.

**Layout:**
- Header: name, type badge, importance badge, website link, edit button, refresh button
- Two-column: left panel (280px) + right content area

**Left panel:**
- Platform links list: platform icon, URL, status badge (green/amber/red), signal count per platform, toggle enabled/disabled
- "Add platform link" button
- Notes section (editable textarea)

**Right panel tabs:**
- **Their Content**: signals from this profile, chronological. Each row: classification tag (colored), title, excerpt, timestamp, ICP fit score, hot score, "Generate Draft" button
- **Your Ideas**: ideas generated from this profile's signals, ranked by composite score. Same as Idea Wall cards but filtered to this profile.
- Platform sub-filters: Blog, YouTube, News, All

**Empty states:**
- No signals: "Sources configured. Signals will appear after the next sync."
- No ideas: "No ideas generated from [name]'s content yet."
- No platform links: "Add platform links to start tracking [name]'s content."

### Add Profile Dialog

**Component:** `src/components/profiles/add-profile-dialog.tsx`

**Fields:**
- Name (text, required)
- Website URL (text, required)
- Type (radio: Competitor / Thought Leader / Content Creator — pre-selected based on which page opened from)
- Importance (radio: High / Medium / Low — default Medium)
- Platform URLs (optional, expandable):
  - LinkedIn URL
  - Twitter/X URL
  - YouTube URL
  - Other (custom platform + URL)

**Button:** "Add & Discover Sources" → runs auto-discovery → shows results inline before closing

**Discovery results inline:**
- Blog RSS: "Found hubspot.com/blog/rss.xml" (green) or "No RSS found" (amber + manual input)
- Google News: "Monitoring 'HubSpot' in Google News" (always green)
- YouTube: "YouTube RSS active" (green) or "Could not extract channel ID" (amber)
- LinkedIn: "Apify required" (gray)

### Existing Page Enhancements

**Idea Wall (/ideas):**
- FilterBar: add "Competitor" and "Leader" filter chips
- IdeaCard: sourceLabel shows "HubSpot (Competitor)" when signal has profileId
- IdeaCard: LLM classification tag badge (e.g., "Product Launch" in orange)

**Signal Explorer (/signals):**
- Add profile dropdown filter: "All profiles" / specific profile names / "No profile"
- Add profile type chip filter alongside existing source filter

**Home Dashboard (/):**
- New stat card or row: "Competitor Activity (7d)" count
- Optional: "Most Active Profile" widget showing top 3 profiles by signal count

**SourceRail (Idea Wall sidebar):**
- "Link to profile" button on existing orphan sources
- Migration prompt on first /competitors visit: "You have N unlinked RSS sources. Create profiles?"

---

## n8n Workflow Changes

The existing Signal Harvester workflow (`qrnItYAUlVcgchZO`) reads `signal_source_configs` and fetches RSS.

**Changes needed:**
1. Read `profileId` from source configs (already JSONB-accessible or via new column)
2. Include `profileId` and `profileName` in webhook payload metadata
3. Include `source` field (the enum value) so CI knows youtube_rss vs rss vs google_news
4. For Google News items: follow redirect URL to resolve actual article URL before sending
5. For all items: compare item date against `lastFetchedAt` — only send newer items
6. Error reporting: if fetch fails, POST error to webhook with sourceConfigId + error message

**No new n8n workflow needed for Tier 1.** YouTube RSS, Google News RSS, and Reddit RSS are all standard XML feeds — the existing RSS Read node handles them. Only Tier 2 (Apify) needs a separate workflow.

---

## New Files

| File | Purpose |
|------|---------|
| `src/db/schema/profiles.ts` | profiles + profile_platform_links tables + new enums |
| `src/lib/signals/rss-discovery.ts` | RSS auto-discovery from website URL |
| `src/lib/signals/youtube-utils.ts` | YouTube channel ID extraction + RSS URL construction |
| `src/lib/signals/google-news.ts` | Google News RSS URL construction + redirect resolution |
| `src/server/routers/profiles.ts` | 14th router — profile CRUD + platform link management + auto-discovery |
| `src/app/(app)/competitors/page.tsx` | Competitors card grid (replace placeholder) |
| `src/app/(app)/competitors/[id]/page.tsx` | Competitor profile detail page |
| `src/app/(app)/leaders/page.tsx` | Thought Leaders card grid (replace placeholder) |
| `src/app/(app)/leaders/[id]/page.tsx` | Thought Leader profile detail page |
| `src/components/profiles/add-profile-dialog.tsx` | Add profile dialog with auto-discovery |
| `src/components/profiles/profile-card.tsx` | Reusable profile card component |
| `src/components/profiles/profile-detail.tsx` | Shared detail page component |

## Modified Files

| File | Changes |
|------|---------|
| `src/db/schema/enums.ts` | Add profileTypeEnum, profilePlatformEnum, fetchMethodEnum |
| `src/db/schema/signals.ts` | Add profileId + publishedAt to signals, profileId + fetchMethod + error columns to signal_source_configs |
| `src/db/schema/index.ts` | Export new schema |
| `src/server/routers/_app.ts` | Register profiles router (14th) |
| `src/server/routers/signals.ts` | addSource accepts profileId, listSources returns profile info |
| `src/server/inngest/functions/process-signal.ts` | Add classify-signal step, use classification for format/angle inference |
| `src/server/inngest/events.ts` | Add profileId to SignalIngested event data |
| `src/app/api/webhooks/n8n/route.ts` | Pass profileId to signals INSERT, sourceUrl-based dedup |
| `src/lib/webhooks/schemas.ts` | Add profileId to signalPayloadSchema |
| `src/app/(app)/ideas/page.tsx` | FilterBar: add Competitor/Leader chips |
| `src/components/ideas/filter-bar.tsx` | Add profile type filters |
| `src/components/ideas/idea-card.tsx` | Show profile attribution + classification tag |
| `src/app/(app)/signals/page.tsx` | Add profile filter dropdown |
| `src/app/(app)/page.tsx` | Add competitor activity stat |
| `src/components/ideas/source-rail.tsx` | "Link to profile" button on orphan sources |

---

## Review Findings & Resolutions

### Critical Fix 1: signalSourceEnum confusion
`signalSourceEnum` already contains "competitor" and "thought_leader" — these are NOT fetch methods, they're profile attributions. **Resolution:** Signals from profile sources keep their actual fetch method as `source` (e.g., "rss", "google_news"). Profile attribution happens ONLY via `signals.profileId` FK. The existing "competitor" and "thought_leader" enum values remain but are reserved for manual entries or future Apify signals. n8n always sends the actual fetch method (rss/youtube_rss/google_news/reddit_rss), never the profile type.

### Critical Fix 2: sourceUrl dedup implementation
UNIQUE constraint on (workspaceId, sourceUrl) can't use `drizzle-kit push`. **Resolution:** Apply via direct SQL migration. For existing signals with NULL sourceUrl, constraint is partial (WHERE sourceUrl IS NOT NULL). Dedup check happens in webhook handler BEFORE INSERT: `SELECT id FROM signals WHERE workspaceId = $1 AND sourceUrl = $2 LIMIT 1`. If exists, skip. This is an application-level check, not just a DB constraint — handles race conditions via the existing payload_hash as secondary guard.

### Critical Fix 3: n8n workflow specifics
**profileId sourcing:** n8n reads `signal_source_configs` which now has `profileId` column. JOIN to `profiles` table in the initial Supabase query to get profileName + profileType. Include these in webhook payload metadata: `{ profileId, profileName, profileType }`.

**Google News redirect resolution:** Done in n8n Code node, NOT in webhook handler. n8n follows HTTP redirect (HEAD request, 5s timeout) to get final URL before sending. If redirect fails, send original URL with `metadata.redirectFailed: true`.

**Error reporting:** New webhook payload variant: `{ error: true, sourceConfigId: "uuid", errorMessage: "HTTP 404", errorCode: "FETCH_FAILED" }`. Webhook handler checks for `error: true` flag → updates signal_source_configs.lastErrorAt + lastErrorMessage → increments `metadata.consecutiveErrors` counter → auto-disables at 3.

**Date filtering:** n8n Supabase query includes `lastFetchedAt` per config. Code node filters RSS items: `item.isoDate > config.lastFetchedAt`. Only new items sent to webhook.

### Architectural Resolution 1: Inngest classify-signal load
Classification step uses Inngest step memoization — retried signals replay cached classification. Concurrency stays at 5 (process-signal's existing limit). If Gemini 429s, Inngest retries the STEP (not the whole function). Max 3 retries per step. If all fail, signal proceeds WITHOUT classification (fallback to rule-based). No circuit breaker needed — Inngest's concurrency + retry handles it.

### Architectural Resolution 2: Edit profile / change website
Changing website → OLD platform links from RSS discovery get REPLACED (delete old auto-discovered links + source configs, run new discovery). User-added manual links (LinkedIn, Twitter) are NOT affected. The mutation:
1. Delete profile_platform_links WHERE fetchMethod IN ('rss', 'rss_discovery', 'google_news') AND profileId = X
2. CASCADE: signal_source_configs with matching profileId + fetchMethod get deleted
3. Run new discovery → create new links + configs
4. Signals from old configs retain profileId (SET NULL on config delete doesn't affect signals.profileId)

### Architectural Resolution 3: Archive vs Delete
Two distinct actions in UI:
- **Archive:** Sets `archivedAt` timestamp. Mutation disables all source configs (enabled=false). Profile disappears from main list, visible in "Archived" tab. Reversible.
- **Delete:** Hard delete with CASCADE on profile_platform_links. ON DELETE SET NULL on signal_source_configs.profileId and signals.profileId. Irreversible. Confirmation dialog shows counts. Archived profiles CAN be deleted.

### Architectural Resolution 4: Platform sub-filter optimization
"Their Content" tab doesn't need 4-table JOIN. Solution: store `fetchMethod` on signals via webhook metadata (n8n includes it). Filter by `signals.metadata.fetchMethod` (JSONB) or add `fetchMethod` column to signals table. Simpler: use source enum directly — "rss" = blog, "youtube_rss" = YouTube, "google_news" = News. Map at display time.

### Architectural Resolution 5: Auto-discovery timeout
Mutation-level timeout: 15 seconds total. Each discovery step runs in parallel (Promise.allSettled), not sequential. Per-step timeout: RSS=8s, YouTube=8s, Google News=instant. If any step times out, it reports failure for that platform link only — other discovered sources still save. UI shows per-link results inline.

### Architectural Resolution 6: Classification override semantics
When classification exists: `suggestedFormats` REPLACES rule-based formats entirely. When classification is null (Gemini failed): rule-based `inferFormats()` runs as fallback. No merge — one path or the other. `contentAngle` from classification becomes `ideas.angle` if present, otherwise `inferAngle()` result used.

### Style Fix: importance as pgEnum
Changed to `profileImportanceEnum` pgEnum with values ['high', 'medium', 'low']. Added to enums section.

---

## Constraints

- NEVER use drizzle-kit push (shared Supabase DB). Schema changes via direct SQL.
- Inngest stays at 6 functions — classification is a step inside process-signal, not a new function.
- Every push to main = production deploy. Test locally first.
- No Apify integration in this spec. Platform links with fetchMethod='apify' show "Apify needed" in UI.
- Google News context terms default to brand brief ICP keywords if available. Fallback: just the profile name.
- LLM classification failure is not a hard failure — graceful degradation to rule-based inference.
- signalSourceEnum "competitor" and "thought_leader" values NOT used for profile-sourced RSS signals. Source field = fetch method, always.
- Auto-discovery runs in parallel with 15s total timeout. Per-step failures don't block other discoveries.
- Webhook profileId comes from payload metadata (set by n8n), NOT looked up in handler.

---

## Cost Estimate

| Item | Cost | Frequency |
|------|------|-----------|
| RSS/YouTube/Reddit/News feeds | Free | Every 30 min |
| Gemini embedding per signal | ~$0.001 | Per signal (existing) |
| Gemini Flash classification per signal | ~$0.002 | Per signal (new) |
| Gemini Flash profile enrichment | ~$0.005 | Per profile creation (one-time) |
| **Total at 200 signals/day** | **~$18/month** | Ongoing |

---

## Testing Plan

### E2E Flow:
1. Add competitor: "HubSpot" + hubspot.com → verify RSS discovered, Google News created, profile card appears
2. Manual sync → signals arrive → profile card shows signal count
3. View profile detail → "Their Content" tab shows signals with classification tags
4. "Your Ideas" tab shows ideas with ICP scores
5. Click "Generate Draft" on an idea → draft generated with profile attribution
6. View Idea Wall → "Competitor" filter shows HubSpot ideas

### Edge Cases:
1. Website with no RSS → warning shown, Google News still works
2. YouTube @handle format → channel ID extracted via HTML parsing
3. Generic company name → Google News includes context terms
4. Google News redirect URLs → resolved to actual article URLs
5. Source goes down (404) → error tracked, auto-disabled after 3 failures
6. Delete profile → signals preserved, attribution cleared (SET NULL)
7. Duplicate profile name → unique constraint prevents
8. LLM classification fails → signal still processed with rule-based inference

### Build Verification:
- `pnpm build` passes
- New tables exist in Supabase (verified via MCP)
- Profiles router registered (14th)
- process-signal function still at position 5 of 6 in Inngest
- All new pages render on localhost
- Empty states render for fresh workspace
