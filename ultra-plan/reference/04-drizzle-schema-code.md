# Drizzle ORM Schema — Content Intelligence Platform

## Research Summary

### API Confirmed (drizzle-orm ^0.45.2, drizzle-kit ^0.31.10)

**Imports** — all from `drizzle-orm/pg-core`:
- `pgTable`, `pgEnum`
- Column types: `uuid`, `text`, `integer`, `boolean`, `timestamp`, `jsonb`, `varchar`, `serial`, `numeric`, `vector`
- Constraints: `unique`, `check`, `index`, `uniqueIndex`, `foreignKey`, `primaryKey`
- From `drizzle-orm`: `sql`, `relations` (v1) or `defineRelations` (v2)

**Column API**:
- `uuid().defaultRandom().primaryKey()` — UUID with gen_random_uuid()
- `text('col_name').notNull()` — basic text
- `text('col_name').array()` — PostgreSQL text[] array
- `integer('col_name').default(0)` — integer with default
- `boolean('col_name').default(true)` — boolean
- `numeric({ precision: 5, scale: 2 })` — exact decimal (returns string by default, use `mode: 'number'` for JS number)
- `timestamp('col_name', { withTimezone: true }).defaultNow()` — timestamptz
- `timestamp('col_name').$onUpdate(() => new Date())` — auto-update
- `jsonb('col_name').$type<SomeType>()` — typed JSONB
- `vector('col_name', { dimensions: 1536 })` — pgvector
- `.references(() => otherTable.id, { onDelete: 'cascade' })` — FK with action

**Enum API**: `pgEnum('name', ['val1', 'val2'])` returns a function you call as a column

**Index callback** (third arg to pgTable): `(table) => [...]` returns array of index/unique/check/foreignKey

**pgvector index**: `index('name').using('hnsw', table.embedding.op('vector_cosine_ops'))`

**Check constraint**: `check('name', sql\`${table.col} > 0\`)`

**Composite unique**: `unique('name').on(t.col1, t.col2)`

**Partial index**: `index('name').on(table.col).where(sql\`condition\`)`

---

## File Structure

```
src/db/schema/
  enums.ts           — all pgEnum definitions
  workspaces.ts      — workspaces, members, feature_flags
  brands.ts          — brands, brand_briefs, brand_corpus, anti_ai_rules
  connectors.ts      — connectors, oauth_credentials
  signals.ts         — signals, ideas
  content.ts         — drafts, draft_grades, draft_anti_ai_hits
  publishing.ts      — schedules, posts, post_results
  ai.ts              — prompts, model_routes, ai_calls, model_pricing
  ops.ts             — audit_log, exports, rate_limit_windows, webhook_deliveries, dead_letter_queue, contract_test_results
  index.ts           — barrel re-export
```

---

## Complete Schema Code

### `src/db/schema/enums.ts`

```typescript
import { pgEnum } from "drizzle-orm/pg-core";

// ── Content lifecycle ──────────────────────────────────────────────
export const postStatusEnum = pgEnum("post_status", [
  "draft",
  "graded",
  "approved",
  "scheduled",
  "publishing",
  "live",
  "failed",
]);

// ── Anti-AI rule severity ──────────────────────────────────────────
export const severityEnum = pgEnum("severity", [
  "block",
  "warn",
  "suggest",
  "log",
]);

// ── Connector health ──────────────────────────────────────────────
export const connectorStateEnum = pgEnum("connector_state", [
  "healthy",
  "reconnect",
  "paste",
  "disconnected",
]);

// ── Platform tier ──────────────────────────────────────────────────
export const tierEnum = pgEnum("tier", ["tier1", "tier2", "tier3"]);

// ── Workspace member role ──────────────────────────────────────────
export const memberRoleEnum = pgEnum("member_role", [
  "owner",
  "admin",
  "editor",
  "approver",
  "viewer",
]);

// ── Signal origin ──────────────────────────────────────────────────
export const signalSourceEnum = pgEnum("signal_source", [
  "rss",
  "reddit",
  "linkedin",
  "twitter",
  "apify",
  "manual",
  "competitor",
  "thought_leader",
]);

// ── Anti-AI rule category ──────────────────────────────────────────
export const ruleCategoryEnum = pgEnum("rule_category", [
  "punctuation",
  "transition",
  "filler",
  "corporate",
  "cliche",
  "custom",
]);

// ── AI task type ───────────────────────────────────────────────────
export const aiTaskTypeEnum = pgEnum("ai_task_type", [
  "hook",
  "body",
  "voice_score",
  "anti_ai_audit",
  "idea_rank",
  "embedding",
  "rerank",
]);

// ── Data export format ─────────────────────────────────────────────
export const exportFormatEnum = pgEnum("export_format", [
  "json",
  "csv",
  "sql",
]);

// ── Data export status ─────────────────────────────────────────────
export const exportStatusEnum = pgEnum("export_status", [
  "pending",
  "processing",
  "completed",
  "failed",
]);
```

