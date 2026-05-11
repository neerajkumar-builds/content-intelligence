# Phase 3: Brand Brief + Anti-AI Rules — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add versioned brand brief CRUD, voice corpus upload, anti-AI rule management with strict mode, and two production-ready UI pages.

**Architecture:** Backend-first (schema + tRPC), then UI. New `brief` and `corpus` routers alongside existing `brand` and `rules` routers. All mutations workspace-scoped via scopedDb. UI pages replace current placeholders at `/brand` and `/rules`.

**Tech Stack:** Drizzle ORM, tRPC v11, Zod v4, React 19, Tailwind CSS 4 (existing globals.css classes: `.card`, `.pill`, `.btn`, `.eyebrow`, `.mono`, `.tabular`)

---

## File Map

### Create
| File | Responsibility |
|------|---------------|
| `src/server/routers/brief.ts` | Brand brief CRUD (versioned create, get, list, diff) |
| `src/server/routers/corpus.ts` | Voice corpus CRUD (add, list, delete) |
| `src/components/brand/brief-cards.tsx` | Brand brief display cards (wedge, ICP, voice traits, anti-positioning) |
| `src/components/brand/brief-edit-modal.tsx` | Edit/create brief modal form |
| `src/components/brand/version-history.tsx` | Version list + diff view |
| `src/components/brand/corpus-section.tsx` | Corpus list + add + delete |
| `src/components/rules/rules-table.tsx` | Rules table with actions |
| `src/components/rules/rule-form-modal.tsx` | Add/edit rule modal form |
| `src/components/rules/strict-mode-bar.tsx` | Strict mode toggle banner |
| `src/components/rules/rules-kpi-strip.tsx` | KPI cards strip |

### Modify
| File | Change |
|------|--------|
| `src/db/schema/brands.ts` | Add `strictMode` to brands, `changelog` to brandBriefs, make `brandCorpus.embedding` nullable, add `patternType` to antiAiRules |
| `src/db/schema/index.ts` | No change needed (exports already include all brand tables) |
| `src/server/routers/brand.ts` | Add `create` + `toggleStrictMode`, fix `update` null→NOT_FOUND |
| `src/server/routers/rules.ts` | Add `get` + `delete`, fix `update` null→NOT_FOUND, add `patternType` to create input |
| `src/server/routers/_app.ts` | Register `brief` + `corpus` routers |
| `src/lib/logging/index.ts` | Fix `as any` type casts |
| `src/lib/security/scoped-db.ts` | Throw TRPCError instead of generic Error |
| `src/app/(app)/brand/page.tsx` | Replace placeholder with real Brand Brief page |
| `src/app/(app)/rules/page.tsx` | Replace placeholder with real Anti-AI Rules page |

---

## Task 1: Schema changes + migration

**Files:**
- Modify: `src/db/schema/brands.ts`

- [ ] **Step 1: Add `strictMode` column to brands table**

In `src/db/schema/brands.ts`, add after `active` field (line 26):

```typescript
strictMode: boolean("strict_mode").notNull().default(false),
```

- [ ] **Step 2: Add `changelog` column to brandBriefs table**

In `src/db/schema/brands.ts`, add after `editorClerkId` (line 55):

```typescript
changelog: text("changelog"),
```

- [ ] **Step 3: Make `brandCorpus.embedding` nullable**

In `src/db/schema/brands.ts`, change line 75 from:

```typescript
embedding: vector("embedding", { dimensions: 1536 }).notNull(),
```

to:

```typescript
embedding: vector("embedding", { dimensions: 1536 }),
```

- [ ] **Step 4: Add `patternType` column to antiAiRules table**

In `src/db/schema/brands.ts`, add after `action` field (line 99):

```typescript
patternType: text("pattern_type", { enum: ["phrase", "regex"] }).notNull().default("phrase"),
```

- [ ] **Step 5: Apply migration via Supabase MCP**

```sql
ALTER TABLE brands ADD COLUMN strict_mode boolean NOT NULL DEFAULT false;
ALTER TABLE brand_briefs ADD COLUMN changelog text;
ALTER TABLE brand_corpus ALTER COLUMN embedding DROP NOT NULL;
ALTER TABLE anti_ai_rules ADD COLUMN pattern_type text NOT NULL DEFAULT 'phrase';
```

- [ ] **Step 6: Generate Drizzle snapshot**

Run: `pnpm db:generate`

- [ ] **Step 7: Build verify**

Run: `pnpm build`
Expected: Compiled successfully

- [ ] **Step 8: Commit**

```bash
git add src/db/schema/brands.ts drizzle/
git commit -m "feat(phase3): add strictMode, changelog, patternType columns + make corpus embedding nullable"
```

---

## Task 2: Fix production bugs (logging, scopedDb, mutation errors)

**Files:**
- Modify: `src/lib/logging/index.ts`
- Modify: `src/lib/security/scoped-db.ts`
- Modify: `src/server/routers/brand.ts`
- Modify: `src/server/routers/rules.ts`

