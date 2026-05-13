# Content Intelligence Agent — Changelog

> Format: `[DATE] [PHASE.TASK] — What changed (files) — Why — Impact`

---

## 2026-05-13 (Session 12 — Module 2A: Signal Intelligence — Profiles + Multi-Platform Sources)

> 13 commits, +4,782 lines, 10 new files, 16 modified files. 33 tables. 14 routers. 80 procedures.

### Schema

- **[SCHEMA] profiles + profile_platform_links tables** — Competitor company and thought leader tracking. Per-workspace, per-brand. 4 new pgEnums: profileTypeEnum (competitor/thought_leader/partner/influencer), profileImportanceEnum (high/medium/low), profilePlatformEnum (12 platforms), fetchMethodEnum (rss/youtube_rss/google_news/apify_scrape/manual).
  - Files: `src/db/schema/profiles.ts` (NEW), `src/db/schema/index.ts`
  - Migration: Applied via Supabase MCP. 33 CI tables total (was 31).

### Utilities

- **[UTILITY] RSS auto-discovery** — Given any website URL, discovers its RSS/Atom feed URL by checking `<link>` tags, common paths (/rss, /feed, /atom.xml), and CMS-specific paths (WordPress, Ghost, Substack, Medium, Beehiiv).
  - Files: `src/lib/signals/rss-discovery.ts` (NEW)

- **[UTILITY] YouTube channel utils** — Resolves YouTube channel handles (@handle) to channel IDs via YouTube Data API, constructs RSS feed URLs from channel IDs. Handles both `@handle` and raw `channel/UCxxxx` formats.
  - Files: `src/lib/signals/youtube-utils.ts` (NEW)
  - Env: `YOUTUBE_API_KEY` required for handle resolution

- **[UTILITY] Google News RSS builder** — Constructs Google News RSS URLs for topic keyword or company name searches. Used for competitor news monitoring without paid API.
  - Files: `src/lib/signals/google-news.ts` (NEW)

### API

- **[API] Profiles router (14th, 10 procedures)** — Full CRUD for competitor and thought leader profiles. Procedures: create, get, list, update, delete, addLink, removeLink, listLinks, listByType, search. All workspace-scoped. Registered in _app.ts.
  - Files: `src/server/routers/profiles.ts` (NEW), `src/server/routers/_app.ts`

- **[API] Webhook enhanced** — n8n webhook now accepts `profileId` (optional UUID FK to profiles) and uses `sourceUrl` for per-URL deduplication in addition to `n8nExecutionId`. Enables profile-linked signal ingestion.
  - Files: `src/app/api/webhooks/n8n/route.ts`

- **[API] Signals router enhanced** — listSources now returns profile name + type when source is linked to a profile. SourceRail can show "Linked to: Gartner (competitor)" label.
  - Files: `src/server/routers/signals.ts`

### Inngest

- **[INNGEST] process-signal LLM classification step** — After embedding + ranking, Gemini Flash classifies each signal: topic tags (up to 5), signal type (insight/news/announcement/research/opinion), content quality score (0-10), and suggested hook. Glass-box: classification logged to ai_calls. Gracefully degrades if LLM call fails (idea still created without classification).
  - Files: `src/server/inngest/functions/process-signal.ts`

### UI

- **[UI] /competitors page** — Lists competitor profiles in card grid. AddProfileDialog with type=competitor preset. Empty state with prompt to add first competitor. Profile count badge. Links to detail pages.
  - Files: `src/app/(app)/competitors/page.tsx` (NEW — replaced placeholder)

- **[UI] /leaders page** — Lists thought leader profiles in card grid. AddProfileDialog with type=thought_leader preset. Same card grid pattern as competitors.
  - Files: `src/app/(app)/leaders/page.tsx` (NEW — replaced placeholder)

- **[UI] Profile detail pages** — /competitors/[id] and /leaders/[id] using shared ProfileDetailPage component. Shows profile metadata, platform links (with fetch method badges), linked signal sources, recent signals from this profile. Edit/delete actions.
  - Files: `src/app/(app)/competitors/[id]/page.tsx` (NEW), `src/app/(app)/leaders/[id]/page.tsx` (NEW)

- **[COMPONENT] ProfileCard** — Reusable card component for competitor/leader grid. Shows avatar initials, name, type badge, importance indicator, platform link count, description excerpt, and "View" link.
  - Files: `src/components/profiles/profile-card.tsx` (NEW)

- **[COMPONENT] ProfileDetailPage** — Shared detail view component used by both /competitors/[id] and /leaders/[id]. Avoids code duplication between the two routes.
  - Files: `src/components/profiles/profile-detail-page.tsx` (NEW)

- **[COMPONENT] AddProfileDialog** — Modal for adding competitor or thought leader profiles. Fields: name, type (pre-selectable), importance, description, website URL. Platform links added after creation via detail page.
  - Files: `src/components/profiles/add-profile-dialog.tsx` (NEW)

### Enhancements

- **[ENHANCEMENT] Idea Wall profile filter** — FilterBar now includes a profile dropdown. Selecting a profile filters ideas to only those sourced from that profile's signal sources.
  - Files: `src/components/ideas/filter-bar.tsx`, `src/app/(app)/ideas/page.tsx`

- **[ENHANCEMENT] Signal Explorer profile filter** — Signal Explorer table now has a profile filter chip row in addition to the existing source type filter.
  - Files: `src/app/(app)/signals/page.tsx`

- **[ENHANCEMENT] Home dashboard profiles stat** — Stats row now shows total profiles count (competitors + leaders). Quick actions include "Add Competitor" and "Add Leader" shortcuts.
  - Files: `src/app/(app)/page.tsx`

- **[ENHANCEMENT] SourceRail link-to-profile** — Source rows in SourceRail show a "→ ProfileName" link when the source is linked to a profile. Clicking navigates to /competitors/[id] or /leaders/[id].
  - Files: `src/components/ideas/source-rail.tsx`