### `src/db/schema/workspaces.ts`

```typescript
import { sql } from "drizzle-orm";
import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
  index,
  unique,
} from "drizzle-orm/pg-core";
import { memberRoleEnum } from "./enums";

// ── Workspaces ─────────────────────────────────────────────────────
export const workspaces = pgTable("workspaces", {
  id: uuid("id").defaultRandom().primaryKey(),
  clerkOrgId: text("clerk_org_id").notNull().unique(),
  name: text("name").notNull(),
  plan: text("plan", { enum: ["creator", "team", "agency"] })
    .notNull()
    .default("creator"),
  monthlyAiBudgetCents: integer("monthly_ai_budget_cents")
    .notNull()
    .default(0),
  currentMonthSpendCents: integer("current_month_spend_cents")
    .notNull()
    .default(0),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

// ── Members ────────────────────────────────────────────────────────
export const members = pgTable(
  "members",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    clerkUserId: text("clerk_user_id").notNull(),
    email: text("email").notNull(),
    name: text("name").notNull(),
    role: memberRoleEnum("role").notNull().default("viewer"),
    brandAccess: text("brand_access").array(), // null = all brands
    lastActiveAt: timestamp("last_active_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    unique("members_workspace_clerk_user").on(t.workspaceId, t.clerkUserId),
    index("members_workspace_idx").on(t.workspaceId),
    index("members_clerk_user_idx").on(t.clerkUserId),
  ],
);

// ── Feature flags ──────────────────────────────────────────────────
export const featureFlags = pgTable(
  "feature_flags",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    key: text("key").notNull(),
    scope: text("scope", { enum: ["global", "workspace", "brand"] })
      .notNull()
      .default("global"),
    scopeId: text("scope_id"), // null for global scope
    enabled: boolean("enabled").notNull().default(true),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    unique("feature_flags_key_scope").on(t.key, t.scope, t.scopeId),
    index("feature_flags_key_idx").on(t.key),
  ],
);
```

### `src/db/schema/brands.ts`