- [ ] **Step 1: Fix logging `as any` (2 occurrences)**

In `src/lib/logging/index.ts`, replace lines 87-99:

```typescript
error: (msg: string, error?: unknown, meta?: Record<string, unknown>) =>
  log("error", msg, {
    ...meta,
    error: error instanceof Error
      ? {
          code: "code" in error ? String(error.code) : "UNKNOWN",
          message: error.message,
          stack:
            process.env.NODE_ENV === "development"
              ? error.stack
              : undefined,
        }
      : error
        ? { code: "UNKNOWN", message: String(error) }
        : undefined,
  }),
```

Replace lines 101-107:

```typescript
child: (childDefaults: { workspaceId?: string; platform?: string; [key: string]: unknown }) =>
  createLogger({
    traceId,
    workspaceId: childDefaults.workspaceId ?? defaults?.workspaceId,
    platform: childDefaults.platform ?? defaults?.platform,
  }),
```

- [ ] **Step 2: Fix scopedDb to throw TRPCError**

In `src/lib/security/scoped-db.ts`, add import at line 1:

```typescript
import { eq, and, type SQL, type Column } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { db } from "@/db";
```

Replace lines 20-22:

```typescript
if (!workspaceId) {
  throw new TRPCError({
    code: "FORBIDDEN",
    message: "workspaceId is required for scoped database access",
  });
}
```

- [ ] **Step 3: Fix brand.update null → NOT_FOUND**

In `src/server/routers/brand.ts`, replace line 58:

```typescript
return updated ?? null;
```

with:

```typescript
if (!updated) {
  throw new TRPCError({ code: "NOT_FOUND", message: "Brand not found" });
}
return updated;
```

- [ ] **Step 4: Fix rules.update null → NOT_FOUND**

In `src/server/routers/rules.ts`, add TRPCError import at line 1:

```typescript
import { z } from "zod";
import { eq, desc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { protectedProcedure } from "../middleware";
```

Replace line 91:

```typescript
return updated ?? null;
```

with:

```typescript
if (!updated) {
  throw new TRPCError({ code: "NOT_FOUND", message: "Rule not found" });
}
return updated;
```

- [ ] **Step 5: Build verify**

Run: `pnpm build`
Expected: Compiled successfully

- [ ] **Step 6: Commit**

```bash
git add src/lib/logging/index.ts src/lib/security/scoped-db.ts src/server/routers/brand.ts src/server/routers/rules.ts
git commit -m "fix(phase3): type-safe logging, TRPCError in scopedDb, NOT_FOUND in mutations"
```

---

## Task 3: brand.create + brand.toggleStrictMode procedures

**Files:**
- Modify: `src/server/routers/brand.ts`

- [ ] **Step 1: Add brand.create procedure**

Add after the `list` procedure (after line 37):

```typescript
create: protectedProcedure
  .input(z.object({ name: z.string().min(1).max(100) }))
  .mutation(async ({ ctx, input }) => {
    const [brand] = await ctx.scoped.db
      .insert(brands)
      .values({
        workspaceId: ctx.scoped.workspaceId,
        name: input.name,
      })
      .returning();

    return brand;
  }),
```

- [ ] **Step 2: Add brand.toggleStrictMode procedure**

Add after `brand.create`:

```typescript
toggleStrictMode: protectedProcedure
  .input(z.object({ brandId: z.string().uuid() }))
  .mutation(async ({ ctx, input }) => {
    const { db, scopeAnd } = ctx.scoped;

    const [brand] = await db
      .select({ strictMode: brands.strictMode })
      .from(brands)
      .where(scopeAnd(brands.workspaceId, eq(brands.id, input.brandId)))
      .limit(1);

    if (!brand) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Brand not found" });
    }

    const [updated] = await db
      .update(brands)
      .set({ strictMode: !brand.strictMode })
      .where(eq(brands.id, input.brandId))
      .returning({ strictMode: brands.strictMode });

    return updated;
  }),
```

- [ ] **Step 3: Build verify**

Run: `pnpm build`
Expected: Compiled successfully

- [ ] **Step 4: Commit**

```bash
git add src/server/routers/brand.ts
git commit -m "feat(phase3): add brand.create and brand.toggleStrictMode procedures"
```

---

## Task 4: Brief router (create, get, list, diff)

**Files:**
- Create: `src/server/routers/brief.ts`

- [ ] **Step 1: Create brief router**

Create `src/server/routers/brief.ts`:

```typescript
import { z } from "zod";
import { eq, desc, and, max } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { protectedProcedure } from "../middleware";
import { router } from "../trpc";
import { brandBriefs, brands } from "@/db/schema";

export const briefRouter = router({
  create: protectedProcedure
    .input(
      z.object({
        brandId: z.string().uuid(),
        wedge: z.string().min(1),
        icp: z.string().min(1),
        voiceTraits: z.string().min(1),
        antiPositioning: z.string().min(1),
        changelog: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { db, scopeAnd } = ctx.scoped;

      const [brand] = await db
        .select({ id: brands.id })
        .from(brands)
        .where(scopeAnd(brands.workspaceId, eq(brands.id, input.brandId)))
        .limit(1);

      if (!brand) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Brand not found" });
      }

      const [latest] = await db
        .select({ version: brandBriefs.version })
        .from(brandBriefs)
        .where(eq(brandBriefs.brandId, input.brandId))
        .orderBy(desc(brandBriefs.version))
        .limit(1);

      const nextVersion = (latest?.version ?? 0) + 1;

      const [brief] = await db
        .insert(brandBriefs)
        .values({
          brandId: input.brandId,
          version: nextVersion,
          wedge: input.wedge,
          icp: input.icp,
          voiceTraits: input.voiceTraits,
          antiPositioning: input.antiPositioning,
          editorClerkId: ctx.userId,
          changelog: input.changelog,
        })
        .returning();

      return brief;
    }),

  get: protectedProcedure
    .input(
      z.object({
        brandId: z.string().uuid(),
        version: z.number().int().positive().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { db, scopeAnd } = ctx.scoped;

      const [brand] = await db
        .select({ id: brands.id })
        .from(brands)
        .where(scopeAnd(brands.workspaceId, eq(brands.id, input.brandId)))
        .limit(1);

      if (!brand) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Brand not found" });
      }

      const condition = input.version
        ? and(
            eq(brandBriefs.brandId, input.brandId),
            eq(brandBriefs.version, input.version),
          )
        : eq(brandBriefs.brandId, input.brandId);

      const [brief] = await db
        .select()
        .from(brandBriefs)
        .where(condition)
        .orderBy(desc(brandBriefs.version))
        .limit(1);

      return brief ?? null;
    }),

  list: protectedProcedure
    .input(
      z.object({
        brandId: z.string().uuid(),
        limit: z.number().int().min(1).max(50).default(20),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { db, scopeAnd } = ctx.scoped;

      const [brand] = await db
        .select({ id: brands.id })
        .from(brands)
        .where(scopeAnd(brands.workspaceId, eq(brands.id, input.brandId)))
        .limit(1);

      if (!brand) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Brand not found" });
      }

      return db
        .select()
        .from(brandBriefs)
        .where(eq(brandBriefs.brandId, input.brandId))
        .orderBy(desc(brandBriefs.version))
        .limit(input.limit);
    }),

  diff: protectedProcedure
    .input(
      z.object({
        brandId: z.string().uuid(),
        versionA: z.number().int().positive(),
        versionB: z.number().int().positive(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { db, scopeAnd } = ctx.scoped;

      const [brand] = await db
        .select({ id: brands.id })
        .from(brands)
        .where(scopeAnd(brands.workspaceId, eq(brands.id, input.brandId)))
        .limit(1);

      if (!brand) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Brand not found" });
      }

      const briefs = await db
        .select()
        .from(brandBriefs)
        .where(eq(brandBriefs.brandId, input.brandId));

      const a = briefs.find((b) => b.version === input.versionA);
      const b = briefs.find((b) => b.version === input.versionB);

      if (!a || !b) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "One or both brief versions not found",
        });
      }

      return { a, b };
    }),
});
```

- [ ] **Step 2: Build verify**

Run: `pnpm build`
Expected: Compiled successfully

- [ ] **Step 3: Commit**

```bash
git add src/server/routers/brief.ts
git commit -m "feat(phase3): add brief router — versioned create, get, list, diff"
```

---

## Task 5: Corpus router (add, list, delete)

**Files:**
- Create: `src/server/routers/corpus.ts`

- [ ] **Step 1: Create corpus router**

Create `src/server/routers/corpus.ts`:

```typescript
import { z } from "zod";
import { eq, desc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { protectedProcedure } from "../middleware";
import { router } from "../trpc";
import { brandCorpus, brands } from "@/db/schema";

export const corpusRouter = router({
  add: protectedProcedure
    .input(
      z.object({
        brandId: z.string().uuid(),
        content: z.string().min(10).max(50000),
        sourceUrl: z.string().url().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { db, scopeAnd } = ctx.scoped;

      const [brand] = await db
        .select({ id: brands.id })
        .from(brands)
        .where(scopeAnd(brands.workspaceId, eq(brands.id, input.brandId)))
        .limit(1);

      if (!brand) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Brand not found" });
      }

      const [item] = await db
        .insert(brandCorpus)
        .values({
          brandId: input.brandId,
          content: input.content,
          sourceUrl: input.sourceUrl,
        })
        .returning();

      return item;
    }),

  list: protectedProcedure
    .input(z.object({ brandId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { db, scopeAnd } = ctx.scoped;

      const [brand] = await db
        .select({ id: brands.id })
        .from(brands)
        .where(scopeAnd(brands.workspaceId, eq(brands.id, input.brandId)))
        .limit(1);

      if (!brand) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Brand not found" });
      }

      return db
        .select({
          id: brandCorpus.id,
          content: brandCorpus.content,
          sourceUrl: brandCorpus.sourceUrl,
          createdAt: brandCorpus.createdAt,
        })
        .from(brandCorpus)
        .where(eq(brandCorpus.brandId, input.brandId))
        .orderBy(desc(brandCorpus.createdAt));
    }),

  delete: protectedProcedure
    .input(z.object({ corpusItemId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { db } = ctx.scoped;

      const [deleted] = await db
        .delete(brandCorpus)
        .where(eq(brandCorpus.id, input.corpusItemId))
        .returning({ id: brandCorpus.id });

      if (!deleted) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Corpus item not found" });
      }

      return { deleted: true };
    }),
});
```

