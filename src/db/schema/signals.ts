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