### n8n

- **[N8N] Signal Harvester workflow updated** — Payload now includes `profileId` (nullable, from Supabase source config join), `publishedAt` (original article pub date), `fetchMethod` (rss/youtube_rss/etc). Date filtering: only articles published in last 7 days are forwarded.
  - Workflow: `qrnItYAUlVcgchZO` on full-funnel.app.n8n.cloud (updated in place)

---

## 2026-05-13 (Session 11 — Module 1: Complete Core Loop)

- **[SCHEMA] workspace_integrations + draft_exports tables** — Per-workspace integration config with encrypted secrets (AES-256-GCM). Export tracking with idempotency keys, ON DELETE SET NULL for audit trail.
  - Files: `src/db/schema/integrations.ts` (NEW), `src/db/schema/index.ts`
  - Migration: Supabase MCP `apply_migration`. 31 CI tables now (was 29).

- **[INNGEST] export-draft function replaces verify-post** — Handles Drive + Slack exports via Inngest steps. Workspace-scoped concurrency (S3), defensive workspace checks (S4), idempotency guard (D1), NonRetriableError for deleted drafts (D2), onFailure handler (D6).
  - Files: `src/server/inngest/functions/export-draft.ts` (NEW), `src/server/inngest/functions/index.ts`, `src/server/inngest/events.ts`

- **[UTILITIES] Google Drive + Slack integration** — `createGoogleDoc` (Google Docs API with formatting), `sendSlackNotification` (Block Kit messages, 2900 char truncation), `testDriveConnection`, `testSlackConnection`, SSRF validation for webhook URLs.
  - Files: `src/lib/integrations/google-drive.ts` (NEW), `src/lib/integrations/slack.ts` (NEW)

- **[API] Integrations router (13th) + export mutations** — Config CRUD with encrypted secrets, test connection, export list. Draft mutations: exportToDrive, sendToSlack, getExportStatus, listDraftExports. Dashboard queries: countByStatus, countRecent, listRecent.
  - Files: `src/server/routers/integrations.ts` (NEW), `src/server/routers/drafts.ts`, `src/server/routers/ideas.ts`, `src/server/routers/signals.ts`, `src/server/routers/_app.ts`

- **[UI] Draft editor export buttons** — Export to Drive + Send to Slack replace LinkedIn publish button. Integration readiness check, export status polling, export history section.
  - Files: `src/app/(app)/drafts/[id]/page.tsx`

- **[UI] Settings > Integrations page** — Google Drive card (folder ID, test connection) + Slack card (webhook URL masked, test message). Replace placeholder.
  - Files: `src/app/(app)/settings/page.tsx`

- **[UI] Home dashboard** — Stats row (ideas, approved, exports, signals), pending approvals list with quick-approve, recent exports feed, quick actions (sync, view ideas/drafts). Skeleton loaders, empty states.
  - Files: `src/app/(app)/page.tsx`

- **[UI] Export badges on drafts list** — Small Drive/Slack icons on exported drafts.
  - Files: `src/app/(app)/drafts/page.tsx`

- **[PACKAGE] googleapis 171.4.0 added** — Google Drive + Google Docs API.

---

## 2026-05-13 (Session 10 — Strategic Planning)

- **[PIVOT] Product direction changed** — Eliminate native social publishing/scheduling. Focus on "first 100 miles": research, create, approve. Output via Google Drive + Slack. CI paused for Meeting Intelligence.
  - Files: `memory/project_pivot_2026_05_12.md`

- **[PLAN] 5-module roadmap created** — M1: Core Loop (Drive+Slack), M2: Signal Intelligence (multi-platform), M3: Content Excellence + Positioning Guide, M4: SEO/AEO, M5: Polish. Depth-first execution.
  - Files: `~/.claude/plans/unified-sniffing-island.md`

- **[ANALYSIS] Existing n8n workflows reverse-engineered** — Social Listening V2 (8 Sheets tabs, 5 audience segments, AI analysis → Drive → Slack) + Blog Generator (topics → Gemini Pro → Google Docs). These are what CI productizes 10x better.
  - Files: `memory/reference_existing_workflows.md`

- **[ANALYSIS] Luke's Positioning Agent integrated** — Social listening → market analysis → positioning statement → positioning guide (11 sections). Brand Brief must evolve into this. The guide feeds ALL content creation.
  - Files: `memory/reference_positioning_agent.md`, `knowledge_base/FullFunnel - Positioning Guide.docx`, `knowledge_base/FullFunnel - Positioning Agent.pdf`

- **[ANALYSIS] Signal strategy expanded** — Not RSS-only. Multi-platform: RSS + YouTube RSS + Reddit RSS + Google News RSS (free), plus Apify for LinkedIn/Twitter/Instagram (paid). Profile-based tracking: user adds person/company + platform URLs, system determines fetch method.

---

## 2026-05-12 (Session 10 — Sync + Filter + Auto-Generate + Prompt Studio + Signal Explorer)

### Prompt Studio

- **[FEATURE] Prompts tRPC router** — list, get, update procedures. Workspace-scoped. Seeds default "Draft Generation" prompt on first access. Version increments on save.
  - Files: `src/server/routers/prompts.ts` (NEW), `src/server/routers/_app.ts`

- **[FEATURE] Prompt Studio page** — Full editor: system prompt textarea + user prompt template textarea (monospace). Variable reference panel (12 variables with descriptions + required flags). Interpolated preview with sample values. Version tracking. Tab selector for future multi-prompt.
  - Files: `src/app/(app)/prompts/page.tsx` (rewritten from placeholder)

### Signal Explorer

- **[FEATURE] listSignals query** — Paginated signal list with source enum filter, processed boolean filter, total count. Returns truncated body (200 chars). Workspace-scoped.
  - Files: `src/server/routers/signals.ts`

- **[FEATURE] Signal Explorer page** — Table: source badge, title, body preview, relative date, processed/pending status, source link. Click row → expand full content + metadata JSON. Source filter chips, processed dropdown, pagination (50/page).
  - Files: `src/app/(app)/signals/page.tsx` (NEW)

