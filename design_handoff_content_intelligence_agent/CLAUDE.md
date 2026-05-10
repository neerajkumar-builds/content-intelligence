# Content Intelligence Agent — Engineering Handoff

This file is the source-of-truth for any AI coding agent (Claude Code, Cursor, etc.) building the production app from this HTML prototype.

---

## What we're building

**Content Intelligence Agent** — a voice-faithful B2B content automation platform that ingests signals (RSS, competitors, thought leaders, listening), surfaces ranked ideas, generates drafts in the operator's voice with anti-AI guardrails, and publishes across 15+ channels. Glass-box AI: every prompt, model choice, cost, and idempotency key is visible to the operator.

**Wedge:** Voice-faithful B2B ghostwriting with anti-AI guardrails — for operators whose credibility takes a hit when their content sounds like everyone else's.

**ICP:** B2B ops & GTM leaders, 50-500 employees, post personally on LinkedIn 2-5×/week.

---

## How to read the prototype

```
Content Intelligence Agent.html      ← entry · loads scripts in order
app/
  tokens.css                         ← design system (colors, type, spacing)
  primitives.jsx                     ← component library spec (Icon, ChannelMark, ScoreSwatch, Sparkline, Tooltip, RouterProvider, ThemeProvider)
  shell.jsx                          ← AppShell + Sidebar + TopBar + UserMenu + BrandSwitcher (read FIXTURES at top — that's the data model)
  app.jsx                            ← root + route table
  tweaks-panel.jsx                   ← prototype-only (skip for prod)
  screens/
    home.jsx                         ← briefing + decisions queue + channels strip + week ideas + mission control
    ideas.jsx                        ← idea wall (today's queue, ranked, sources)
    draft.jsx                        ← draft editor (7-dim rubric is incomplete; see Gaps)
    schedule.jsx                     ← calendar + queue
    learn.jsx                        ← insights + competitors + thought leaders (split these in prod)
    govern.jsx                       ← brand brief, anti-AI rules, connectors, members, settings
    extra.jsx                        ← prompt studio, models, audit log, data export, onboarding
```

**The fixtures inside each screen file ARE the data model.** Lift them into Drizzle schemas verbatim. Where the prototype shows hardcoded arrays, prod replaces them with tRPC queries returning the same shape.

---

## Recommended stack

| Layer | Pick | Why |
|---|---|---|
| Framework | Next.js 14 (App Router) | Server actions for n8n webhooks, RSC for the heavy Govern surfaces |
| UI | React 18 + Tailwind + shadcn/ui | Lift `tokens.css` into Tailwind theme |
| Auth | Clerk Organizations | We already model workspaces + brands as orgs (see FIXTURES) |
| DB | Postgres + Drizzle | Idempotency keys + audit log need transactional integrity |
| API | tRPC | Type-safe; matches the per-route `apiMap` in shell.jsx |
| Background | Inngest or Trigger.dev | Signal ingestion, draft generation, publish |
| LLM routing | Vercel AI SDK + custom router | Per-task model selection (see `extra.jsx` Models screen) |
| Vector store | pgvector | Brand corpus embeddings for voice fidelity scoring |
| Connectors | Composio or custom + n8n | 11 contract tests per OAuth connector — see `govern.jsx` Connectors |

---

## Design tokens

All colors/type/spacing in `app/tokens.css`. Lift directly to `tailwind.config.ts`:
- `--accent` = electric blue, primary CTA + active nav
- `--good` / `--warning` / `--danger` = semantic states
- `--ink-primary/secondary/tertiary/quaternary` = text scale
- `--bg-canvas/elevated/muted/hover` = surface scale
- `--border-subtle` everywhere
- Type: **Montserrat** (UI) / **Charter** (long-form draft body) / **JetBrains Mono** (numbers, IDs)

---

## Status vocabulary (LOCK THIS)

