# Handoff: Content Intelligence Agent

## Overview

**Content Intelligence Agent** is a voice-faithful B2B content automation platform. It ingests signals (RSS, competitor posts, thought leaders, social listening), surfaces ranked content ideas, generates drafts in the operator's voice with anti-AI guardrails, grades each draft against a 7-dimensional rubric, and publishes across 15+ channels with full idempotency and audit trails.

**Wedge:** Voice-faithful B2B ghostwriting with anti-AI guardrails — for operators whose credibility takes a hit when their content sounds like everyone else's.

**ICP:** B2B ops & GTM leaders at 50-500-employee companies, posting personally on LinkedIn 2-5×/week.

**Glass-box principle:** Every prompt, model choice, token cost, latency reading, anti-AI rule hit, and idempotency key is visible to the operator at all times. This is the entire wedge vs Jasper / Copy.ai.

---

## About the Design Files

The files in this bundle are **design references created in HTML** — interactive prototypes showing the intended look, behavior, data shapes, and information architecture. They are **not production code to copy directly.**

Your task is to **recreate these HTML designs in the target codebase's environment** using its established patterns and libraries. If no environment exists yet, the recommended stack is Next.js 14 (App Router) + React 18 + Tailwind + shadcn/ui + Postgres + Drizzle + Clerk Organizations + tRPC + Inngest + Vercel AI SDK + pgvector. (See `CLAUDE.md` for the full stack rationale.)

The fixture data inside each `app/screens/*.jsx` file IS the data model — Drizzle schemas should be lifted directly from these shapes.

---

## Fidelity

**High-fidelity (hifi).** These are pixel-perfect mockups with final colors, typography, spacing, interaction states, light/dark theming, and realistic data. Recreate the UI pixel-close using the target codebase's libraries.

Differences from the prototype should be raised as questions, not silent decisions.

---

## Screens / Views

The app has **16+ screens** organized into 4 sidebar groups (Pinned, Make, Learn, Govern) plus an onboarding flow. Routes are managed in `app/app.jsx`.

### 1. Home (`app/screens/home.jsx`)
- **Purpose:** Daily mission control. Operator's first view of the day.
- **Layout:** Two-column grid. Left (8/12): morning briefing card, decisions queue, week ideas table. Right (4/12): channels strip with health, pending counts, quota meters; mission control with active jobs.
- **Components:** Briefing card with timestamp + signal count; decisions queue with approve/reject actions; channel cards (15 platforms) with status pills; mission control with idempotency hashes visible.

### 2. Idea Wall (`app/screens/ideas.jsx`)
- **Purpose:** Today's ranked content ideas, sourced from signals.
- **Layout:** Filter bar (source, score, channel) + 3-column grid of idea cards.
- **Components:** Idea cards showing rank, score swatch (0-10), source attribution, suggested angle, channel tag, "draft this" CTA.

### 3. Drafts (`app/screens/draft.jsx`)
- **Purpose:** Edit and grade generated drafts. THE conversion surface.
- **Layout:** Three-pane: left = draft list, center = editor (Charter font, long-form), right = grading + glass-box panel.
- **Components:** 7-dim rubric (hook, voice, evidence, format-fit, controversy, specificity, CTA), prompt editor, model selector, token/cost readout, anti-AI rules tripped, platform previews.
- **Note:** The 7-dim rubric UI is incomplete in the prototype — build it as a horizontal bar chart in production.

### 4. Schedule (`app/screens/schedule.jsx`)
- **Purpose:** Week view of scheduled posts.
- **Layout:** Calendar grid (7 days × time slots) + queue table below.
- **Components:** Post cards on calendar showing channel mark, status pill, idempotency hash; queue table with bulk actions.

### 5. Insights (`app/screens/learn.jsx` — Insights tab)
- **Purpose:** Performance analytics.
- **Note:** Currently placeholder. Reframe needed: top cards should show "Inputs vs Outputs" (signals processed, drafts generated, posts published) vs (engagement, voice fidelity, anti-AI hit rate).

### 6. Competitors (`app/screens/learn.jsx` — Competitors tab)
- **Purpose:** Track competitor publishing patterns.
- **Components:** Competitor cards with cadence, top topics, breakout posts.