```typescript
import { sql } from "drizzle-orm";
import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  numeric,
  timestamp,
  index,
  vector,
  check,
} from "drizzle-orm/pg-core";
import { workspaces } from "./workspaces";
import { severityEnum, ruleCategoryEnum } from "./enums";

// ── Brands ─────────────────────────────────────────────────────────
export const brands = pgTable(
  "brands",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    voiceScore: numeric("voice_score", { precision: 5, scale: 2 }),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index("brands_workspace_idx").on(t.workspaceId),
    index("brands_active_idx")
      .on(t.workspaceId, t.active)
      .where(sql`${t.active} = true`),
  ],
);

// ── Brand briefs (immutable versions) ──────────────────────────────
export const brandBriefs = pgTable(
  "brand_briefs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    brandId: uuid("brand_id")
      .notNull()
      .references(() => brands.id, { onDelete: "cascade" }),
    version: integer("version").notNull(),
    wedge: text("wedge").notNull(),
    icp: text("icp").notNull(),
    voiceTraits: text("voice_traits").notNull(),
    antiPositioning: text("anti_positioning").notNull(),
    editorClerkId: text("editor_clerk_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    // NEVER update — always insert new version
  },
  (t) => [
    unique("brand_briefs_brand_version").on(t.brandId, t.version),
    index("brand_briefs_brand_idx").on(t.brandId),
  ],
);

// ── Brand corpus (embeddings) ──────────────────────────────────────
export const brandCorpus = pgTable(
  "brand_corpus",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    brandId: uuid("brand_id")
      .notNull()
      .references(() => brands.id, { onDelete: "cascade" }),
    content: text("content").notNull(),
    sourceUrl: text("source_url"),
    embedding: vector("embedding", { dimensions: 1536 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    index("brand_corpus_brand_idx").on(t.brandId),
    index("brand_corpus_embedding_idx").using(
      "hnsw",
      t.embedding.op("vector_cosine_ops"),
    ),
  ],
);

// ── Anti-AI rules ──────────────────────────────────────────────────
export const antiAiRules = pgTable(
  "anti_ai_rules",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    phraseOrPattern: text("phrase_or_pattern").notNull(),
    category: ruleCategoryEnum("category").notNull(),
    severity: severityEnum("severity").notNull(),
    action: text("action", { enum: ["block", "rewrite", "flag"] }).notNull(),
    channelScope: text("channel_scope").array(), // null = all channels
    hits30d: integer("hits_30d").notNull().default(0),
    lastTrippedAt: timestamp("last_tripped_at", { withTimezone: true }),
    enabled: boolean("enabled").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index("anti_ai_rules_workspace_idx").on(t.workspaceId),
    index("anti_ai_rules_enabled_idx")
      .on(t.workspaceId, t.enabled)
      .where(sql`${t.enabled} = true`),
  ],
);
```

### `src/db/schema/connectors.ts`

```typescript
import { sql } from "drizzle-orm";
import {
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
  jsonb,
  index,
  unique,
} from "drizzle-orm/pg-core";
import { workspaces } from "./workspaces";
import { connectorStateEnum, tierEnum } from "./enums";

// ── Connectors ─────────────────────────────────────────────────────
export const connectors = pgTable(
  "connectors",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    platform: text("platform", {
      enum: [
        "linkedin",
        "x",
        "facebook",
        "instagram",
        "threads",
        "youtube",
        "tiktok",
        "reddit",
        "pinterest",
        "bluesky",
        "beehiiv",
        "substack",
        "hubspot",
        "medium",
        "mastodon",
      ],
    }).notNull(),
    tier: tierEnum("tier").notNull(),
    state: connectorStateEnum("state").notNull().default("disconnected"),
    accountName: text("account_name").notNull(),
    lastPostAt: timestamp("last_post_at", { withTimezone: true }),
    lastHealthCheckAt: timestamp("last_health_check_at", {
      withTimezone: true,
    }),
    config: jsonb("config")
      .notNull()
      .default(sql`'{}'::jsonb`)
      .$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index("connectors_workspace_idx").on(t.workspaceId),
    index("connectors_platform_idx").on(t.workspaceId, t.platform),
    index("connectors_state_idx")
      .on(t.workspaceId, t.state)
      .where(sql`${t.state} != 'disconnected'`),
  ],
);

// ── OAuth credentials (1:1 with connector) ─────────────────────────
export const oauthCredentials = pgTable(
  "oauth_credentials",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    connectorId: uuid("connector_id")
      .notNull()
      .unique()
      .references(() => connectors.id, { onDelete: "cascade" }),
    encryptedAccessToken: text("encrypted_access_token").notNull(),
    encryptedRefreshToken: text("encrypted_refresh_token"),
    tokenIv: text("token_iv").notNull(),
    tokenTag: text("token_tag").notNull(),
    scopes: text("scopes").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    refreshExpiresAt: timestamp("refresh_expires_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (t) => [index("oauth_credentials_connector_idx").on(t.connectorId)],
);

// ── Contract test results ──────────────────────────────────────────
export const contractTestResults = pgTable(
  "contract_test_results",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    connectorId: uuid("connector_id")
      .notNull()
      .references(() => connectors.id, { onDelete: "cascade" }),
    testName: text("test_name").notNull(),
    passed: boolean("passed").notNull(),
    errorMessage: text("error_message"),
    latencyMs: integer("latency_ms"),
    runAt: timestamp("run_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("contract_test_results_connector_idx").on(t.connectorId),
    index("contract_test_results_run_at_idx").on(t.connectorId, t.runAt),
  ],
);
```

