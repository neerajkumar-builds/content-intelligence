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
} from "drizzle-orm/pg-core";
import { workspaces } from "./workspaces";
import { connectorStateEnum, tierEnum } from "./enums";

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