### 7. Thought Leaders (`app/screens/learn.jsx` — Leaders tab)
- **Purpose:** Track ICP voices (Sabrina Ramonov, Justin Welsh, Pierre Herubel, etc).
- **Components:** Leader cards with latest posts, breakout signals, "your angle" suggestions.

### 8. Brand Brief (`app/screens/govern.jsx` — BrandBrief)
- **Purpose:** The voice corpus + style rules that all generations are conditioned on.
- **Components:** Versioned editor, voice fidelity sparkline (30-day), "fed into" endpoints panel showing every prompt that uses this brief.

### 9. Anti-AI Rules (`app/screens/govern.jsx` — AntiAIRules)
- **Purpose:** 62 rules across 4 severities (block/warn/suggest/log).
- **Components:** Rules table, severity filter, strict-mode toggle, last-tripped timestamps, edit/disable/add controls.

### 10. Connectors (`app/screens/govern.jsx` — Connectors)
- **Purpose:** 15 OAuth platform integrations across 3 tiers.
- **Components:** Per-connector card with status, OAuth scopes, 11 contract test results, last sync, retry button.

### 11. Members (`app/screens/govern.jsx` — Members)
- **Purpose:** Workspace member management with roles.
- **Components:** Members table, invite flow, role chips, last-active.

### 12. Prompt Studio (`app/screens/extra.jsx` — PromptStudio)
- **Purpose:** Glass-box prompt editor — every system prompt the agent uses, editable.
- **Components:** Prompt list (sidebar), Monaco-style editor, variable inspector, version history, test runner.

### 13. Models (`app/screens/extra.jsx` — Models)
- **Purpose:** Per-task model routing across providers.
- **Components:** Provider list (Anthropic, OpenAI, Gemini, OpenRouter, Voyage, Cohere), per-task assignment table, BYOK fields, cost projections.

### 14. Audit Log (`app/screens/extra.jsx` — AuditLog)
- **Purpose:** Append-only ledger of every operator action.
- **Components:** Filterable timeline, actor + action + entity + timestamp, JSON-diff inspector.

### 15. Data Export (`app/screens/extra.jsx` — DataExport)
- **Purpose:** GDPR-compliant data export.
- **Components:** Format selector (JSON/CSV/SQL), date range, scope checkboxes, async job status.

### 16. Onboarding (`app/screens/extra.jsx` — Onboarding)
- **Purpose:** 7-step first-run wizard.
- **Components:** Step indicator, voice corpus ingestion (4 paths: paste, URL, file upload, LinkedIn import), brand brief draft, first connector, first idea.

---

## Interactions & Behavior

- **Routing:** Hash-based in prototype (`#/home`, `#/ideas/123`, etc.). Use Next.js App Router in production.
- **Theme toggle:** Light/dark via `data-theme` attribute on `<html>`. Persisted in localStorage.
- **Sidebar mode:** Labeled / icon-only toggle, persisted.
- **Workspace switcher:** In user-menu dropdown (top-right avatar). Clerk Organizations in production.
- **Brand switcher:** In sidebar header. Each workspace can contain multiple brands.
- **Status transitions:** Locked vocabulary — `draft → graded → approved → scheduled → publishing → live` (or `→ failed`). No other states permitted.
- **Idempotency:** Format `idem_<draftId>_v<version>_<channel>_<yyyymmdd>`. Visible on every published-post card.
- **Tooltips:** Hover-trigger, 200ms delay. Use the `<Tooltip>` primitive.
- **Score swatches:** 0-10 display, 0-1 internal. Color band: red (0-3) / amber (4-6) / green (7-10).

---

## State Management

**Per-screen state** (lift to tRPC queries in production):
- `home`: briefing, decisions queue, channel statuses, jobs
- `ideas`: ranked idea list, filters
- `drafts`: draft list, active draft, grades, glass-box trace
- `schedule`: calendar posts, queue
- `connectors`: per-platform status, contract test results
- `audit`: paginated log entries

**Global state:**
- Active workspace (Clerk org)
- Active brand (sub-org or own table)
- Theme + sidebar mode (localStorage)
- User profile (Clerk)

