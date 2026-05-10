# Phase 3: Brand Brief + Anti-AI Rules — Design Spec

## Context

Phase 0-2.5 built foundation (27 tables, tRPC v11, 7 routers, seed data). Phase 3 adds the brand identity layer: versioned brand briefs, voice corpus ingestion, anti-AI rule enforcement, and strict mode per brand. Also includes production audit fixes discovered during Phase 2.5 self-review.

## Decisions Made

- **Strict mode:** Per-brand (not per-workspace). Each brand controls its own publish gate.
- **Pattern types:** Phrase + Regex (no vector matching yet). Column `patternType: 'phrase' | 'regex'`.
- **Corpus scope:** Schema + manual upload only. Embedding pipeline (Voyage-3) deferred to Phase 5.
- **Approach:** Backend + UI (A+B). Backend first, verify, then UI components.

## Schema Changes

### New Columns (3)

| Table | Column | Type | Default | Purpose |
|-------|--------|------|---------|---------|
| brands | strictMode | boolean NOT NULL | false | Per-brand anti-AI enforcement gate |
| antiAiRules | patternType | text NOT NULL | 'phrase' | Match strategy: 'phrase' (substring) or 'regex' (JS regex) |
| brandBriefs | changelog | text | null | Version change notes (e.g., "Updated ICP section") |

### Migration

Apply via Supabase MCP `apply_migration`:
```sql
ALTER TABLE brands ADD COLUMN strict_mode boolean NOT NULL DEFAULT false;
ALTER TABLE anti_ai_rules ADD COLUMN pattern_type text NOT NULL DEFAULT 'phrase';
ALTER TABLE brand_briefs ADD COLUMN changelog text;
```

Update Drizzle schema files to match, then `drizzle-kit generate` for snapshot sync.

## Backend: tRPC Procedures

### New Procedures (12)

#### Brand Router (`src/server/routers/brand.ts`)

| Procedure | Type | Input | Output | Notes |
|-----------|------|-------|--------|-------|
| brand.create | mutation | `{ name }` | brand object | Auto-sets workspaceId from context |
| brand.toggleStrictMode | mutation | `{ brandId }` | `{ strictMode: boolean }` | Flips current value |

#### Brief Router (`src/server/routers/brief.ts` — NEW)

| Procedure | Type | Input | Output | Notes |
|-----------|------|-------|--------|-------|
| brief.create | mutation | `{ brandId, wedge, icp, voiceTraits, antiPositioning, changelog? }` | brief with auto-incremented version | NEVER updates in place — always new row |
| brief.get | query | `{ brandId, version? }` | single brief (latest if no version) | Returns null brief.get for brand with no briefs yet |
| brief.list | query | `{ brandId, limit? }` | brief[] ordered by version DESC | For version history sidebar |
| brief.diff | query | `{ brandId, versionA, versionB }` | `{ a: brief, b: brief }` | Client does text diff rendering |

#### Corpus Router (`src/server/routers/corpus.ts` — NEW)

| Procedure | Type | Input | Output | Notes |
|-----------|------|-------|--------|-------|
| corpus.add | mutation | `{ brandId, content, sourceUrl? }` | corpus item (no embedding) | Embedding field left null until Phase 5 |
| corpus.list | query | `{ brandId }` | corpusItem[] ordered by createdAt DESC | Shows all voice samples |
| corpus.delete | mutation | `{ corpusItemId }` | `{ deleted: true }` | Hard delete |

#### Rules Router Additions (`src/server/routers/rules.ts`)

| Procedure | Type | Input | Output | Notes |
|-----------|------|-------|--------|-------|
| rules.get | query | `{ ruleId }` | single rule | For edit form pre-fill |
| rules.delete | mutation | `{ ruleId }` | `{ deleted: true }` | Hard delete, workspace-scoped |

### Bug Fixes (4)

| Fix | File | Change |
|-----|------|--------|
| brand.update returns null → throw NOT_FOUND | brand.ts | Add TRPCError check |
| rules.update returns null → throw NOT_FOUND | rules.ts | Add TRPCError check |
| Logging `as any` type safety | logging/index.ts | Replace with proper type guard |
| scopedDb throws generic Error → TRPCError | scoped-db.ts | Import TRPCError, throw FORBIDDEN |

### App Router Update

`src/server/routers/_app.ts` — add brief + corpus routers:
```typescript
import { briefRouter } from "./brief";
import { corpusRouter } from "./corpus";

export const appRouter = router({
  brand: brandRouter,
  brief: briefRouter,
  corpus: corpusRouter,
  // ... existing routers
});
```

## UI Components

### Brand Brief Page (`src/app/(app)/brand/page.tsx`)

Replaces current placeholder. From `govern.jsx:21-92` design:

**Layout:** 2-column grid (1.5fr 1fr)

**Left column:**
- Version tabs: "Current · v{N}" | "Version history" | "Diff vs v{N-1}"
- Four cards: Wedge, ICP, Voice Traits, Anti-Positioning
- Each card: eyebrow label, body text, meta footer (editor, timestamp)
- "Edit brief" button → modal with form fields