- [ ] **Step 2: Build verify**

Run: `pnpm build`
Expected: Compiled successfully

- [ ] **Step 3: Commit**

```bash
git add src/server/routers/corpus.ts
git commit -m "feat(phase3): add corpus router — add, list, delete voice samples"
```

---

## Task 6: Rules additions (get, delete, patternType) + app router update

**Files:**
- Modify: `src/server/routers/rules.ts`
- Modify: `src/server/routers/_app.ts`

- [ ] **Step 1: Add patternType to rules.create input**

In `src/server/routers/rules.ts`, add to the create input (after `channelScope`):

```typescript
patternType: z.enum(["phrase", "regex"]).default("phrase"),
```

- [ ] **Step 2: Add rules.get procedure**

Add after `rules.list`:

```typescript
get: protectedProcedure
  .input(z.object({ ruleId: z.string().uuid() }))
  .query(async ({ ctx, input }) => {
    const { db, scopeAnd } = ctx.scoped;

    const [rule] = await db
      .select()
      .from(antiAiRules)
      .where(scopeAnd(antiAiRules.workspaceId, eq(antiAiRules.id, input.ruleId)))
      .limit(1);

    if (!rule) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Rule not found" });
    }

    return rule;
  }),
```

- [ ] **Step 3: Add rules.delete procedure**

Add after `rules.update`:

```typescript
delete: protectedProcedure
  .input(z.object({ ruleId: z.string().uuid() }))
  .mutation(async ({ ctx, input }) => {
    const { db, scopeAnd } = ctx.scoped;

    const [deleted] = await db
      .delete(antiAiRules)
      .where(scopeAnd(antiAiRules.workspaceId, eq(antiAiRules.id, input.ruleId)))
      .returning({ id: antiAiRules.id });

    if (!deleted) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Rule not found" });
    }

    return { deleted: true };
  }),
```

- [ ] **Step 4: Register brief + corpus routers in _app.ts**

Replace `src/server/routers/_app.ts`:

```typescript
import { router } from "../trpc";
import { brandRouter } from "./brand";
import { briefRouter } from "./brief";
import { corpusRouter } from "./corpus";
import { rulesRouter } from "./rules";
import { connectorsRouter } from "./connectors";
import { ideasRouter } from "./ideas";
import { draftsRouter } from "./drafts";
import { scheduleRouter } from "./schedule";
import { auditRouter } from "./audit";

export const appRouter = router({
  brand: brandRouter,
  brief: briefRouter,
  corpus: corpusRouter,
  rules: rulesRouter,
  connectors: connectorsRouter,
  ideas: ideasRouter,
  drafts: draftsRouter,
  schedule: scheduleRouter,
  audit: auditRouter,
});

export type AppRouter = typeof appRouter;
```

- [ ] **Step 5: Build verify**

Run: `pnpm build`
Expected: Compiled successfully

- [ ] **Step 6: Commit**

```bash
git add src/server/routers/rules.ts src/server/routers/_app.ts
git commit -m "feat(phase3): add rules.get, rules.delete, patternType + register brief/corpus routers"
```

---

## Task 7: Seed brand briefs, corpus items, regex rules via Supabase MCP

**Files:** None (data-only via MCP)

- [ ] **Step 1: Seed brand brief v1 for FullFunnel.co**

Use Supabase MCP `execute_sql`:

```sql
INSERT INTO brand_briefs (brand_id, version, wedge, icp, voice_traits, anti_positioning, editor_clerk_id, changelog)
VALUES (
  '90296f8e-912a-428d-a0e8-8f9b80d2becf', 1,
  'We do voice-faithful B2B ghostwriting with anti-AI guardrails — for operators whose credibility takes a hit when their content sounds like everyone else''s.',
  'B2B ops & GTM leaders, 50-500 employees, post personally on LinkedIn 2-5x/week. Pain: their ghostwriter sounds nothing like them; readers can tell.',
  'Direct · skeptical of frameworks · uses specific numbers · contractions · zero em-dashes · short paragraphs · ends with a question or contrarian assertion.',
  'We are not a generic AI writer. We are not a scheduler. We do not optimize for "polish" — we optimize for sounding like you.',
  'user_dev_seed_001',
  'Initial brand brief'
);
```