- **[NAV] Signals added to sidebar** — Under "Learn" group, before Insights.
  - Files: `src/components/shell/nav-config.ts`

### Generation UX

- **[FEATURE] Progressive generation loader** — Elapsed timer (seconds), progressive status messages at 0-15s/15-30s/30-60s/60-90s, steps turn green, "Back to Idea Wall" + "Retry now" buttons at 30s.
  - Files: `src/app/(app)/drafts/[id]/page.tsx`

---

### Manual Sync Button

- **[FEATURE] triggerSync mutation** — Calls n8n Cloud REST API to execute Signal Harvester workflow on demand. `protectedProcedure` ensures auth. 10s timeout.
  - Files: `src/server/routers/signals.ts`
  - Env: `N8N_API_KEY`, `N8N_INSTANCE_URL`

- **[FEATURE] Sync button in SourceRail** — Refresh icon + "Sync" label in header row. 2-minute client-side cooldown. Toast on success/error.
  - Files: `src/components/ideas/source-rail.tsx`

### Date Range Filter

- **[FEATURE] Date filtering on ideas.list** — `dateFrom`/`dateTo` optional ISO date inputs. Uses `COALESCE(publishedAt, createdAt)` so manual ideas (null publishedAt) are included. `dateTo` uses `::date + interval '1 day'` for inclusive end.
  - Files: `src/server/routers/ideas.ts`

- **[FEATURE] Date picker in FilterBar** — Two native `<input type="date">` elements with "Clear" button. `colorScheme: "dark light"` for theme compat.
  - Files: `src/components/ideas/filter-bar.tsx`, `src/app/(app)/ideas/page.tsx`

### Brand Brief Auto-Generate

- **[SCHEMA] brands.websiteUrl** — New nullable text column on brands table. Applied via direct SQL (drizzle-kit push unsafe on shared Supabase DB).
  - Files: `src/db/schema/brands.ts`

- **[FEATURE] brief.autoGenerate mutation** — Synchronous (no Inngest). Fetches website HTML, strips tags (script/style/nav/footer removed), calls Gemini Flash via callLLM (temperature 0.4), parses JSON response. Returns pre-filled fields for user review. Glass-box: model + tokens + costCents in response.
  - Files: `src/server/routers/brief.ts`

- **[FEATURE] brand.update extended** — Accepts `websiteUrl` (url | null) in data schema.
  - Files: `src/server/routers/brand.ts`

- **[FEATURE] Auto-generate UI on brand page** — Website URL input (pre-populated from brand data) + "Auto-generate brief" button. On success: pre-fills edit form, enters edit mode, glass-box toast. Loading state: "Analyzing...".
  - Files: `src/app/(app)/brand/page.tsx`

---

## 2026-05-12 (Session 9B — Config Consolidation + Quick Wins)

### Checkpoint A: Quick Wins

- **[FEATURE] Source link on IdeaCard** — Source label now clickable when sourceUrl present. Opens original post in new tab with external link icon (↗).
  - Files: `src/components/ideas/idea-card.tsx`

- **[FIX] Dedup score populated for near-duplicates** — process-signal now sets dedupScore (0.70-0.85 range) and dedupPriorId on created ideas. Previously these schema fields were never populated. IdeaCard dedup warning badge now has data to display. Dedup skip at >0.85 unchanged.
  - Files: `src/server/inngest/functions/process-signal.ts`

### Checkpoint B: Config Consolidation

- **[REFACTOR] Platform config single source of truth** — 13 scattered platform constants across 5+ files consolidated into 3 config files. Zero behavior changes.
  - New: `src/lib/config/platforms.ts` (13 platforms, charLimit, formats, guidelines, tier, oauthReady)
  - New: `src/lib/config/display.ts` (colors, icons per platform)
  - New: `src/lib/config/index.ts` (8 helper functions)
  - Updated: `drafts/[id]/page.tsx`, `drafts/page.tsx`, `generate-popover.tsx`, `generate-draft.ts`, `connectors/page.tsx`
  - Eliminated: CHAR_LIMITS, CHANNEL_LABELS (2 copies), CHANNELS, CHANNEL_FORMATS, FORMAT_GUIDELINES, PLATFORM_DISPLAY (2 copies), OAUTH_READY

### Late Session 9 — UX Polish + Data Quality

- **[FIX] Instruction area visibility** — Dashed border, chat icon, "AI Instructions" label. Much more discoverable than plain gray background.
- **[FIX] Version history refresh** — listSnapshots invalidated on regenerate success. Snapshots appear immediately.
- **[FEATURE] Version preview** — Expandable snapshot entries with 300-char content preview + "Restore this version" button.
- **[FIX] Hot score computation** — Base lowered from 50 to 30. Freshness-based scoring (recent = hotter). RSS no longer stuck at 50.
- **[FIX] computeFreshness** — Added `pubDate` and `isoDate` to metadata field check chain. Was missing the field n8n actually sends.
- **[SCHEMA] ideas.publishedAt** — Original pub date from signal metadata stored on idea. Backfilled existing ideas from signals.metadata.pubDate.
- **[UI] IdeaCard dates** — Shows actual pub date (e.g., "Dec 17") instead of static "1d". Hover tooltip shows both published + synced dates.
- **[FIX] Default sort** — Changed from hotScore (all 50) to composite score (ICP fit + hot + freshness). Added "Relevance" and "Newest" sort options.

### Checkpoint C: Brand Brief Page Wiring

- **[FEATURE] Brand Brief fully wired** — Page was static mockup with hardcoded data. Now queries DB via brief.get/create/list/diff. Edit button opens inline form (4 textareas + changelog). Save creates new version (append-only). Version History tab lists all versions. Diff tab shows field-by-field comparison. Versioning sidebar card dynamic.
  - Files: `src/app/(app)/brand/page.tsx` (rewritten, +419 lines)

