import { sql } from "drizzle-orm";
import {
  pgTable,
  uuid,
  text,
  boolean,
  timestamp,
  jsonb,
  index,
  unique,
} from "drizzle-orm/pg-core";
import { workspaces } from "./workspaces";
import { drafts } from "./content";

export const workspaceIntegrations = pgTable(
  "workspace_integrations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    integrationType: text("integration_type", {
      enum: ["slack", "google_drive"],
    }).notNull(),
    encryptedSecret: text("encrypted_secret"),
    config: jsonb("config")
      .notNull()
      .default(sql`'{}'::jsonb`)
      .$type<Record<string, unknown>>(),
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
    unique("workspace_integrations_ws_type").on(
      t.workspaceId,
      t.integrationType,
    ),
    index("workspace_integrations_ws_idx").on(t.workspaceId),
  ],
);

export const draftExports = pgTable(
  "draft_exports",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    draftId: uuid("draft_id").references(() => drafts.id, {
      onDelete: "set null",
    }),
    destination: text("destination", {
      enum: ["google_drive", "slack", "clipboard"],
    }).notNull(),
    status: text("status", {
      enum: ["pending", "processing", "completed", "failed"],
    })
      .notNull()
      .default("pending"),
    idempotencyKey: text("idempotency_key").unique(),
    externalId: text("external_id"),
    externalUrl: text("external_url"),
    errorCode: text("error_code"),
    errorMessage: text("error_message"),
    exportedBy: text("exported_by").notNull(),
    metadata: jsonb("metadata")
      .default(sql`'{}'::jsonb`)
      .$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index("draft_exports_ws_idx").on(t.workspaceId),
    index("draft_exports_draft_idx").on(t.draftId),
    index("draft_exports_status_idx").on(t.status),
    index("draft_exports_ws_created_idx").on(t.workspaceId, t.createdAt),
  ],
);
