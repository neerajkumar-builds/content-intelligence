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
  halfvec,
  check,
} from "drizzle-orm/pg-core";
import { workspaces } from "./workspaces";
import { brands } from "./brands";
import { signalSourceEnum, fetchMethodEnum } from "./enums";

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
    profileId: uuid("profile_id"),
    embedding: halfvec("embedding", { dimensions: 3072 }),
    processed: boolean("processed").notNull().default(false),
    publishedAt: timestamp("published_at", { withTimezone: true }),
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
      t.embedding.op("halfvec_cosine_ops"),
    ),
  ],
);

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
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    check(
      "ideas_hot_score_range",
      sql`${t.hotScore} >= 0 AND ${t.hotScore} <= 100`,
    ),
    index("ideas_workspace_idx").on(t.workspaceId),
    index("ideas_brand_idx").on(t.brandId),
    index("ideas_score_idx").on(t.workspaceId, t.score),
    index("ideas_hot_score_idx").on(t.workspaceId, t.hotScore),
  ],
);

export const signalSourceConfigs = pgTable(
  "signal_source_configs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    source: signalSourceEnum("source").notNull(),
    label: text("label").notNull(),
    configUrl: text("config_url").notNull(),
    enabled: boolean("enabled").notNull().default(true),
    profileId: uuid("profile_id"),
    fetchMethod: fetchMethodEnum("fetch_method"),
    lastFetchedAt: timestamp("last_fetched_at", { withTimezone: true }),
    lastErrorAt: timestamp("last_error_at", { withTimezone: true }),
    lastErrorMessage: text("last_error_message"),
    metadata: jsonb("metadata")
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
    index("signal_source_configs_workspace_idx").on(t.workspaceId),
    index("signal_source_configs_source_idx").on(t.workspaceId, t.source),
    index("signal_source_configs_enabled_idx")
      .on(t.workspaceId, t.enabled)
      .where(sql`${t.enabled} = true`),
  ],
);