### Checkpoint D: Regenerate with Instructions + Version History

- **[SCHEMA] draft_snapshots table** — Stores previous draft versions on each regeneration. Fields: draftId, version, title, content, modelId, instructions, createdAt. CASCADE delete.
  - Files: `src/db/schema/content.ts`, `src/db/schema/index.ts`

- **[FEATURE] Regenerate with custom instructions** — Users can type instructions ("make shorter", "add statistics") before regenerating. LLM receives current draft + instructions in REFINE mode. Empty instructions = fresh generation (unchanged behavior).
  - Files: `src/server/routers/drafts.ts`, `src/server/inngest/events.ts`, `src/server/inngest/functions/generate-draft.ts`

- **[FEATURE] Draft version history** — Each regeneration snapshots current content before clearing. Side panel shows all versions with model, instructions, relative time. Restore button copies old version back (with double-snapshot to preserve current).
  - Files: `src/app/(app)/drafts/[id]/page.tsx` (+176 lines), `src/server/routers/drafts.ts` (listSnapshots + restoreSnapshot)

- **[UI] Instruction input** — Collapsible text area above action bar. "Add instructions for regeneration..." placeholder. Escape to collapse. Cleared on successful regeneration.
  - Files: `src/app/(app)/drafts/[id]/page.tsx`

### Earlier Session 9 (Generate Popover + Bug Fixes)

- **[FEATURE] Generate Popover** — Channel + format + model selection when clicking Generate on Idea Wall. 6 channels, format per channel, model selector. Format stored on draft and passed to LLM prompt.
- **[FIX] Regenerate timeout** — Used updatedAt instead of createdAt for stuck detection
- **[FIX] Gemini 2.5 Flash** — Moved from Thinking to Standard category
- **[FIX] Char limits verified** — All 13 platforms verified against official API docs
- **[FIX] Format guidelines injected** — Appended to prompt even when old DB template lacks placeholders
- **[FEATURE] Drafts list enhanced** — Shows channel label, format tag, model ID per card

---

## 2026-05-12 (Session 9 — UX Bug Fixes)

### Fix: Model Display Bug
- **[FIX] Added `model_id` column to drafts table** — Nullable text column. Stores actual model used by LLM router (not requested model, which may differ due to fallback). Migration applied via Supabase.
  - Files: `src/db/schema/content.ts` (+1 line), `drizzle/0002_silly_magma.sql` (new)
  - Impact: Glass-box principle — draft now records exactly which model generated it

- **[FIX] generate-draft stores actual model** — Clean destructuring of `modelId` from event data (removed type assertion hack). Saves `generation.model` (from LLMResult) to draft row after LLM call.
  - Files: `src/server/inngest/functions/generate-draft.ts` (3 changes)
  - Impact: New drafts will have `model_id` populated; old drafts remain null

- **[FIX] Draft editor reads model from draft data** — Loader and side panel now show `draft.modelId` with fallback to `regenModelId` (localStorage). During generation, shows selected model; after completion, shows actual model.
  - Files: `src/app/(app)/drafts/[id]/page.tsx` (4 changes)

- **[FIX] Regenerate clears modelId** — `drafts.regenerate` mutation now sets `modelId: null` to prevent stale model from persisting during new generation.
  - Files: `src/server/routers/drafts.ts` (1 change)

### Fix: Idea Wall Draft Status Indicators
- **[FEATURE] ideas.list enriches with draft status** — After fetching ideas, second query gets latest draft per idea via `IN` clause. Returns `latestDraft: { draftId, draftStatus } | null` per item.
  - Files: `src/server/routers/ideas.ts` (+30 lines)
  - Impact: Frontend can show draft state without additional queries

- **[FEATURE] IdeaCard shows status badge + View Draft** — Status badge (color-coded: Draft/Approved/Live/Failed) between meta row and hook. "Generate" button changes to "View Draft" when draft exists.
  - Files: `src/components/ideas/idea-card.tsx` (+55 lines)

- **[FIX] ideas.list cache invalidated after generate** — `generateMut.onSuccess` now calls `utils.ideas.list.invalidate()`. Prevents stale cache when navigating back from draft editor.
  - Files: `src/app/(app)/ideas/page.tsx` (+1 line)

### UI Polish
- **[UI] SourceRail Edit/Remove icons** — Replaced text links with pencil and trash SVG icons. Cleaner visual density.
  - Files: `src/components/ideas/source-rail.tsx` (1 change)

- **[FIX] localStorage model validation** — Ideas page and draft editor now validate saved model ID against known MODELS list. Removes stale/invalid IDs.
  - Files: `src/app/(app)/ideas/page.tsx`, `src/app/(app)/drafts/[id]/page.tsx`

---

## 2026-05-12 (Session 8)

### Checkpoint 1: Publishing Foundation

- **[INFRA] Error taxonomy extended** — Added `ACCOUNT_RESTRICTED`, `ACCOUNT_WARMUP_REQUIRED` to ErrorCodes. Added `mapPlatformError()` with per-platform parsers (LinkedIn `serviceErrorCode`, X error arrays, Meta `error.code`/`error_subcode`, Reddit `json.errors` tuples, TikTok error codes).
  - Files: `src/lib/errors/app-error.ts` (+156 lines)
  - Impact: Every future adapter calls `mapPlatformError()` instead of parsing raw responses

- **[INFRA] ConnectorAdapter interface + BaseAdapter** — 8-method interface with content validation (char/byte/grapheme limits), media validation, platform error mapping. Token passed IN by Inngest function (adapter never touches TokenManager directly).
  - Files: `src/lib/connectors/adapter.ts` (new, 149 lines)
  - Impact: All 15 platform adapters implement this interface

- **[INFRA] Adapter registry** — `getAdapter(platform)` lookup, `registerAdapter()` for platform self-registration.
  - Files: `src/lib/connectors/registry.ts` (new, 27 lines)