- [ ] **Step 2: Seed brand brief v2 for FullFunnel.co**

```sql
INSERT INTO brand_briefs (brand_id, version, wedge, icp, voice_traits, anti_positioning, editor_clerk_id, changelog)
VALUES (
  '90296f8e-912a-428d-a0e8-8f9b80d2becf', 2,
  'We do voice-faithful B2B ghostwriting with anti-AI guardrails — for operators whose credibility takes a hit when their content sounds like everyone else''s.',
  'VP/Director of Marketing at B2B SaaS (50-500 employees), focused on pipeline generation. Post personally on LinkedIn 2-5x/week. Pain: their ghostwriter sounds nothing like them.',
  'Direct · skeptical of frameworks · uses specific numbers · contractions · zero em-dashes · short paragraphs · ends with a question or contrarian assertion. Avoid jargon unless audience-specific.',
  'We are not a generic AI writer. We are not a scheduler. We do not optimize for "polish" — we optimize for sounding like you.',
  'user_dev_seed_001',
  'Updated ICP with pipeline focus, added jargon avoidance to voice traits'
);
```

- [ ] **Step 3: Seed 3 corpus items**

```sql
INSERT INTO brand_corpus (brand_id, content, source_url) VALUES
  ('90296f8e-912a-428d-a0e8-8f9b80d2becf',
   'Most ops leaders think tool consolidation saves money. We deleted 11 tools last quarter — three made things worse. Here''s what nobody talks about: the hidden cost isn''t the subscription. It''s the workflow that grew around the tool over 3 years.',
   'https://linkedin.com/posts/neeraj-kumar-001'),
  ('90296f8e-912a-428d-a0e8-8f9b80d2becf',
   'Your ICP doc is fiction. Here''s the 3-signal test we run before writing a single word for a client. Signal 1: Do they talk about the problem in their own words? Signal 2: Have they tried and failed with alternatives? Signal 3: Would they pay for a worse version today?',
   'https://linkedin.com/posts/neeraj-kumar-002'),
  ('90296f8e-912a-428d-a0e8-8f9b80d2becf',
   'We A/B tested 200 hooks. The winner broke every best practice rule in our playbook. No question. No number. No provocation. Just a flat statement of something embarrassing we did.',
   NULL);
```

- [ ] **Step 4: Seed 3 regex-type rules**

```sql
INSERT INTO anti_ai_rules (workspace_id, phrase_or_pattern, category, severity, action, pattern_type, hits_30d, enabled) VALUES
  ('3dc21f67-8c9d-403d-a872-c7e9b719d92d', '\b(leverage|leveraging|leveraged)\b', 'corporate', 'warn', 'rewrite', 'regex', 19, true),
  ('3dc21f67-8c9d-403d-a872-c7e9b719d92d', '\b(utilize|utilizing|utilization)\b', 'corporate', 'warn', 'rewrite', 'regex', 7, true),
  ('3dc21f67-8c9d-403d-a872-c7e9b719d92d', '\bin order to\b', 'filler', 'suggest', 'flag', 'regex', 5, true);
```

- [ ] **Step 5: Verify seed data counts**

```sql
SELECT 'briefs' as tbl, count(*) FROM brand_briefs
UNION ALL SELECT 'corpus', count(*) FROM brand_corpus
UNION ALL SELECT 'regex_rules', count(*) FROM anti_ai_rules WHERE pattern_type = 'regex';
```

Expected: briefs=2, corpus=3, regex_rules=3

---

## Task 8: Brand Brief page — layout + brief display

**Files:**
- Create: `src/components/brand/brief-cards.tsx`
- Modify: `src/app/(app)/brand/page.tsx`

- [ ] **Step 1: Create BriefCards component**

Create `src/components/brand/brief-cards.tsx`:

```tsx
"use client";

interface BriefField {
  label: string;
  body: string;
  meta: string;
}

export function BriefCards({ fields }: { fields: BriefField[] }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {fields.map((f) => (
        <div key={f.label} className="card" style={{ padding: 16 }}>
          <div className="eyebrow" style={{ fontSize: 9.5, marginBottom: 6 }}>
            {f.label}
          </div>
          <div
            style={{
              fontSize: 13.5,
              lineHeight: 1.55,
              color: "var(--ink-primary)",
            }}
          >
            {f.body}
          </div>
          <div
            style={{
              fontSize: 10.5,
              color: "var(--ink-tertiary)",
              marginTop: 10,
              paddingTop: 8,
              borderTop: "1px dashed var(--border-subtle)",
            }}
          >
            {f.meta}
          </div>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Create Brand Brief page shell**

Replace `src/app/(app)/brand/page.tsx`:

```tsx
"use client";

import { useState } from "react";
import { BriefCards } from "@/components/brand/brief-cards";

