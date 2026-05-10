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

export const auditLog = pgTable(
  "audit_log",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    actor: text("actor").notNull(),
    action: text("action").notNull(),
    subjectType: text("subject_type").notNull(),
    subjectId: text("subject_id").notNull(),
    diff: text("diff"),
    traceId: text("trace_id").notNull(),
    errorCode: text("error_code"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    index("audit_log_workspace_idx").on(t.workspaceId),
    index("audit_log_action_idx").on(t.workspaceId, t.action),
    index("audit_log_subject_idx").on(t.subjectType, t.subjectId),
    index("audit_log_trace_idx").on(t.traceId),
    index("audit_log_created_at_idx").on(t.workspaceId, t.createdAt),
  ],
);

export const exports_ = pgTable(
  "exports",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    format: exportFormatEnum("format").notNull(),
    status: exportStatusEnum("status").notNull().default("pending"),
    scope: jsonb("scope").notNull().$type<Record<string, unknown>>(),
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