- **[INFRA] 3 new Inngest events** — `PostPublish` (single platform), `PostVerify` (ghost detection), `TokenRefreshDue` (batch refresh)
  - Files: `src/server/inngest/events.ts` (+35 lines)

- **[FEATURE] publish-post Inngest function** — 10-step pipeline: fetch-post → fetch-draft → fetch-connector → validate-content → publish → record-result → audit → ghost-check-delay (10min) → schedule-verify. Concurrency: 5 per workspace.
  - Files: `src/server/inngest/functions/publish-post.ts` (new, 155 lines)

- **[FEATURE] verify-post Inngest function** — Ghost detection at +10 min. Calls `adapter.verify()`, marks post as failed with `PUBLISH_GHOST` if invisible.
  - Files: `src/server/inngest/functions/verify-post.ts` (new, 75 lines)

- **[FEATURE] 3 new tRPC mutations** — `publish` (single), `publishMulti` (fan-out), `getPublishStatus` (polling). Idempotency keys: `idem_{draftId}_v{version}_{channel}_{yyyymmdd}`. Dedup check before insert.
  - Files: `src/server/routers/drafts.ts` (+206 lines)
  - Commit: `ee88a9a`

### Add Source UI

- **[FEATURE] Add Source dialog** — Modal with 6 source types (RSS active, others "coming soon"). Dynamic input fields per type: URL label, placeholder, hint all adapt. URL validation. Toast on success.
  - Files: `src/components/ideas/add-source-dialog.tsx` (new, 194 lines)

- **[FEATURE] SourceRail actions** — "+" button opens dialog. Each source row has toggle (live/paused) and delete (with confirm). All wired to `signals.toggleSource` and `signals.deleteSource` mutations.
  - Files: `src/components/ideas/source-rail.tsx` (rewritten, 148 lines)
  - Commit: `04ea302`
  - E2E verified: added "Sam Altman Blog" RSS → appeared in SourceRail + confirmed in Supabase

### Vertical Slice: Idea → Draft → Publish

- **[FEATURE] 4 new draft tRPC mutations** — `generate` (trigger Inngest), `create` (manual), `update` (content edit), `approve` (status transition to approved).
  - Files: `src/server/routers/drafts.ts` (+~180 lines)
  - Impact: Full draft lifecycle CRUD, feeds the editor page

- **[FEATURE] DraftGenerate Inngest event** — Typed event triggering the generate-draft function with brandId, ideaId, format, workspaceId.
  - Files: `src/server/inngest/events.ts` (+10 lines)

- **[FEATURE] LLM generation utility (generate.ts)** — Gemini 2.0 Flash wrapper with glass-box ai_calls logging (model, prompt hash, cost, latency, token count, status). Structured JSON output via Gemini's response schema.
  - Files: `src/lib/ai/generate.ts` (new, ~120 lines)
  - Impact: Reusable for all future LLM generation tasks (grading, suggestions, etc.)

- **[FEATURE] Prompt seed utility (seed.ts)** — Reads prompts from `prompts` DB table by task name (e.g., "draft_generation"). Falls back to hardcoded default if no DB row. Enables operator-editable prompts without deploys.
  - Files: `src/lib/ai/seed.ts` (new, ~60 lines)
  - Impact: Glass-box AI rule — prompts must be visible and editable

- **[FEATURE] generate-draft Inngest function (5 steps)** — fetch-idea-context → fetch-brand-brief → build-prompt → call-llm → save-draft. Saves draft as `draft` status, logs to ai_calls.
  - Files: `src/server/inngest/functions/generate-draft.ts` (new, ~140 lines)
  - Impact: 6 Inngest functions total (was 5 after CP1)

- **[FEATURE] Generate button wired on Idea Wall** — Calls `ideas.generate` tRPC mutation → receives draftId → redirects to `/drafts/{id}`.
  - Files: `src/app/(app)/ideas/page.tsx` (modified, button logic added)

- **[FEATURE] Drafts list page (replaced stub)** — Lists drafts with status filter tabs (all/draft/graded/approved/scheduled/live). Shows title, status badge, channel, created date, word count.
  - Files: `src/app/(app)/drafts/page.tsx` (rewritten, ~180 lines)

- **[FEATURE] Draft editor page (/drafts/[id])** — Full editor with: auto-poll while generating (status=draft → content populated), textarea edit, approve button (draft→approved), publish button (wired to LinkedIn connector), regenerate button, source idea link.
  - Files: `src/app/(app)/drafts/[id]/page.tsx` (new, ~320 lines)
  - Impact: First interactive content surface in the app

- **[FEATURE] LinkedIn adapter** — Full ConnectorAdapter implementation: `publish()` (2-phase: register post → publish via UGC Posts API), `verify()` (ghost detection via REST API), `delete()`, `refreshToken()`, `healthProbe()`. Handles LinkedIn-specific quirks: ID in `x-restli-id` header, `LinkedIn-Version: 202604` required, refresh token TTL does not reset.
  - Files: `src/lib/connectors/adapters/linkedin.ts` (new, ~210 lines)
  - Commits: `c6673d2`

- **[FEATURE] Token decrypt + inline refresh in publish-post** — publish-post Inngest function now decrypts token via token-manager, calls adapter.publish(), and if token is expired, refreshes inline before retry. Stores updated token back to DB.
  - Files: `src/server/inngest/functions/publish-post.ts` (modified, +token decrypt/refresh logic)

- **[FIX] Inngest concurrency key syntax** — `{{ event.data.workspaceId }}` template string syntax was invalid in Inngest v4 Node SDK. Replaced with simple numeric concurrency limits per function.
  - Files: All 6 Inngest functions in `src/server/inngest/functions/`
  - Impact: Functions now register cleanly in Inngest Cloud

