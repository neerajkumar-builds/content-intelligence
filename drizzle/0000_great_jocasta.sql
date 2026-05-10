CREATE TYPE "public"."ai_task_type" AS ENUM('hook', 'body', 'voice_score', 'anti_ai_audit', 'idea_rank', 'embedding', 'rerank');--> statement-breakpoint
CREATE TYPE "public"."connector_state" AS ENUM('healthy', 'reconnect', 'paste', 'disconnected');--> statement-breakpoint
CREATE TYPE "public"."export_format" AS ENUM('json', 'csv', 'sql');--> statement-breakpoint
CREATE TYPE "public"."export_status" AS ENUM('pending', 'processing', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."member_role" AS ENUM('owner', 'admin', 'editor', 'approver', 'viewer');--> statement-breakpoint
CREATE TYPE "public"."post_status" AS ENUM('draft', 'graded', 'approved', 'scheduled', 'publishing', 'live', 'failed');--> statement-breakpoint
CREATE TYPE "public"."rule_category" AS ENUM('punctuation', 'transition', 'filler', 'corporate', 'cliche', 'custom');--> statement-breakpoint
CREATE TYPE "public"."severity" AS ENUM('block', 'warn', 'suggest', 'log');--> statement-breakpoint
CREATE TYPE "public"."signal_source" AS ENUM('rss', 'reddit', 'linkedin', 'twitter', 'apify', 'manual', 'competitor', 'thought_leader');--> statement-breakpoint
CREATE TYPE "public"."tier" AS ENUM('tier1', 'tier2', 'tier3');--> statement-breakpoint
CREATE TABLE "ai_calls" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"brand_id" uuid,
	"draft_id" uuid,
	"task_type" "ai_task_type" NOT NULL,
	"model" text NOT NULL,
	"provider" text NOT NULL,
	"prompt_hash" text NOT NULL,
	"prompt_tokens" integer NOT NULL,
	"completion_tokens" integer NOT NULL,
	"total_tokens" integer NOT NULL,
	"cost_cents" integer NOT NULL,
	"latency_ms" integer NOT NULL,
	"status" text NOT NULL,
	"error_code" text,
	"trace_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "anti_ai_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"phrase_or_pattern" text NOT NULL,
	"category" "rule_category" NOT NULL,
	"severity" "severity" NOT NULL,
	"action" text NOT NULL,
	"channel_scope" text[],
	"hits_30d" integer DEFAULT 0 NOT NULL,
	"last_tripped_at" timestamp with time zone,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"actor" text NOT NULL,
	"action" text NOT NULL,
	"subject_type" text NOT NULL,
	"subject_id" text NOT NULL,
	"diff" text,
	"trace_id" text NOT NULL,
	"error_code" text,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "brand_briefs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"brand_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"wedge" text NOT NULL,
	"icp" text NOT NULL,
	"voice_traits" text NOT NULL,
	"anti_positioning" text NOT NULL,
	"editor_clerk_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "brand_briefs_brand_version" UNIQUE("brand_id","version")
);
--> statement-breakpoint
CREATE TABLE "brand_corpus" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"brand_id" uuid NOT NULL,
	"content" text NOT NULL,
	"source_url" text,
	"embedding" vector(1536) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "brands" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"name" text NOT NULL,
	"voice_score" numeric(5, 2),
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "connectors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"platform" text NOT NULL,
	"tier" "tier" NOT NULL,
	"state" "connector_state" DEFAULT 'disconnected' NOT NULL,
	"account_name" text NOT NULL,
	"last_post_at" timestamp with time zone,
	"last_health_check_at" timestamp with time zone,
	"config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contract_test_results" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"connector_id" uuid NOT NULL,
	"test_name" text NOT NULL,
	"passed" boolean NOT NULL,
	"error_message" text,
	"latency_ms" integer,
	"run_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dead_letter_queue" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"job_type" text NOT NULL,
	"payload" jsonb NOT NULL,
	"error_code" text NOT NULL,
	"error_message" text NOT NULL,
	"error_class" text NOT NULL,
	"original_event_id" text NOT NULL,
	"attempts" integer DEFAULT 1 NOT NULL,
	"last_attempted_at" timestamp with time zone NOT NULL,
	"resolved_at" timestamp with time zone,
	"resolved_by" text,
	"resolution" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "draft_anti_ai_hits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"draft_id" uuid NOT NULL,
	"rule_id" uuid NOT NULL,
	"matched_text" text NOT NULL,
	"severity" "severity" NOT NULL,
	"outcome" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "draft_grades" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"draft_id" uuid NOT NULL,
	"hook" numeric(5, 2) NOT NULL,
	"voice" numeric(5, 2) NOT NULL,
	"evidence" numeric(5, 2) NOT NULL,
	"format_fit" numeric(5, 2) NOT NULL,
	"controversy" numeric(5, 2) NOT NULL,
	"specificity" numeric(5, 2) NOT NULL,
	"cta" numeric(5, 2) NOT NULL,
	"composite" numeric(5, 2) NOT NULL,
	"graded_by_model" text NOT NULL,
	"graded_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "drafts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"brand_id" uuid NOT NULL,
	"idea_id" uuid,
	"title" text,
	"content" text NOT NULL,
	"status" "post_status" DEFAULT 'draft' NOT NULL,
	"channel" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "exports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"format" "export_format" NOT NULL,
	"status" "export_status" DEFAULT 'pending' NOT NULL,
	"scope" jsonb NOT NULL,
	"date_range_start" timestamp with time zone NOT NULL,
	"date_range_end" timestamp with time zone NOT NULL,
	"file_url" text,
	"requested_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "feature_flags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"scope" text DEFAULT 'global' NOT NULL,
	"scope_id" text,
	"enabled" boolean DEFAULT true NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "feature_flags_key_scope" UNIQUE("key","scope","scope_id")
);
--> statement-breakpoint
CREATE TABLE "ideas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"brand_id" uuid NOT NULL,
	"signal_id" uuid,
	"hook" text NOT NULL,
	"angle" text NOT NULL,
	"source_kind" text NOT NULL,
	"source_label" text NOT NULL,
	"source_citation" text,
	"source_url" text,
	"icp_fit" numeric(5, 2) NOT NULL,
	"hot_score" integer DEFAULT 0 NOT NULL,
	"freshness" text NOT NULL,
	"formats" text[] NOT NULL,
	"tags" text[] NOT NULL,
	"dedup_score" numeric(5, 4),
	"dedup_prior_id" uuid,
	"score" numeric(5, 2) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ideas_hot_score_range" CHECK ("ideas"."hot_score" >= 0 AND "ideas"."hot_score" <= 100)
);
--> statement-breakpoint
CREATE TABLE "members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"clerk_user_id" text NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"role" "member_role" DEFAULT 'viewer' NOT NULL,
	"brand_access" text[],
	"last_active_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "members_workspace_clerk_user" UNIQUE("workspace_id","clerk_user_id")
);
--> statement-breakpoint
CREATE TABLE "model_pricing" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider" text NOT NULL,
	"model" text NOT NULL,
	"input_cost_per_1m_tokens" integer NOT NULL,
	"output_cost_per_1m_tokens" integer NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "model_pricing_provider_model" UNIQUE("provider","model")
);
--> statement-breakpoint
CREATE TABLE "model_routes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"task_type" "ai_task_type" NOT NULL,
	"primary_model" text NOT NULL,
	"primary_provider" text NOT NULL,
	"fallback_model" text,
	"fallback_provider" text,
	"max_tokens" integer NOT NULL,
	"temperature" numeric(3, 2) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "model_routes_workspace_task" UNIQUE("workspace_id","task_type")
);
--> statement-breakpoint
CREATE TABLE "oauth_credentials" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"connector_id" uuid NOT NULL,
	"encrypted_access_token" text NOT NULL,
	"encrypted_refresh_token" text,
	"token_iv" text NOT NULL,
	"token_tag" text NOT NULL,
	"scopes" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"refresh_expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "oauth_credentials_connector_id_unique" UNIQUE("connector_id")
);
--> statement-breakpoint
CREATE TABLE "post_results" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"post_id" uuid NOT NULL,
	"channel" text NOT NULL,
	"status" text NOT NULL,
	"error_code" text,
	"error_message" text,
	"platform_response" jsonb,
	"latency_ms" integer,
	"cost_cents" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "posts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"draft_id" uuid NOT NULL,
	"channel" text NOT NULL,
	"idempotency_key" text NOT NULL,
	"status" "post_status" DEFAULT 'draft' NOT NULL,
	"platform_post_id" text,
	"platform_post_url" text,
	"fallback_content" text,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "posts_idempotency_key_unique" UNIQUE("idempotency_key")
);
--> statement-breakpoint
CREATE TABLE "prompts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"system_prompt" text NOT NULL,
	"variables" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "prompts_workspace_slug" UNIQUE("workspace_id","slug")
);
--> statement-breakpoint
CREATE TABLE "rate_limit_windows" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"connector_id" uuid,
	"window_key" text NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	"limit_value" integer NOT NULL,
	"reset_at" timestamp with time zone NOT NULL,
	CONSTRAINT "rate_limit_windows_composite" UNIQUE("workspace_id","connector_id","window_key")
);
--> statement-breakpoint
CREATE TABLE "schedules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"draft_id" uuid NOT NULL,
	"channel" text NOT NULL,
	"scheduled_at" timestamp with time zone NOT NULL,
	"timezone" text DEFAULT 'UTC' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "signals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"source" "signal_source" NOT NULL,
	"source_url" text,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"embedding" vector(1536),
	"processed" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "webhook_deliveries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"source" text NOT NULL,
	"payload_hash" text NOT NULL,
	"processed" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "webhook_deliveries_payload_hash_unique" UNIQUE("payload_hash")
);
--> statement-breakpoint
CREATE TABLE "workspaces" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clerk_org_id" text NOT NULL,
	"name" text NOT NULL,
	"plan" text DEFAULT 'creator' NOT NULL,
	"monthly_ai_budget_cents" integer DEFAULT 0 NOT NULL,
	"current_month_spend_cents" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "workspaces_clerk_org_id_unique" UNIQUE("clerk_org_id")
);
--> statement-breakpoint
ALTER TABLE "ai_calls" ADD CONSTRAINT "ai_calls_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_calls" ADD CONSTRAINT "ai_calls_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_calls" ADD CONSTRAINT "ai_calls_draft_id_drafts_id_fk" FOREIGN KEY ("draft_id") REFERENCES "public"."drafts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "anti_ai_rules" ADD CONSTRAINT "anti_ai_rules_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "brand_briefs" ADD CONSTRAINT "brand_briefs_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "brand_corpus" ADD CONSTRAINT "brand_corpus_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "brands" ADD CONSTRAINT "brands_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "connectors" ADD CONSTRAINT "connectors_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contract_test_results" ADD CONSTRAINT "contract_test_results_connector_id_connectors_id_fk" FOREIGN KEY ("connector_id") REFERENCES "public"."connectors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dead_letter_queue" ADD CONSTRAINT "dead_letter_queue_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "draft_anti_ai_hits" ADD CONSTRAINT "draft_anti_ai_hits_draft_id_drafts_id_fk" FOREIGN KEY ("draft_id") REFERENCES "public"."drafts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "draft_anti_ai_hits" ADD CONSTRAINT "draft_anti_ai_hits_rule_id_anti_ai_rules_id_fk" FOREIGN KEY ("rule_id") REFERENCES "public"."anti_ai_rules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "draft_grades" ADD CONSTRAINT "draft_grades_draft_id_drafts_id_fk" FOREIGN KEY ("draft_id") REFERENCES "public"."drafts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "drafts" ADD CONSTRAINT "drafts_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "drafts" ADD CONSTRAINT "drafts_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "drafts" ADD CONSTRAINT "drafts_idea_id_ideas_id_fk" FOREIGN KEY ("idea_id") REFERENCES "public"."ideas"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exports" ADD CONSTRAINT "exports_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ideas" ADD CONSTRAINT "ideas_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ideas" ADD CONSTRAINT "ideas_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ideas" ADD CONSTRAINT "ideas_signal_id_signals_id_fk" FOREIGN KEY ("signal_id") REFERENCES "public"."signals"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "members" ADD CONSTRAINT "members_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "model_routes" ADD CONSTRAINT "model_routes_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oauth_credentials" ADD CONSTRAINT "oauth_credentials_connector_id_connectors_id_fk" FOREIGN KEY ("connector_id") REFERENCES "public"."connectors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_results" ADD CONSTRAINT "post_results_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_draft_id_drafts_id_fk" FOREIGN KEY ("draft_id") REFERENCES "public"."drafts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prompts" ADD CONSTRAINT "prompts_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rate_limit_windows" ADD CONSTRAINT "rate_limit_windows_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rate_limit_windows" ADD CONSTRAINT "rate_limit_windows_connector_id_connectors_id_fk" FOREIGN KEY ("connector_id") REFERENCES "public"."connectors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedules" ADD CONSTRAINT "schedules_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedules" ADD CONSTRAINT "schedules_draft_id_drafts_id_fk" FOREIGN KEY ("draft_id") REFERENCES "public"."drafts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "signals" ADD CONSTRAINT "signals_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhook_deliveries" ADD CONSTRAINT "webhook_deliveries_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ai_calls_workspace_idx" ON "ai_calls" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "ai_calls_task_type_idx" ON "ai_calls" USING btree ("workspace_id","task_type");--> statement-breakpoint
CREATE INDEX "ai_calls_trace_idx" ON "ai_calls" USING btree ("trace_id");--> statement-breakpoint
CREATE INDEX "ai_calls_created_at_idx" ON "ai_calls" USING btree ("workspace_id","created_at");--> statement-breakpoint
CREATE INDEX "ai_calls_model_idx" ON "ai_calls" USING btree ("model","provider");--> statement-breakpoint
CREATE INDEX "anti_ai_rules_workspace_idx" ON "anti_ai_rules" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "anti_ai_rules_enabled_idx" ON "anti_ai_rules" USING btree ("workspace_id","enabled") WHERE "anti_ai_rules"."enabled" = true;--> statement-breakpoint
CREATE INDEX "audit_log_workspace_idx" ON "audit_log" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "audit_log_action_idx" ON "audit_log" USING btree ("workspace_id","action");--> statement-breakpoint
CREATE INDEX "audit_log_subject_idx" ON "audit_log" USING btree ("subject_type","subject_id");--> statement-breakpoint
CREATE INDEX "audit_log_trace_idx" ON "audit_log" USING btree ("trace_id");--> statement-breakpoint
CREATE INDEX "audit_log_created_at_idx" ON "audit_log" USING btree ("workspace_id","created_at");--> statement-breakpoint
CREATE INDEX "brand_briefs_brand_idx" ON "brand_briefs" USING btree ("brand_id");--> statement-breakpoint
CREATE INDEX "brand_corpus_brand_idx" ON "brand_corpus" USING btree ("brand_id");--> statement-breakpoint
CREATE INDEX "brand_corpus_embedding_idx" ON "brand_corpus" USING hnsw ("embedding" vector_cosine_ops);--> statement-breakpoint
CREATE INDEX "brands_workspace_idx" ON "brands" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "brands_active_idx" ON "brands" USING btree ("workspace_id","active") WHERE "brands"."active" = true;--> statement-breakpoint
CREATE INDEX "connectors_workspace_idx" ON "connectors" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "connectors_platform_idx" ON "connectors" USING btree ("workspace_id","platform");--> statement-breakpoint
CREATE INDEX "connectors_state_idx" ON "connectors" USING btree ("workspace_id","state") WHERE "connectors"."state" != 'disconnected';--> statement-breakpoint
CREATE INDEX "contract_test_results_connector_idx" ON "contract_test_results" USING btree ("connector_id");--> statement-breakpoint
CREATE INDEX "contract_test_results_run_at_idx" ON "contract_test_results" USING btree ("connector_id","run_at");--> statement-breakpoint
CREATE INDEX "dead_letter_queue_workspace_idx" ON "dead_letter_queue" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "dead_letter_queue_unresolved_idx" ON "dead_letter_queue" USING btree ("workspace_id","resolved_at") WHERE "dead_letter_queue"."resolved_at" IS NULL;--> statement-breakpoint
CREATE INDEX "dead_letter_queue_error_class_idx" ON "dead_letter_queue" USING btree ("error_class");--> statement-breakpoint
CREATE INDEX "draft_anti_ai_hits_draft_idx" ON "draft_anti_ai_hits" USING btree ("draft_id");--> statement-breakpoint
CREATE INDEX "draft_anti_ai_hits_rule_idx" ON "draft_anti_ai_hits" USING btree ("rule_id");--> statement-breakpoint
CREATE INDEX "draft_grades_draft_idx" ON "draft_grades" USING btree ("draft_id");--> statement-breakpoint
CREATE INDEX "drafts_workspace_idx" ON "drafts" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "drafts_brand_idx" ON "drafts" USING btree ("brand_id");--> statement-breakpoint
CREATE INDEX "drafts_status_idx" ON "drafts" USING btree ("workspace_id","status");--> statement-breakpoint
CREATE INDEX "drafts_channel_idx" ON "drafts" USING btree ("workspace_id","channel");--> statement-breakpoint
CREATE INDEX "exports_workspace_idx" ON "exports" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "exports_status_idx" ON "exports" USING btree ("workspace_id","status");--> statement-breakpoint
CREATE INDEX "feature_flags_key_idx" ON "feature_flags" USING btree ("key");--> statement-breakpoint
CREATE INDEX "ideas_workspace_idx" ON "ideas" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "ideas_brand_idx" ON "ideas" USING btree ("brand_id");--> statement-breakpoint
CREATE INDEX "ideas_score_idx" ON "ideas" USING btree ("workspace_id","score");--> statement-breakpoint
CREATE INDEX "ideas_hot_score_idx" ON "ideas" USING btree ("workspace_id","hot_score");--> statement-breakpoint
CREATE INDEX "members_workspace_idx" ON "members" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "members_clerk_user_idx" ON "members" USING btree ("clerk_user_id");--> statement-breakpoint
CREATE INDEX "model_routes_workspace_idx" ON "model_routes" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "oauth_credentials_connector_idx" ON "oauth_credentials" USING btree ("connector_id");--> statement-breakpoint
CREATE INDEX "post_results_post_idx" ON "post_results" USING btree ("post_id");--> statement-breakpoint
CREATE INDEX "post_results_status_idx" ON "post_results" USING btree ("post_id","status");--> statement-breakpoint
CREATE INDEX "posts_workspace_idx" ON "posts" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "posts_draft_idx" ON "posts" USING btree ("draft_id");--> statement-breakpoint
CREATE INDEX "posts_status_idx" ON "posts" USING btree ("workspace_id","status");--> statement-breakpoint
CREATE INDEX "posts_channel_idx" ON "posts" USING btree ("workspace_id","channel");--> statement-breakpoint
CREATE INDEX "prompts_workspace_idx" ON "prompts" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "prompts_active_idx" ON "prompts" USING btree ("workspace_id","is_active") WHERE "prompts"."is_active" = true;--> statement-breakpoint
CREATE INDEX "rate_limit_windows_reset_idx" ON "rate_limit_windows" USING btree ("reset_at");--> statement-breakpoint
CREATE INDEX "schedules_workspace_idx" ON "schedules" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "schedules_draft_idx" ON "schedules" USING btree ("draft_id");--> statement-breakpoint
CREATE INDEX "schedules_scheduled_at_idx" ON "schedules" USING btree ("scheduled_at");--> statement-breakpoint
CREATE INDEX "signals_workspace_idx" ON "signals" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "signals_source_idx" ON "signals" USING btree ("workspace_id","source");--> statement-breakpoint
CREATE INDEX "signals_unprocessed_idx" ON "signals" USING btree ("workspace_id","processed") WHERE "signals"."processed" = false;--> statement-breakpoint
CREATE INDEX "signals_embedding_idx" ON "signals" USING hnsw ("embedding" vector_cosine_ops);--> statement-breakpoint
CREATE INDEX "webhook_deliveries_workspace_idx" ON "webhook_deliveries" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "webhook_deliveries_unprocessed_idx" ON "webhook_deliveries" USING btree ("workspace_id","processed") WHERE "webhook_deliveries"."processed" = false;