### `src/db/schema/signals.ts`

```typescript
import { sql } from "drizzle-orm";
import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  numeric,
  timestamp,
  jsonb,
  index,
  vector,
  check,
} from "drizzle-orm/pg-core";
import { workspaces } from "./workspaces";
import { brands } from "./brands";
import { signalSourceEnum } from "./enums";

// ── Signals ────────────────────────────────────────────────────────
export const signals = pgTable(
  "signals",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    source: signalSourceEnum("source").notNull(),
    sourceUrl: text("source_url"),
    title: text("title").notNull(),
    body: text("body").notNull(),
    metadata: jsonb("metadata")
      .notNull()
      .default(sql`'{}'::jsonb`)
      .$type<Record<string, unknown>>(),
    embedding: vector("embedding", { dimensions: 1536 }),
    processed: boolean("processed").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    index("signals_workspace_idx").on(t.workspaceId),
    index("signals_source_idx").on(t.workspaceId, t.source),
    index("signals_unprocessed_idx")
      .on(t.workspaceId, t.processed)
      .where(sql`${t.processed} = false`),
    index("signals_embedding_idx").using(
      "hnsw",
      t.embedding.op("vector_cosine_ops"),
    ),
  ],
);

// ── Ideas ──────────────────────────────────────────────────────────
export const ideas = pgTable(
  "ideas",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    brandId: uuid("brand_id")
      .notNull()
      .references(() => brands.id, { onDelete: "cascade" }),
    signalId: uuid("signal_id").references(() => signals.id, {
      onDelete: "set null",
    }),
    hook: text("hook").notNull(),
    angle: text("angle").notNull(),
    sourceKind: text("source_kind").notNull(),
    sourceLabel: text("source_label").notNull(),
    sourceCitation: text("source_citation"),
    sourceUrl: text("source_url"),
    icpFit: numeric("icp_fit", { precision: 5, scale: 2 }).notNull(),
    hotScore: integer("hot_score").notNull().default(0),
    freshness: text("freshness").notNull(),
    formats: text("formats").array().notNull(),
    tags: text("tags").array().notNull(),
    dedupScore: numeric("dedup_score", { precision: 5, scale: 4 }),
    dedupPriorId: uuid("dedup_prior_id"),
    score: numeric("score", { precision: 5, scale: 2 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    check("ideas_hot_score_range", sql`${t.hotScore} >= 0 AND ${t.hotScore} <= 100`),
    index("ideas_workspace_idx").on(t.workspaceId),
    index("ideas_brand_idx").on(t.brandId),
    index("ideas_score_idx").on(t.workspaceId, t.score),
    index("ideas_hot_score_idx").on(t.workspaceId, t.hotScore),
  ],
);
```

### `src/db/schema/content.ts`