---

## Design Tokens

All in `app/tokens.css`. Lift to `tailwind.config.ts` via CSS variables.

**Colors (light):**
- `--accent: #2563eb` (electric blue) — primary CTA, active nav
- `--good: #16a34a` — success / live
- `--warning: #d97706` — warn
- `--danger: #dc2626` — failed / block
- `--ink-primary: #0f172a`
- `--ink-secondary: #475569`
- `--ink-tertiary: #94a3b8`
- `--ink-quaternary: #cbd5e1`
- `--bg-canvas: #ffffff`
- `--bg-elevated: #f8fafc`
- `--bg-muted: #f1f5f9`
- `--bg-hover: #e2e8f0`
- `--border-subtle: #e2e8f0`

**Colors (dark):** mirrored — see `tokens.css`.

**Type scale:**
- Family: **Montserrat** (UI), **Charter** (long-form draft body), **JetBrains Mono** (numbers, IDs, idempotency keys)
- Weights: 500 default, 600 medium-emphasis, 700 display
- Sizes: 11/12/13/14/16/20/24/32/48 px

**Spacing:** 4 / 8 / 12 / 16 / 24 / 32 / 48 / 64 px

**Border radius:** 4 / 6 / 8 / 12 / 999 (pill)

**Shadow:** subtle 1-layer (`0 1px 2px rgba(0,0,0,.04)`) — design avoids heavy shadows.

---

## Assets

- **`app/assets/fullfunnel-logo.svg`** — brand logo. Replace with target brand if rebranding.
- **No raster images** in prototype. Channel marks are inline SVG in `primitives.jsx` (`<ChannelMark>`).

---

## Critical Product Rules (don't violate)

1. **Status vocabulary is locked** — see above.
2. **Idempotency keys are mandatory** on every publish.
3. **Glass-box AI** — never hide model, prompt, cost, or anti-AI hit from the operator.
4. **7-dim rubric** is the differentiator — it must be implemented.
5. **62 anti-AI rules** with 4 severities, operator-editable.
6. **15 connectors with 11 contract tests each** — see Connectors screen for the test list and OAuth scopes.
7. **Workspace + brand are separate concepts** — workspaces contain brands; voice corpus is per-brand.

---

## Known Gaps (build these in production, not as-is)

- 7-dim rubric UI on Drafts (placeholder in prototype)
- Insights — apply Inputs-vs-Outputs reframe
- Empty states + skeleton loaders (none exist in prototype)
- Agency-approval magic-link flow (designed but not built)
- Keyboard nav + `:focus-visible` rings
- Time format consistency — use `date-fns` `formatDistanceToNow` everywhere

---

## Files

```
Content Intelligence Agent.html      ← entry; loads scripts in order
app/
  tokens.css                         ← design system (CSS variables)
  primitives.jsx                     ← Icon, ChannelMark, ScoreSwatch, Sparkline, Tooltip, RouterProvider, ThemeProvider
  shell.jsx                          ← AppShell, Sidebar, TopBar, UserMenu, BrandSwitcher (FIXTURES at top = data model)
  app.jsx                            ← root + route table
  tweaks-panel.jsx                   ← prototype-only, ignore in prod
  assets/
    fullfunnel-logo.svg
  screens/
    home.jsx                         ← Home / mission control
    ideas.jsx                        ← Idea Wall
    draft.jsx                        ← Drafts (7-dim rubric stub)
    schedule.jsx                     ← Schedule + queue
    learn.jsx                        ← Insights + Competitors + Thought Leaders
    govern.jsx                       ← Brand Brief, Anti-AI Rules, Connectors, Members
    extra.jsx                        ← Prompt Studio, Models, Audit Log, Data Export, Onboarding
CLAUDE.md                            ← engineering spec (auto-loaded by Claude Code)
DEV_PROMPTS.md                       ← 8 sequenced prompts for Claude Code, in build order
```

**Start here:** Read `CLAUDE.md` first, then `app/tokens.css`, then `app/primitives.jsx`, then `app/shell.jsx`. Then walk the screens in priority order: Brand Brief → Connectors → Idea Wall → Drafts → Schedule → Insights.