- **Summary (Vertical Slice):**
  - Commits: 8 commits (`229ba7d` → `c6673d2`)
  - Lines added: ~2,500
  - New files: `adapter.ts`, `registry.ts`, `generate.ts`, `seed.ts`, `generate-draft.ts`, `linkedin.ts`, `add-source-dialog.tsx`, `drafts/[id]/page.tsx`
  - Modified files: `app-error.ts`, `events.ts`, `functions/index.ts`, `publish-post.ts`, `verify-post.ts`, `drafts.ts`, `source-rail.tsx`, `ideas/page.tsx`, `drafts/page.tsx`, `signals.ts`

### Multi-Model LLM Router

- **[FEATURE] LLM Router (llm-router.ts)** — Provider-agnostic generation wrapper supporting Google AI (Gemini), Anthropic (Claude), and OpenRouter (GPT-5.4 + others). Routes by modelId, injects API keys per provider, glass-box logs to ai_calls with provider name + cost + latency.
  - Files: `src/lib/ai/llm-router.ts` (new)
  - Impact: Single entry point for all generation tasks. generate-draft Inngest function updated to use this instead of the old generate.ts.

- **[FEATURE] Models config (models.ts)** — 5 models across 3 providers. Standard: Gemini 3.0 Flash, Claude Sonnet 4. Thinking: Claude Opus 4, GPT-5.4, Gemini 3.1 Pro. Each entry includes providerId, displayName, context window, cost-per-1k tokens, thinking flag.
  - Files: `src/lib/ai/models.ts` (new)

- **[FEATURE] Custom model picker (model-select.tsx)** — Dropdown with per-provider SVG logos (Anthropic, OpenAI, Google). Grouped into Standard Models and Thinking Models sections. `dropUp` prop for placing above action bar. Accessible, keyboard-navigable.
  - Files: `src/components/ui/model-select.tsx` (new)
  - Impact: Wired on Idea Wall (generate button) and Draft editor (regenerate button). Operator can choose model per generation action — satisfies glass-box AI rule.

- **[UPDATE] generate-draft Inngest function** — Now delegates to llm-router.ts instead of the earlier single-provider generate.ts. ModelId threaded from DraftGenerate event → Inngest step → llm-router.
  - Files: `src/server/inngest/functions/generate-draft.ts` (modified)

### UI Polish

- **[POLISH] Lora font for draft body** — Draft editor textarea now uses Lora (brand guideline font for longform content). Applied via Tailwind font-serif utility mapped to Lora in globals.
  - Files: `src/app/(app)/drafts/[id]/page.tsx`

- **[POLISH] Channel label mapping** — Raw platform keys (`linkedin`) now display as readable labels (`LinkedIn`) throughout editor and drafts list. Single mapping object, reused across components.
  - Files: `src/app/(app)/drafts/[id]/page.tsx`, `src/app/(app)/drafts/page.tsx`

- **[POLISH] Animated generation loader** — Replaces plain spinner with 5-step animated progress list ("Fetching idea context...", "Loading brand brief...", "Building prompt...", "Calling LLM...", "Saving draft..."). Steps animate in sequence as polling detects status.
  - Files: `src/app/(app)/drafts/[id]/page.tsx`

- **[POLISH] Stuck draft timeout handling** — If draft status remains `draft` (no content) for >90s, auto-poll stops and shows Retry (re-fires generation) + Delete buttons. Prevents infinite spinner on Inngest failures.
  - Files: `src/app/(app)/drafts/[id]/page.tsx`

- **[POLISH] Title textarea wraps** — Draft title input expands vertically instead of truncating long headlines. Prevents content loss on longer titles.
  - Files: `src/app/(app)/drafts/[id]/page.tsx`

- **[FEATURE] ConfirmDialog component** — Styled modal confirmation dialog (title + message + Cancel/Confirm buttons) to replace native browser `confirm()`. Used for delete actions in SourceRail and draft editor.
  - Files: `src/components/ui/confirm-dialog.tsx` (new)
  - Impact: Consistent UX, works in all browsers, respects app dark theme.

- **[FEATURE] Copy/Download/Share actions on editor** — Action bar additions: Copy copies draft body to clipboard, Download triggers .txt download, Share uses Web Share API with fallback to copy.
  - Files: `src/app/(app)/drafts/[id]/page.tsx`

- **Session 8 Final Summary:**
  - Total commits: ~20
  - Total lines added: ~4,000+
  - Inngest functions: 6 (was 3 at session start)
  - AI providers: 3 (Google AI, Anthropic, OpenRouter)
  - AI models available: 5
  - New files this session: `adapter.ts`, `registry.ts`, `generate.ts`, `seed.ts`, `generate-draft.ts`, `linkedin.ts`, `add-source-dialog.tsx`, `drafts/[id]/page.tsx`, `llm-router.ts`, `models.ts`, `model-select.tsx`, `confirm-dialog.tsx`

---

## 2026-05-11 (Session 7)

### SCOPE-FIX: Workspace UUID Retrofit

- **[SECURITY] Systemic workspace scoping bug fixed** — `scopedDb()` now async, resolves Clerk orgId→UUID — 8 routers (24 procedures) were silently returning empty results
  - Files: `src/lib/security/scoped-db.ts`, `src/server/context.ts`, `src/server/middleware.ts`
  - Impact: brand, brief, corpus, rules, connectors, drafts, schedule, audit routers ALL now return correct data
  - Commit: `d6c88cc`

- **[CLEANUP] Duplicate getWorkspaceUuid removed** — ideas.ts and signals.ts had local copies, now use ctx.scoped
  - Files: `src/server/routers/ideas.ts`, `src/server/routers/signals.ts`
  - Impact: DRY, single source of truth for workspace resolution

- **[SECURITY] corpus.delete cross-tenant vulnerability fixed** — was deleting by ID only, now verifies workspace ownership via brand join
  - Files: `src/server/routers/corpus.ts`
  - Impact: Prevents cross-workspace corpus item deletion

- **[CLEANUP] Dead code removed** — standalone `workspaceScope()` and `workspaceScopeAnd()` exports removed from scoped-db.ts, manual ws lookup removed from corpus.ts
  - Impact: Less dead code, cleaner API surface