```typescript
import { sql } from "drizzle-orm";
import {
  pgTable,
  uuid,
  text,
  integer,
  numeric,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { workspaces } from "./workspaces";
import { brands } from "./brands";
import { antiAiRules } from "./brands";
import { ideas } from "./signals";
import { postStatusEnum, severityEnum } from "./enums";

// ── Drafts ─────────────────────────────────────────────────────────
export const drafts = pgTable(
  "drafts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    brandId: uuid("brand_id")
      .notNull()
      .references(() => brands.id, { onDelete: "cascade" }),
    ideaId: uuid("idea_id").references(() => ideas.id, {
      onDelete: "set null",
    }),
    title: text("title"),
    content: text("content").notNull(),
    status: postStatusEnum("status").notNull().default("draft"),
    channel: text("channel").notNull(),
    version: integer("version").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index("drafts_workspace_idx").on(t.workspaceId),
    index("drafts_brand_idx").on(t.brandId),
    index("drafts_status_idx").on(t.workspaceId, t.status),
    index("drafts_channel_idx").on(t.workspaceId, t.channel),
  ],
);

// ── Draft grades ───────────────────────────────────────────────────
export const draftGrades = pgTable(
  "draft_grades",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    draftId: uuid("draft_id")
      .notNull()
      .references(() => drafts.id, { onDelete: "cascade" }),
    hook: numeric("hook", { precision: 5, scale: 2 }).notNull(),
    voice: numeric("voice", { precision: 5, scale: 2 }).notNull(),
    evidence: numeric("evidence", { precision: 5, scale: 2 }).notNull(),
    formatFit: numeric("format_fit", { precision: 5, scale: 2 }).notNull(),
    controversy: numeric("controversy", { precision: 5, scale: 2 }).notNull(),
    specificity: numeric("specificity", { precision: 5, scale: 2 }).notNull(),
    cta: numeric("cta", { precision: 5, scale: 2 }).notNull(),
    composite: numeric("composite", { precision: 5, scale: 2 }).notNull(),
    gradedByModel: text("graded_by_model").notNull(),
    gradedAt: timestamp("graded_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    index("draft_grades_draft_idx").on(t.draftId),
  ],
);

// ── Draft anti-AI hits ─────────────────────────────────────────────
export const draftAntiAiHits = pgTable(
  "draft_anti_ai_hits",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    draftId: uuid("draft_id")
      .notNull()
      .references(() => drafts.id, { onDelete: "cascade" }),
    ruleId: uuid("rule_id")
      .notNull()
      .references(() => antiAiRules.id, { onDelete: "cascade" }),
    matchedText: text("matched_text").notNull(),
    severity: severityEnum("severity").notNull(),
    outcome: text("outcome", {
      enum: ["blocked", "rewritten", "flagged", "logged"],
    }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    index("draft_anti_ai_hits_draft_idx").on(t.draftId),
    index("draft_anti_ai_hits_rule_idx").on(t.ruleId),
  ],
);
```

### `src/db/schema/publishing.ts`

```typescript
import { sql } from "drizzle-orm";
import {
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { workspaces } from "./workspaces";
import { drafts } from "./content";
import { postStatusEnum } from "./enums";

// ── Schedules ──────────────────────────────────────────────────────
export const schedules = pgTable(
  "schedules",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    draftId: uuid("draft_id")
      .notNull()
      .references(() => drafts.id, { onDelete: "cascade" }),
    channel: text("channel").notNull(),
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }).notNull(),
    timezone: text("timezone").notNull().default("UTC"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index("schedules_workspace_idx").on(t.workspaceId),
    index("schedules_draft_idx").on(t.draftId),
    index("schedules_scheduled_at_idx").on(t.scheduledAt),
  ],
);

// ── Posts ───────────────────────────────────────────────────────────
export const posts = pgTable(
  "posts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    draftId: uuid("draft_id")
      .notNull()
      .references(() => drafts.id, { onDelete: "cascade" }),
    channel: text("channel").notNull(),
    idempotencyKey: text("idempotency_key").notNull().unique(),
    status: postStatusEnum("status").notNull().default("draft"),
    platformPostId: text("platform_post_id"),
    platformPostUrl: text("platform_post_url"),
    fallbackContent: text("fallback_content"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index("posts_workspace_idx").on(t.workspaceId),
    index("posts_draft_idx").on(t.draftId),
    index("posts_status_idx").on(t.workspaceId, t.status),
    index("posts_channel_idx").on(t.workspaceId, t.channel),
  ],
);

// ── Post results ───────────────────────────────────────────────────
export const postResults = pgTable(
  "post_results",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    postId: uuid("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    channel: text("channel").notNull(),
    status: text("status", {
      enum: ["success", "failed", "skipped"],
    }).notNull(),
    errorCode: text("error_code"),
    errorMessage: text("error_message"),
    platformResponse: jsonb("platform_response").$type<Record<string, unknown>>(),
    latencyMs: integer("latency_ms"),
    costCents: integer("cost_cents"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    index("post_results_post_idx").on(t.postId),
    index("post_results_status_idx").on(t.postId, t.status),
  ],
);
```