**Right column:**
- Voice Fidelity card (read-only, shows brands.voiceScore, sparkline placeholder)
- "Fed Into" card (lists endpoints using this brief — static for now)
- Versioning card (version history list from brief.list)
- Corpus section: list items, "Add content" button, delete per item

**Data source:** `trpc.brand.get` + `trpc.brief.get` + `trpc.brief.list` + `trpc.corpus.list`

### Anti-AI Rules Page (`src/app/(app)/rules/page.tsx`)

Replaces current placeholder. From `govern.jsx:92-174` design:

**Layout:** Single column

**KPI strip (4 cards):**
- Strict mode: ON/OFF with toggle
- Active rules count
- Pattern breakdown: "{N} phrase · {M} regex"
- Catches last 30d (sum of hits30d)

**Strict mode toggle bar:**
- Shield icon, description text, toggle button
- Calls `trpc.brand.toggleStrictMode`

**Rules table:**
- Columns: Phrase/pattern (mono), Category (pill), Action (pill), PatternType, Hits 30d, Actions
- Row actions: Edit (opens form), Delete (confirmation)
- "Add rule" button → modal with form

**Add/Edit form fields:**
- phraseOrPattern (text input)
- category (select: punctuation/transition/filler/corporate/cliche/custom)
- severity (select: block/warn/suggest/log)
- action (select: block/rewrite/flag)
- patternType (radio: phrase/regex)
- channelScope (multi-select, optional)
- enabled (checkbox)

**Data source:** `trpc.rules.list` + `trpc.rules.create` + `trpc.rules.update` + `trpc.rules.delete`

## Seed Data Updates

### Brand Brief Seeds
```
v1 (FullFunnel.co):
  wedge: "Most B2B teams treat content as a checkbox..."
  icp: "VP/Director of Marketing at B2B SaaS (50-500 employees)..."
  voiceTraits: "Direct, evidence-backed, contrarian when warranted..."
  antiPositioning: "Never sound like a press release..."
  changelog: "Initial brand brief"

v2 (FullFunnel.co):
  wedge: (same)
  icp: "VP/Director of Marketing at B2B SaaS (50-500 employees), focused on pipeline generation..."
  voiceTraits: (same + "Avoid jargon unless audience-specific")
  antiPositioning: (same)
  changelog: "Updated ICP with pipeline focus"
```

### Corpus Seeds (3 items)
- Sample LinkedIn post #1 (text, no embedding)
- Sample LinkedIn post #2 (text, no embedding)
- Sample newsletter intro (text, no embedding)

### Additional Rules Seeds
- 3 regex-type rules (e.g., `/\b(leverage|synerg)\w*/i`, `/\b(utilize|utiliz)\w*/i`, `/\b(in order to)\b/i`)

## Micro-Task Sequence (20 tasks)

### Backend Foundation (Tasks 3.1-3.4)
3.1 — Schema changes (3 columns) + Drizzle sync + migration
3.2 — Fix logging `as any` type safety
3.3 — Fix scopedDb to throw TRPCError
3.4 — Fix brand.update + rules.update null → NOT_FOUND

### Brand Brief Backend (Tasks 3.5-3.8)
3.5 — brand.create procedure
3.6 — Brief router: brief.create (versioned insert)
3.7 — Brief router: brief.get + brief.list
3.8 — Brief router: brief.diff

### Corpus + Rules Backend (Tasks 3.9-3.12)
3.9 — Corpus router: corpus.add + corpus.list + corpus.delete
3.10 — brand.toggleStrictMode procedure
3.11 — rules.get + rules.delete procedures
3.12 — Update _app.ts + build verify

### Seed Data (Task 3.13)
3.13 — Seed brand briefs v1+v2, corpus items, regex rules via Supabase MCP

### UI Components (Tasks 3.14-3.19)
3.14 — Brand Brief page: layout + version tabs + brief display cards
3.15 — Brand Brief page: edit modal + form + brief.create integration
3.16 — Brand Brief page: version history + diff view
3.17 — Brand Brief page: corpus section (list + add + delete)
3.18 — Anti-AI Rules page: KPI strip + strict mode toggle + table
3.19 — Anti-AI Rules page: add/edit modal + delete action

### Final (Task 3.20)
3.20 — Build verify + tracking updates + commit + push

## Verification

1. `pnpm build` — clean after every task
2. `pnpm dev` — pages render at /brand and /rules
3. tRPC procedures return correct shapes (matching design fixtures)
4. Brief versioning: create v1, create v2, list shows both, diff works
5. Rules CRUD: create, edit, delete all work through UI
6. Strict mode toggle persists per brand
7. Workspace isolation: different workspace = empty results
8. Seed data visible in both pages

## Dependencies

- Existing: scopedDb, createTraceId, AppError, TRPCProvider, protectedProcedure
- New deps: none (all UI uses existing React + Tailwind + tRPC hooks)
- API keys needed: none (corpus embedding deferred)