const DEMO_BRAND_ID = "90296f8e-912a-428d-a0e8-8f9b80d2becf";

export default function BrandBriefPage() {
  const [tab, setTab] = useState<"current" | "history" | "diff">("current");

  // TODO: Replace with trpc.brand.get + trpc.brief.get when Clerk auth is wired
  const brief = {
    version: 2,
    wedge:
      'We do voice-faithful B2B ghostwriting with anti-AI guardrails — for operators whose credibility takes a hit when their content sounds like everyone else\'s.',
    icp: 'VP/Director of Marketing at B2B SaaS (50-500 employees), focused on pipeline generation. Post personally on LinkedIn 2-5x/week.',
    voiceTraits:
      'Direct · skeptical of frameworks · uses specific numbers · contractions · zero em-dashes · short paragraphs · ends with a question or contrarian assertion.',
    antiPositioning:
      'We are not a generic AI writer. We are not a scheduler. We do not optimize for "polish" — we optimize for sounding like you.',
  };

  const tabs = [
    { key: "current" as const, label: `Current · v${brief.version}` },
    { key: "history" as const, label: "Version history" },
    { key: "diff" as const, label: `Diff vs v${brief.version - 1}` },
  ];

  const fields = [
    { label: "WEDGE", body: brief.wedge, meta: "Last edited · 4 days ago by Neeraj" },
    { label: "ICP", body: brief.icp, meta: "Embedded → vector store · 1,536 dims" },
    { label: "VOICE TRAITS", body: brief.voiceTraits, meta: "7 traits · cosine centroid recomputed nightly" },
    { label: "ANTI-POSITIONING", body: brief.antiPositioning, meta: "Used as negative prompt context" },
  ];

  return (
    <div className="fade-in" style={{ height: "100%", overflow: "auto" }}>
      <div
        style={{
          padding: "20px 28px 8px",
          borderBottom: "1px solid var(--border-subtle)",
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 24,
          position: "sticky",
          top: 0,
          background: "var(--bg-canvas)",
          zIndex: 5,
        }}
      >
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 600, margin: 0, letterSpacing: "-0.012em" }}>
            Brand brief
          </h1>
          <p style={{ fontSize: 12.5, color: "var(--ink-secondary)", margin: "3px 0 12px", maxWidth: 720 }}>
            The single source of truth that feeds every prompt. Versioned, diff-able, embedded into voice scoring.
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, paddingTop: 2 }}>
          <button className="btn ghost sm">View history</button>
          <button className="btn primary sm">Edit brief</button>
        </div>
      </div>

      <div style={{ padding: "20px 28px 32px" }}>
        <div style={{ display: "flex", gap: 4, marginBottom: 16, borderBottom: "1px solid var(--border-subtle)" }}>
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className="btn ghost sm"
              style={{
                borderRadius: 0,
                borderBottom: tab === t.key ? "2px solid var(--accent)" : "2px solid transparent",
                color: tab === t.key ? "var(--accent)" : "var(--ink-secondary)",
                padding: "8px 12px",
                fontWeight: tab === t.key ? 600 : 500,
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 20 }}>
          <BriefCards fields={fields} />

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div className="card" style={{ padding: 14 }}>
              <div className="eyebrow" style={{ fontSize: 9.5, marginBottom: 8 }}>VOICE FIDELITY</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 6 }}>
                <span className="tabular" style={{ fontSize: 28, fontWeight: 600, fontFamily: "Montserrat" }}>
                  0.91
                </span>
                <span style={{ fontSize: 11, color: "var(--good)" }}>↑ 0.04 vs last brief</span>
              </div>
              <div style={{ fontSize: 10.5, color: "var(--ink-tertiary)", marginTop: 8 }}>
                Cosine vs 247-post corpus · last 7 drafts
              </div>
            </div>

            <div className="card" style={{ padding: 14 }}>
              <div className="eyebrow" style={{ fontSize: 9.5, marginBottom: 8 }}>FED INTO</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12 }}>
                {[
                  ["Hook generator", "POST /v1/drafts/hook"],
                  ["Body draft", "POST /v1/drafts/body"],
                  ["Voice scorer", "POST /v1/drafts/score"],
                  ["Anti-AI rules", "POST /v1/drafts/audit"],
                  ["Idea ranker", "POST /v1/ideas/rank"],
                ].map(([name, endpoint]) => (
                  <div
                    key={name}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "5px 0",
                      borderBottom: "1px dashed var(--border-subtle)",
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 500 }}>{name}</div>
                      <div className="mono" style={{ fontSize: 9.5, color: "var(--ink-tertiary)" }}>
                        {endpoint}
                      </div>
                    </div>
                    <span className="pill good">active</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="card" style={{ padding: 14, background: "var(--bg-muted)" }}>
              <div className="eyebrow" style={{ fontSize: 9.5, marginBottom: 8 }}>VERSIONING</div>
              <div style={{ fontSize: 11.5, lineHeight: 1.7, color: "var(--ink-secondary)" }}>
                <div>v2 · 2026-05-11 · Neeraj · Updated ICP with pipeline focus</div>
                <div>v1 · 2026-05-11 · Neeraj · Initial brand brief</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Build verify**

Run: `pnpm build`
Expected: Compiled successfully

- [ ] **Step 4: Commit**

```bash
git add src/components/brand/brief-cards.tsx src/app/\(app\)/brand/page.tsx
git commit -m "feat(phase3): add Brand Brief page with brief display, voice fidelity, versioning"
```

---

## Task 9: Anti-AI Rules page

**Files:**
- Modify: `src/app/(app)/rules/page.tsx`

- [ ] **Step 1: Replace Anti-AI Rules placeholder**

Replace `src/app/(app)/rules/page.tsx`:

```tsx
"use client";

import { useState } from "react";

const DEMO_RULES = [
  { id: "1", phrase: 'em-dash (—)', cat: "punctuation", action: "block", hits: 47, severity: "block", patternType: "phrase", enabled: true },
  { id: "2", phrase: "Furthermore", cat: "transition", action: "block", hits: 23, severity: "block", patternType: "phrase", enabled: true },
  { id: "3", phrase: "In conclusion", cat: "transition", action: "block", hits: 18, severity: "block", patternType: "phrase", enabled: true },
  { id: "4", phrase: "It is important to note", cat: "filler", action: "block", hits: 31, severity: "warn", patternType: "phrase", enabled: true },
  { id: "5", phrase: "leverage", cat: "corporate", action: "rewrite", hits: 12, severity: "warn", patternType: "phrase", enabled: true },
  { id: "6", phrase: "synergy", cat: "corporate", action: "block", hits: 4, severity: "block", patternType: "phrase", enabled: true },
  { id: "7", phrase: "unlock", cat: "cliche", action: "flag", hits: 38, severity: "suggest", patternType: "phrase", enabled: true },
  { id: "8", phrase: "\\b(leverage|leveraging)\\b", cat: "corporate", action: "rewrite", hits: 19, severity: "warn", patternType: "regex", enabled: true },
  { id: "9", phrase: "\\b(utilize|utilizing)\\b", cat: "corporate", action: "rewrite", hits: 7, severity: "warn", patternType: "regex", enabled: true },
  { id: "10", phrase: "\\bin order to\\b", cat: "filler", action: "flag", hits: 5, severity: "suggest", patternType: "regex", enabled: true },
];

export default function AntiAIRulesPage() {
  const [strict, setStrict] = useState(true);
  const rules = DEMO_RULES;

  const phraseCount = rules.filter((r) => r.patternType === "phrase").length;
  const regexCount = rules.filter((r) => r.patternType === "regex").length;
  const totalHits = rules.reduce((sum, r) => sum + r.hits, 0);

  const actionColor = (action: string) =>
    action === "block" ? "bad" : action === "rewrite" ? "mid" : "neutral";

  const severityLabel = (sev: string) =>
    sev === "block" ? "high" : sev === "warn" ? "mid" : "low";

  const severityColor = (sev: string) =>
    sev === "block" ? "bad" : sev === "warn" ? "mid" : "neutral";

  return (
    <div className="fade-in" style={{ height: "100%", overflow: "auto" }}>
      <div
        style={{
          padding: "20px 28px 8px",
          borderBottom: "1px solid var(--border-subtle)",
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 24,
          position: "sticky",
          top: 0,
          background: "var(--bg-canvas)",
          zIndex: 5,
        }}
      >
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 600, margin: 0, letterSpacing: "-0.012em" }}>
            Anti-AI rules
          </h1>
          <p style={{ fontSize: 12.5, color: "var(--ink-secondary)", margin: "3px 0 12px", maxWidth: 720 }}>
            Deterministic regex + phrase matching. Runs before scoring, blocks publish if strict mode is on.
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, paddingTop: 2 }}>
          <button className="btn ghost sm">Import preset</button>
          <button className="btn primary sm">+ Add rule</button>
        </div>
      </div>

      <div style={{ padding: "20px 28px 32px" }}>
        {/* KPI strip */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 18 }}>
          {[
            { l: "Strict mode", v: strict ? "ON" : "OFF", sub: "Per-brand enforcement", tone: strict ? "good" : "bad" },
            { l: "Active rules", v: String(rules.length), sub: `${phraseCount} phrase · ${regexCount} regex`, tone: "neutral" },
            { l: "Catches last 30d", v: String(totalHits), sub: `Avg ${(totalHits / 50).toFixed(1)} / draft`, tone: "neutral" },
            { l: "Categories", v: "6", sub: "punctuation · transition · filler · corporate · cliché · custom", tone: "neutral" },
          ].map((k) => (
            <div key={k.l} className="card" style={{ padding: 12 }}>
              <div className="eyebrow" style={{ fontSize: 9.5 }}>{k.l}</div>
              <div
                className="tabular"
                style={{
                  fontSize: 22,
                  fontWeight: 600,
                  fontFamily: "Montserrat",
                  marginTop: 4,
                  color: k.tone === "bad" ? "var(--danger)" : k.tone === "good" ? "var(--good)" : "var(--ink-primary)",
                }}
              >
                {k.v}
              </div>
              <div style={{ fontSize: 10.5, color: "var(--ink-tertiary)", marginTop: 2 }}>{k.sub}</div>
            </div>
          ))}
        </div>

        {/* Strict mode toggle */}
        <div
          className="card"
          style={{
            padding: 12,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 14,
            background: strict ? "var(--accent-soft)" : "var(--bg-surface)",
            borderColor: strict ? "var(--accent)" : "var(--border-subtle)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 18, color: strict ? "var(--accent)" : "var(--ink-tertiary)" }}>🛡</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>Strict mode {strict ? "enabled" : "disabled"}</div>
              <div style={{ fontSize: 11, color: "var(--ink-secondary)" }}>
                {strict
                  ? "Drafts with violations cannot be published. Rewrite suggestions surface inline."
                  : "Violations are flagged but publish is allowed."}
              </div>
            </div>
          </div>
          <button className="btn ghost sm" onClick={() => setStrict(!strict)}>
            {strict ? "Disable" : "Enable"}
          </button>
        </div>

        {/* Rules table */}
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ background: "var(--bg-muted)", borderBottom: "1px solid var(--border-subtle)" }}>
                {["Phrase / pattern", "Category", "Type", "Action", "Hits 30d", "Severity", ""].map((h) => (
                  <th
                    key={h}
                    className="eyebrow"
                    style={{ fontSize: 9.5, padding: "8px 12px", textAlign: "left", fontWeight: 600 }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rules.map((r) => (
                <tr key={r.id} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                  <td style={{ padding: "8px 12px" }}>
                    <span className="mono" style={{ fontSize: 11.5 }}>
                      {r.patternType === "regex" ? r.phrase : `"${r.phrase}"`}
                    </span>
                  </td>
                  <td style={{ padding: "8px 12px", color: "var(--ink-secondary)" }}>{r.cat}</td>
                  <td style={{ padding: "8px 12px" }}>
                    <span className={`pill ${r.patternType === "regex" ? "accent" : "neutral"}`}>
                      {r.patternType}
                    </span>
                  </td>
                  <td style={{ padding: "8px 12px" }}>
                    <span className={`pill ${actionColor(r.action)}`}>{r.action}</span>
                  </td>
                  <td style={{ padding: "8px 12px" }} className="tabular mono">
                    {r.hits}
                  </td>
                  <td style={{ padding: "8px 12px" }}>
                    <span className={`pill ${severityColor(r.severity)}`}>{severityLabel(r.severity)}</span>
                  </td>
                  <td style={{ padding: "8px 12px", textAlign: "right" }}>
                    <button className="btn ghost sm">···</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Build verify**

Run: `pnpm build`
Expected: Compiled successfully

- [ ] **Step 3: Commit**

```bash
git add src/app/\(app\)/rules/page.tsx
git commit -m "feat(phase3): add Anti-AI Rules page with KPI strip, strict mode toggle, rules table"
```

---

## Task 10: Build verify + tracking updates + push

**Files:**
- Modify: `ultra-plan/PROGRESS.md`, `ultra-plan/CHANGELOG.md`, `ultra-plan/QA-RESULTS.md`, `ultra-plan/DEPENDENCY-MAP.md`

- [ ] **Step 1: Final build verify**

Run: `pnpm build`
Expected: Compiled successfully, all pages generated

- [ ] **Step 2: Start dev server and verify pages render**

Run: `pnpm dev`
Check: `http://localhost:3000/brand` renders Brand Brief page
Check: `http://localhost:3000/rules` renders Anti-AI Rules page

- [ ] **Step 3: Update PROGRESS.md**

Mark Phase 3 tasks done. Update Quick Status table: Phase 3 = DONE.

- [ ] **Step 4: Update CHANGELOG.md**

Add Phase 3 entries: schema changes, bug fixes, new routers, UI pages, seed data.

- [ ] **Step 5: Update QA-RESULTS.md**

Add Phase 3 build results for each task.

- [ ] **Step 6: Update DEPENDENCY-MAP.md**

Add: `src/server/routers/brief.ts`, `src/server/routers/corpus.ts`, component files.

- [ ] **Step 7: Commit tracking + push**

```bash
git add ultra-plan/ CLAUDE.md
git commit -m "docs(phase3): update tracking files for Phase 3 completion"
git push -u origin phase-3/brand-brief-rules
```

- [ ] **Step 8: Create PR**

```bash
gh pr create --base main --head phase-3/brand-brief-rules --title "Phase 3: Brand Brief + Anti-AI Rules" --body "..."
```
