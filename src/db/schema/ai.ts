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
  unique,
} from "drizzle-orm/pg-core";
import { workspaces } from "./workspaces";
import { brands } from "./brands";
import { drafts } from "./content";
import { aiTaskTypeEnum } from "./enums";

export const prompts = pgTable(
  "prompts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    systemPrompt: text("system_prompt").notNull(),
    variables: jsonb("variables")
      .notNull()
      .default(sql`'[]'::jsonb`)
      .$type<
        Array<{ name: string; description?: string; required?: boolean }>
      >(),
    version: integer("version").notNull().default(1),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    unique("prompts_workspace_slug").on(t.workspaceId, t.slug),
    index("prompts_workspace_idx").on(t.workspaceId),
    index("prompts_active_idx")
      .on(t.workspaceId, t.isActive)
      .where(sql`${t.isActive} = true`),
  ],
);

export const modelRoutes = pgTable(
  "model_routes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    taskType: aiTaskTypeEnum("task_type").notNull(),
    primaryModel: text("primary_model").notNull(),
    primaryProvider: text("primary_provider").notNull(),
    fallbackModel: text("fallback_model"),
    fallbackProvider: text("fallback_provider"),
    maxTokens: integer("max_tokens").notNull(),
    temperature: numeric("temperature", { precision: 3, scale: 2 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    unique("model_routes_workspace_task").on(t.workspaceId, t.taskType),
    index("model_routes_workspace_idx").on(t.workspaceId),
  ],
);

export const aiCalls = pgTable(
  "ai_calls",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    brandId: uuid("brand_id").references(() => brands.id, {
      onDelete: "set null",
    }),
    draftId: uuid("draft_id").references(() => drafts.id, {
      onDelete: "set null",
    }),
    taskType: aiTaskTypeEnum("task_type").notNull(),
    model: text("model").notNull(),
    provider: text("provider").notNull(),
    promptHash: text("prompt_hash").notNull(),
    promptTokens: integer("prompt_tokens").notNull(),
    completionTokens: integer("completion_tokens").notNull(),
    totalTokens: integer("total_tokens").notNull(),
    costCents: integer("cost_cents").notNull(),
    latencyMs: integer("latency_ms").notNull(),
    status: text("status", {
      enum: ["success", "error", "timeout"],
    }).notNull(),
    errorCode: text("error_code"),
    traceId: text("trace_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    index("ai_calls_workspace_idx").on(t.workspaceId),
    index("ai_calls_task_type_idx").on(t.workspaceId, t.taskType),
    index("ai_calls_trace_idx").on(t.traceId),
    index("ai_calls_created_at_idx").on(t.workspaceId, t.createdAt),
    index("ai_calls_model_idx").on(t.model, t.provider),
  ],
);

export const modelPricing = pgTable(
  "model_pricing",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    provider: text("provider").notNull(),
    model: text("model").notNull(),
    inputCostPer1mTokens: integer("input_cost_per_1m_tokens").notNull(),
    outputCostPer1mTokens: integer("output_cost_per_1m_tokens").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    unique("model_pricing_provider_model").on(t.provider, t.model),
  ],
);
