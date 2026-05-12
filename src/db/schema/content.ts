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
import { brands, antiAiRules } from "./brands";
import { ideas } from "./signals";
import { postStatusEnum, severityEnum } from "./enums";

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
    format: text("format"),
    modelId: text("model_id"),
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
  (t) => [index("draft_grades_draft_idx").on(t.draftId)],
);

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
