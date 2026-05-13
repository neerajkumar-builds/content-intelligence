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
import {
  profileTypeEnum,
  profileImportanceEnum,
  profilePlatformEnum,
  fetchMethodEnum,
} from "./enums";

export const profiles = pgTable(
  "profiles",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    type: profileTypeEnum("type").notNull(),
    website: text("website"),
    description: text("description"),
    importance: profileImportanceEnum("importance").notNull().default("medium"),
    notes: text("notes"),
    metadata: jsonb("metadata")
      .notNull()
      .default(sql`'{}'::jsonb`)
      .$type<Record<string, unknown>>(),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    unique("profiles_ws_name_type").on(t.workspaceId, t.name, t.type),
    index("profiles_ws_idx").on(t.workspaceId),
    index("profiles_ws_type_idx").on(t.workspaceId, t.type),
  ],
);

export const profilePlatformLinks = pgTable(
  "profile_platform_links",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    profileId: uuid("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    platform: profilePlatformEnum("platform").notNull(),
    url: text("url").notNull(),
    feedUrl: text("feed_url"),
    fetchMethod: fetchMethodEnum("fetch_method").notNull(),
    enabled: boolean("enabled").notNull().default(true),
    lastFetchedAt: timestamp("last_fetched_at", { withTimezone: true }),
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
    unique("profile_platform_links_profile_platform").on(
      t.profileId,
      t.platform,
    ),
    index("profile_platform_links_profile_idx").on(t.profileId),
  ],
);
