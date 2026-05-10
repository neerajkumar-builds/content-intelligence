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
  unique,
} from "drizzle-orm/pg-core";
import { workspaces } from "./workspaces";
import { severityEnum, ruleCategoryEnum } from "./enums";

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
  },
  (t) => [
    unique("brand_briefs_brand_version").on(t.brandId, t.version),
    index("brand_briefs_brand_idx").on(t.brandId),
  ],
);

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
    channelScope: text("channel_scope").array(),
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
