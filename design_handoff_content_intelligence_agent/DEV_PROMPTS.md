# Starter prompts for Claude Code

Copy/paste these into Claude Code in your real repo. Order matters.

---

## 1. Initial context

```
I'm building Content Intelligence Agent — a voice-faithful B2B content
automation platform. The complete design + data spec is in this folder
(Content Intelligence Agent.html + app/). Read CLAUDE.md first, then
app/tokens.css, app/primitives.jsx, app/shell.jsx.

Stack: Next.js 14 App Router · React 18 · Tailwind · shadcn/ui ·
Postgres + Drizzle · Clerk Organizations · tRPC · Inngest ·
Vercel AI SDK · pgvector.

Match the prototype's structure and data shapes exactly.
Raise questions, don't redesign silently.
```

## 2. Scaffolding

```
Create a fresh Next.js 14 App Router project with the stack above.
Port app/tokens.css into tailwind.config.ts and globals.css.
Build the AppShell layout from app/shell.jsx — sidebar groups, top bar,
workspace + brand switchers, light/dark toggle. Use Clerk Organizations
for workspaces.
```

## 3. Data model

```
For every file in app/screens/, extract its fixture arrays/objects into
Drizzle table schemas. Output one db/schema.ts. Required tables:
workspaces, brands, members, brand_briefs, anti_ai_rules, connectors,
oauth_tokens, signals, ideas, drafts, draft_grades (7-dim), schedules,
posts, post_results, prompts, model_routes, audit_log.

Add idempotency_key (text, unique) on posts. Add status enum:
draft|graded|approved|scheduled|publishing|live|failed.
```

## 4. First feature — Brand Brief

```
Implement the Brand Brief screen from app/screens/govern.jsx (BrandBrief
component) as a Next.js page at /govern/brand. tRPC query brand.get,
mutation brand.update. Versioned (every save creates a new row).
Preserve the voice-fidelity sparkline + "fed into" endpoints panel.
```

## 5. Connectors

```
Implement the Connectors screen from app/screens/govern.jsx. Start with
LinkedIn OAuth using NextAuth or Clerk's OAuth helpers. Build the
11-test contract harness as a cron job (Inngest) that runs hourly
per connector. Show pass/fail per test in the UI.

Use the OAuth scopes listed in the prototype exactly.
```

## 6. Idea Wall

```
Implement Idea Wall from app/screens/ideas.jsx. n8n posts signals to
/api/webhooks/n8n. Score signals against the brand brief using
pgvector cosine similarity. Top 23 surface as ideas with rank + source.
```

## 7. Drafts + 7-dim grading (KEY SURFACE)

```
Implement Drafts from app/screens/draft.jsx. The 7-dim rubric is
missing from the prototype — build it: hook, voice, evidence,
format-fit, controversy, specificity, CTA. Each 0-10. Render as a
horizontal bar chart with the composite score as a swatch.

Glass-box: log model, prompt (editable), token I/O, cost, latency,
anti-AI hits per generation. Show inline.
```

## 8. Publish loop

```
Build the publish loop. Inngest job: takes a scheduled post, generates
idempotency_key, calls connector adapter, retries on 429 with backoff,
records result in post_results. UI polls status. Status moves through
the locked vocabulary (draft → graded → approved → scheduled →
publishing → live, or → failed).
```

---

## Tips when working with Claude Code on this

- **Don't let it redesign.** If it suggests "modernizing" the layout, push back to the prototype.
- **Treat fixtures as contracts.** The shape is the API. If a fixture has 11 fields, the API returns 11 fields.
- **Preserve mono pills + ID display.** Idempotency keys, audit IDs, prompt IDs — they're visible in the prototype because operators rely on them.
- **The agent is glass-box.** Never hide a model decision, prompt, or cost.