### Checkpoint 0: Production Deployment

- **[DEPLOY] First Vercel production deploy** — App live at content-intelligence-eight.vercel.app
  - 13 env vars pushed (quotes stripped from .env.local values — gotcha!)
  - NEXT_PUBLIC_APP_URL set to production domain
  - First deploy failed: DATABASE_URL had literal quotes. Second deploy succeeded.
  - Build: 23 routes, 42s, zero errors

- **[INFRA] Inngest Cloud connected** — Vercel Integration auto-injects INNGEST_SIGNING_KEY + INNGEST_EVENT_KEY
  - Redeploy after integration → Inngest endpoint returns "Unauthorized" (correct = signing key enforced)
  - 3 functions should auto-register on next Inngest sync

- **[INFRA] n8n workflow configured for production** — Updated via MCP, activated
  - Webhook URL: https://content-intelligence-eight.vercel.app/api/webhooks/n8n
  - HMAC secret embedded in Code node
  - Workflow published (activeVersionId: 750e15ae)

- **[SELF-REVIEW] Deployment audit** — 1 false-positive bug, 0 real bugs, 1 note
  - tRPC localhost fallback: NOT a bug (VERCEL_URL auto-injected by Vercel)
  - INNGEST_DEV not on Vercel: confirmed clean
  - Clerk domain: Dev instance allows all origins, no action needed now

### Phase 5E: n8n Signal Harvester Workflow

- **[FEATURE] n8n workflow "CI - Signal Harvester" deployed** — Fetches RSS feeds, normalizes articles, HMAC-signs, POSTs to CI webhook
  - Workflow ID: `qrnItYAUlVcgchZO` on full-funnel.app.n8n.cloud
  - Schedule: Every 30 min, Mon-Fri 8am-6pm
  - Flow: Schedule → Supabase (get configs) → Loop → RSS Read → Normalize + HMAC → POST webhook
  - Auto-assigned existing Supabase credential

- **[DATA] Corpus backfill triggered** — All 13 corpus items across 3 brands now have Gemini embeddings
  - Verified: 3 new ai_calls logged, all status=success

- **[DATA] Signal source configs seeded** — 5 RSS feeds across 2 workspaces
  - FF workspace: SaaStr, HubSpot Marketing, First Round Review
  - FullFunnel workspace: SaaStr, HubSpot Marketing

---

## 2026-05-11 (Session 6)

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

- **4Aw.7** DB driver: neon-http → postgres-js
  - Files: `src/db/index.ts`, `package.json`
  - What: `@neondatabase/serverless` neon() uses Neon-specific HTTP endpoint Supabase doesn't have. Switched to `postgres` (postgres.js) with `prepare: false` for pgbouncer compatibility.
  - Added: `postgres@3.4.9`

- **4Aw.8** Supabase connection: Supavisor migration
  - Files: `.env.local`
  - What: Old hostname `db.<ref>.supabase.co` no longer resolves (DNS NXDOMAIN). Supabase migrated to Supavisor pooler at `aws-1-us-east-1.pooler.supabase.com`. Username changed from `postgres` to `postgres.<ref>`. Password `@` URL-encoded to `%40`.

- **4Aw.9** Brief validation relaxed + error formatting
  - Files: `src/server/routers/onboarding.ts`, `src/app/onboarding/page.tsx`, `src/components/onboarding/step-brief.tsx`
  - What: saveBrief removed `.min(1)` on icp/antiPositioning (users may not know during onboarding). Brief always pre-populates wedge/voiceTraits from template. `friendlyError()` parser converts raw Zod JSON into readable messages.

- **4Aw.10** Toast notifications
  - Files: `src/app/layout.tsx`, `src/app/onboarding/page.tsx`
  - What: Added `sonner@2.0.7`. `<Toaster />` in root layout. Replaced sticky error banner with `toast.error()`.

- **4Aw.11** Theme: OS dark mode detection
  - Files: `src/components/shell/theme-provider.tsx`, `src/app/onboarding/layout.tsx`
  - What: ThemeProvider now falls back to `window.matchMedia("prefers-color-scheme: dark")` when no saved theme. Added ThemeProvider to onboarding layout.

- **4Aw.12** Sign-in/sign-up redesign
  - Files: `src/app/sign-in/[[...sign-in]]/page.tsx`, `src/app/sign-up/[[...sign-up]]/page.tsx`
  - What: Dark gradient bg, dot grid, feature cards, stats bar, Clerk `dark` baseTheme from `@clerk/themes`. Single seamless background.

- **4Aw.13** antiAiRules UUID mismatch fix
  - Files: `src/server/routers/onboarding.ts`
  - What: `ctx.scoped.workspaceId` is Clerk orgId (string), but `antiAiRules.workspaceId` is UUID FK to `workspaces.id`. Now looks up internal workspace UUID before inserting rules.

- **4Aw.14** Hardcoded workspaces cleanup
  - Files: `src/components/shell/user-menu.tsx`
  - What: Removed GTMinds and say2neeraj from dropdown. Only FullFunnel LLC.

- **E2E verified** — Sign-in → 4 onboarding steps → Supabase: workspaces=3, brands=4, briefs=3, corpus=13, rules=72, onboarding_step=5 → dashboard redirect confirmed

### Phase 5A: Inngest Infrastructure + Embedding Utility (Session 6)

- **5A.1-5A.3** Inngest v4 infrastructure
  - Files: `src/server/inngest/client.ts`, `src/server/inngest/events.ts`, `src/app/api/inngest/route.ts`
  - What: Inngest client, typed events with Zod (signal.ingested, corpus.backfill, corpus.item.added), serve route for /api/inngest
  - Why: Background job infrastructure for async signal processing + corpus embedding
  - Impact: 3 event types registered, serve route handles all Inngest functions

