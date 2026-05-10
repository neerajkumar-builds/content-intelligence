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
    platformResponse: jsonb("platform_response").$type<
      Record<string, unknown>
    >(),
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