### `src/db/schema/ai.ts`

```typescript
import { sql } from "drizzle-orm";
import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  numeric,
  timestamp,
  jsonb,
  index,
  unique,
} from "drizzle-orm/pg-core";
import { workspaces } from "./workspaces";
import { brands } from "./brands";
import { drafts } from "./content";
import { aiTaskTypeEnum } from "./enums";

// ── Prompts ────────────────────────────────────────────────────────
export const prompts = pgTable(
  "prompts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    systemPrompt: text("system_prompt").notNull(),
    variables: jsonb("variables")
      .notNull()
      .default(sql`'[]'::jsonb`)
      .$type<Array<{ name: string; description?: string; required?: boolean }>>(),
    version: integer("version").notNull().default(1),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    unique("prompts_workspace_slug").on(t.workspaceId, t.slug),
    index("prompts_workspace_idx").on(t.workspaceId),
    index("prompts_active_idx")
      .on(t.workspaceId, t.isActive)
      .where(sql`${t.isActive} = true`),
  ],
);

// ── Model routes ───────────────────────────────────────────────────
export const modelRoutes = pgTable(
  "model_routes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    taskType: aiTaskTypeEnum("task_type").notNull(),
    primaryModel: text("primary_model").notNull(),
    primaryProvider: text("primary_provider").notNull(),
    fallbackModel: text("fallback_model"),
    fallbackProvider: text("fallback_provider"),
    maxTokens: integer("max_tokens").notNull(),
    temperature: numeric("temperature", { precision: 3, scale: 2 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    unique("model_routes_workspace_task").on(t.workspaceId, t.taskType),
    index("model_routes_workspace_idx").on(t.workspaceId),
  ],
);

// ── AI calls (telemetry) ───────────────────────────────────────────
export const aiCalls = pgTable(
  "ai_calls",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    brandId: uuid("brand_id").references(() => brands.id, {
      onDelete: "set null",
    }),
    draftId: uuid("draft_id").references(() => drafts.id, {
      onDelete: "set null",
    }),
    taskType: aiTaskTypeEnum("task_type").notNull(),
    model: text("model").notNull(),
    provider: text("provider").notNull(),
    promptHash: text("prompt_hash").notNull(),
    promptTokens: integer("prompt_tokens").notNull(),
    completionTokens: integer("completion_tokens").notNull(),
    totalTokens: integer("total_tokens").notNull(),
    costCents: integer("cost_cents").notNull(),
    latencyMs: integer("latency_ms").notNull(),
    status: text("status", {
      enum: ["success", "error", "timeout"],
    }).notNull(),
    errorCode: text("error_code"),
    traceId: text("trace_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    index("ai_calls_workspace_idx").on(t.workspaceId),
    index("ai_calls_task_type_idx").on(t.workspaceId, t.taskType),
    index("ai_calls_trace_idx").on(t.traceId),
    index("ai_calls_created_at_idx").on(t.workspaceId, t.createdAt),
    index("ai_calls_model_idx").on(t.model, t.provider),
  ],
);

// ── Model pricing ──────────────────────────────────────────────────
export const modelPricing = pgTable(
  "model_pricing",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    provider: text("provider").notNull(),
    model: text("model").notNull(),
    inputCostPer1mTokens: integer("input_cost_per_1m_tokens").notNull(), // microcents
    outputCostPer1mTokens: integer("output_cost_per_1m_tokens").notNull(), // microcents
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    unique("model_pricing_provider_model").on(t.provider, t.model),
  ],
);
```