Every post/draft has exactly one of these states. Do not invent others.
```
draft → graded → approved → scheduled → publishing → live
                                                   ↘ failed
```
Idempotency key format: `idem_<draftId>_v<version>_<channel>_<yyyymmdd>`

---

## The 7-dim rubric (core to the product)

Every draft is graded 0-10 on:
1. **Hook** — does line 1 stop the scroll?
2. **Voice** — cosine similarity vs brand corpus
3. **Evidence** — specific numbers / customer names / quotes present?
4. **Format-fit** — does the structure match the channel?
5. **Controversy** — is there a defensible POV, not just consensus?
6. **Specificity** — concrete vs abstract claims
7. **CTA** — is there a single clear action or question?

The composite (avg, weighted by channel) drives the score swatch.

---

## Anti-AI rules (read `screens/govern.jsx` AntiAIRules)

62 rules across 4 severities (block / warn / suggest / log). Strict mode auto-rejects any block-severity hit. Every rule has: pattern (regex or vector match), severity, channel scope, last-tripped timestamp. **Operators can edit / disable / add.**

---

## Connectors (read `screens/govern.jsx` Connectors)

15 platforms across 3 tiers. Each OAuth connector ships with 11 contract tests:
1. token-refresh
2. idempotency replay
3. retry on 429
4. rate-limit backoff
5. media validator (size, dims, mime)
6. account warm-up (new account ramp)
7. ghost detection (silent failure)
8. health probe
9. scope verification
10. webhook listener (where supported)
11. cost meter

OAuth scopes per platform are listed in the prototype — use those exactly.

---

## Glass-box AI requirements

For every AI call, the operator must be able to see (in real time):
- Which model handled it (anthropic/openai/gemini/openrouter)
- The exact prompt (editable in Prompt Studio)
- Token I/O + cost
- Latency
- Anti-AI rules tripped + outcome
- Voice fidelity score against corpus

This is non-negotiable — it's the entire product wedge vs. Jasper / Copy.ai.

---

## Build order (recommended)

1. **Scaffolding** — Next.js + Clerk + Drizzle, port `tokens.css` to Tailwind, build the shell from `shell.jsx`
2. **Data model** — Drizzle schemas from FIXTURES + per-screen card arrays
3. **Brand + Anti-AI rules CRUD** — read-mostly surfaces, easy first slice
4. **Connectors** — LinkedIn first (Sabrina/Welsh playbook), then X, Beehiiv, then everything else
5. **Idea Wall** — n8n RSS ingestion + ranking job
6. **Drafts** — generate → grade (7-dim) → approve loop. Glass-box logging here.
7. **Schedule + publish** — idempotency-keyed publish jobs via Inngest
8. **Insights** — last, after you have real data flowing

---

## Known gaps in the prototype (don't build these as-is)

- Drafts screen lacks the 7-dim rubric UI — build the radar/bar chart in prod
- Insights is placeholder — apply the Inputs-vs-Outputs reframe from the spec
- No empty states or skeletons — add per-screen
- No agency-approval magic-link flow — design + build separately
- Status vocabulary needs locking (see above)
- Time formats inconsistent — use `date-fns` `formatDistanceToNow` everywhere

---

## Working with this prototype as a Claude Code agent

Suggested first prompts:

> Read `app/tokens.css`, `app/primitives.jsx`, and `app/shell.jsx`. Port the design system to Tailwind config and the AppShell to a Next.js App Router layout. Preserve sidebar Pinned/Make/Learn/Govern grouping and the workspace + brand switchers.

> Read all `app/screens/*.jsx`. For each screen, extract the fixture data into a Drizzle table schema. Generate `db/schema.ts`.

> Implement the Idea Wall (`app/screens/ideas.jsx`). The fixture array is the response shape; build a tRPC `ideas.list` query that returns it. Stub the data; we'll wire n8n later.

Treat the prototype as **the visual + interaction + data spec.** Do not redesign — match it pixel-close. Differences should be raised as questions, not silent decisions.