- **5A.4** Gemini embedding utility
  - Files: `src/lib/ai/embed.ts`
  - What: gemini-embedding-001, 3072 dimensions, glass-box logging to ai_calls table (model, cost, latency, status)
  - Why: Core AI utility for semantic matching — signals against corpus, idea deduplication
  - Note: Error status logged on failure (self-review fix)

- **5A.5** Dead dependency cleanup
  - Files: `package.json`
  - What: Removed `@neondatabase/serverless` — replaced by postgres-js in Session 5
  - Why: Dead code in production deps

### Phase 5B: Schema Migration + Corpus Backfill (Session 6)

- **5B.1-5B.2** Vector dimension migration
  - Files: `src/db/schema/brands.ts`, `src/db/schema/signals.ts`, migration SQL
  - What: vector(1536) → halfvec(3072) on brand_corpus.embedding and signals.embedding. HNSW indexes rebuilt with halfvec_cosine_ops, m=16, ef_construction=64
  - Why: Gemini embedding-001 outputs 3072 dims. pgvector HNSW max is 2000 for vector type but 4000 for halfvec — must use halfvec
  - Impact: Breaking schema change — all existing embeddings invalidated (none in production yet)

- **5B.3** signal_source_configs table
  - Files: `src/db/schema/signals.ts`
  - What: New table for managing signal sources (RSS feeds, Reddit subreddits, competitors, thought leaders) per brand
  - Why: Enables source management UI and selective ingestion

- **5B.4** Supabase RPC functions
  - What: match_brand_corpus (cosine similarity search on corpus), match_signal_ideas (dedup check on existing ideas)
  - Why: pgvector similarity search needs SQL RPCs — Drizzle ORM doesn't expose halfvec operators

- **5B.5-5B.7** Corpus backfill pipeline
  - Files: `src/server/inngest/functions/`, `src/server/routers/corpus.ts`
  - What: corpus-backfill (batch re-embed all corpus items), corpus-embed-item (embed single item on add). corpus.ts router now emits Inngest event on new corpus items.
  - Why: Existing corpus items need embeddings for voice matching. New items get embedded automatically.

### Phase 5C: Webhook + Signal Processing Pipeline (Session 6)

- **5C.1** n8n webhook endpoint
  - Files: `src/app/api/webhooks/n8n/route.ts`
  - What: POST /api/webhooks/n8n, HMAC-SHA256 signature verification, Zod validation (single + batch payloads), atomic CTE for webhook_deliveries + signals insert, returns 202 Accepted + emits Inngest events
  - Why: n8n workflows (RSS, Reddit, competitors) POST signals to this endpoint
  - Security: HMAC timing-safe comparison (crypto.timingSafeEqual), idempotency via n8nExecutionId unique constraint

- **5C.2** HMAC verify utility
  - Files: `src/lib/security/hmac.ts`
  - What: computeHmac() + verifyHmac() with timingSafeEqual
  - Why: Webhook signature verification — prevents spoofed signals

- **5C.4** process-signal Inngest function
  - Files: `src/server/inngest/functions/`
  - What: Full pipeline — fetch signal → embed (Gemini) → rank via match_brand_corpus RPC → dedup via match_signal_ideas RPC (skip if > 0.85 similarity) → create idea → mark signal processed
  - Verified: Completed in 5.5s end-to-end

- **5C.5** Idempotency
  - What: Sending same signal twice → second is skipped (postgres error code 23505 detection, not string matching)
  - Self-review fix: Changed from `error.message.includes("unique")` to `error.code === "23505"`

### Phase 5D: Enhanced Routers + Idea Wall UI (Session 6)

- **5D.1** Signals router (11 procedures)
  - Files: `src/server/routers/signals.ts`
  - What: listSources, addSource, toggleSource, deleteSource, triggerBackfill + more
  - All procedures use workspace UUID lookup (getWorkspaceUuid helper)
  - Registered in _app.ts — now 11 routers total

- **5D.2** Ideas router rewrite
  - Files: `src/server/routers/ideas.ts`
  - What: getById, dismiss (hotScore=0, not -1), addManual, enhanced list (source filter, sort by hotScore/createdAt/icpFit)
  - Self-review fixes: dismiss uses hotScore=0 (CHECK constraint prevents -1), workspace scoping on all procedures, cache invalidation after dismiss

- **5D.5-5D.6** Idea Wall UI
  - Files: `src/components/ideas/IdeaCard.tsx`, `SourceRail.tsx`, `FilterBar.tsx`, `src/app/(app)/ideas/page.tsx`
  - What: Full Idea Wall replacing placeholder — IdeaCard with source badge, hotScore, ICP fit, tags, format suggestions. SourceRail for source management. FilterBar for source/sort filtering.
  - Status: Generate button shows stub toast. Dismiss code reviewed but not tested live.

### Phase 5 Self-Review (Session 6) — 16 issues fixed

- **Security:** HMAC timing-safe comparison, workspace scoping on 4 procedures (getById, dismiss, toggleSource, deleteSource), brand ownership check on triggerBackfill
- **Correctness:** Postgres error code 23505 (not string matching), atomic CTE for webhook insert, dismiss hotScore=0 (not -1), error status logging in embed.ts
- **Data integrity:** Skip duplicate ideas (dedup > 0.85), cache invalidation after dismiss, Inngest send failure logging

### Additional Fixes (Session 6)

- **Onboarding UX:** Added user menu top bar to onboarding layout, "Skip to dashboard" button on welcome screen
- **Shell cleanup:** Removed hardcoded sidebar badge counts (23/4/12) — will be dynamic from real data

### Commits (Session 6)

1. `feat(phase5): Inngest infrastructure, Gemini embeddings, halfvec migration`
2. `feat(phase5): webhook endpoint + signal processing pipeline`
3. `feat(phase5): signals router, enhanced ideas router, Idea Wall UI`
4. `fix(phase5): self-review — 16 issues fixed across security, correctness, data integrity`
5. `fix(onboarding): add user menu top bar + skip to dashboard button`
6. `fix(shell): remove hardcoded badge counts from sidebar nav`