### `src/db/schema/ops.ts`

```typescript
import { sql } from "drizzle-orm";
import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
  index,
  unique,
} from "drizzle-orm/pg-core";
import { workspaces } from "./workspaces";
import { connectors } from "./connectors";
import { exportFormatEnum, exportStatusEnum } from "./enums";

// ── Audit log (append-only) ────────────────────────────────────────
export const auditLog = pgTable(
  "audit_log",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    actor: text("actor").notNull(), // clerk_user_id or 'system'
    action: text("action").notNull(), // dot notation e.g. 'draft.publish.failed'
    subjectType: text("subject_type").notNull(),
    subjectId: text("subject_id").notNull(),
    diff: text("diff"),
    traceId: text("trace_id").notNull(),
    errorCode: text("error_code"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    // APPEND ONLY — no updatedAt
  },
  (t) => [
    index("audit_log_workspace_idx").on(t.workspaceId),
    index("audit_log_action_idx").on(t.workspaceId, t.action),
    index("audit_log_subject_idx").on(t.subjectType, t.subjectId),
    index("audit_log_trace_idx").on(t.traceId),
    index("audit_log_created_at_idx").on(t.workspaceId, t.createdAt),
  ],
);

// ── Exports ────────────────────────────────────────────────────────
export const exports_ = pgTable(
  "exports",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    format: exportFormatEnum("format").notNull(),
    status: exportStatusEnum("status").notNull().default("pending"),
    scope: jsonb("scope")
      .notNull()
      .$type<Record<string, unknown>>(),
    dateRangeStart: timestamp("date_range_start", {
      withTimezone: true,
    }).notNull(),
    dateRangeEnd: timestamp("date_range_end", {
      withTimezone: true,
    }).notNull(),
    fileUrl: text("file_url"),
    requestedBy: text("requested_by").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (t) => [
    index("exports_workspace_idx").on(t.workspaceId),
    index("exports_status_idx").on(t.workspaceId, t.status),
  ],
);

// ── Rate limit windows ─────────────────────────────────────────────
export const rateLimitWindows = pgTable(
  "rate_limit_windows",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    connectorId: uuid("connector_id").references(() => connectors.id, {
      onDelete: "cascade",
    }),
    windowKey: text("window_key").notNull(),
    count: integer("count").notNull().default(0),
    limitValue: integer("limit_value").notNull(),
    resetAt: timestamp("reset_at", { withTimezone: true }).notNull(),
  },
  (t) => [
    unique("rate_limit_windows_composite").on(
      t.workspaceId,
      t.connectorId,
      t.windowKey,
    ),
    index("rate_limit_windows_reset_idx").on(t.resetAt),
  ],
);

// ── Webhook deliveries ─────────────────────────────────────────────
export const webhookDeliveries = pgTable(
  "webhook_deliveries",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    source: text("source").notNull(),
    payloadHash: text("payload_hash").notNull().unique(),
    processed: boolean("processed").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    index("webhook_deliveries_workspace_idx").on(t.workspaceId),
    index("webhook_deliveries_unprocessed_idx")
      .on(t.workspaceId, t.processed)
      .where(sql`${t.processed} = false`),
  ],
);

// ── Dead letter queue ──────────────────────────────────────────────
export const deadLetterQueue = pgTable(
  "dead_letter_queue",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    jobType: text("job_type").notNull(),
    payload: jsonb("payload").notNull().$type<Record<string, unknown>>(),
    errorCode: text("error_code").notNull(),
    errorMessage: text("error_message").notNull(),
    errorClass: text("error_class", {
      enum: ["transient", "permanent", "ambiguous", "silent"],
    }).notNull(),
    originalEventId: text("original_event_id").notNull(),
    attempts: integer("attempts").notNull().default(1),
    lastAttemptedAt: timestamp("last_attempted_at", {
      withTimezone: true,
    }).notNull(),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    resolvedBy: text("resolved_by"),
    resolution: text("resolution", {
      enum: ["retried", "discarded", "manual"],
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    index("dead_letter_queue_workspace_idx").on(t.workspaceId),
    index("dead_letter_queue_unresolved_idx")
      .on(t.workspaceId, t.resolvedAt)
      .where(sql`${t.resolvedAt} IS NULL`),
    index("dead_letter_queue_error_class_idx").on(t.errorClass),
  ],
);
```

