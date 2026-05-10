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
    brandAccess: text("brand_access").array(),
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

export const featureFlags = pgTable(
  "feature_flags",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    key: text("key").notNull(),
    scope: text("scope", { enum: ["global", "workspace", "brand"] })
      .notNull()
      .default("global"),
    scopeId: text("scope_id"),
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