### `src/db/schema/index.ts`

```typescript
// ── Enums ──────────────────────────────────────────────────────────
export {
  postStatusEnum,
  severityEnum,
  connectorStateEnum,
  tierEnum,
  memberRoleEnum,
  signalSourceEnum,
  ruleCategoryEnum,
  aiTaskTypeEnum,
  exportFormatEnum,
  exportStatusEnum,
} from "./enums";

// ── Workspaces & access ────────────────────────────────────────────
export { workspaces, members, featureFlags } from "./workspaces";

// ── Brands & voice ─────────────────────────────────────────────────
export { brands, brandBriefs, brandCorpus, antiAiRules } from "./brands";

// ── Connectors & auth ──────────────────────────────────────────────
export {
  connectors,
  oauthCredentials,
  contractTestResults,
} from "./connectors";

// ── Signals & ideas ────────────────────────────────────────────────
export { signals, ideas } from "./signals";

// ── Content ────────────────────────────────────────────────────────
export { drafts, draftGrades, draftAntiAiHits } from "./content";

// ── Publishing ─────────────────────────────────────────────────────
export { schedules, posts, postResults } from "./publishing";

// ── AI ─────────────────────────────────────────────────────────────
export { prompts, modelRoutes, aiCalls, modelPricing } from "./ai";

// ── Ops & infrastructure ──────────────────────────────────────────
export {
  auditLog,
  exports_ as exports,
  rateLimitWindows,
  webhookDeliveries,
  deadLetterQueue,
} from "./ops";
```

---

## Prerequisites (before running migrations)

1. **Install pgvector extension** in the Neon database:
   ```sql
   CREATE EXTENSION IF NOT EXISTS vector;
   ```

2. **Add drizzle.config.ts** at project root:
   ```typescript
   import { defineConfig } from "drizzle-kit";

   export default defineConfig({
     dialect: "postgresql",
     schema: "./src/db/schema/index.ts",
     out: "./drizzle",
     dbCredentials: {
       url: process.env.DATABASE_URL!,
     },
   });
   ```

3. **Add package.json scripts**:
   ```json
   {
     "db:generate": "drizzle-kit generate",
     "db:migrate": "drizzle-kit migrate",
     "db:push": "drizzle-kit push",
     "db:studio": "drizzle-kit studio"
   }
   ```

4. **Create database client** at `src/db/index.ts`:
   ```typescript
   import { neon } from "@neondatabase/serverless";
   import { drizzle } from "drizzle-orm/neon-http";
   import * as schema from "./schema";

   const sql = neon(process.env.DATABASE_URL!);
   export const db = drizzle({ client: sql, schema });
   ```

---

## Execution Checklist

- [ ] Create `src/db/schema/` directory
- [ ] Write all 9 schema files (enums, workspaces, brands, connectors, signals, content, publishing, ai, ops)
- [ ] Write barrel `index.ts`
- [ ] Write `drizzle.config.ts`
- [ ] Write `src/db/index.ts` (database client)
- [ ] Add db scripts to `package.json`
- [ ] Run `pnpm db:generate` to create migration SQL
- [ ] Run `pnpm db:push` (or `db:migrate`) to apply to Neon
