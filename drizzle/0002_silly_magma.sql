CREATE TABLE "signal_source_configs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"source" "signal_source" NOT NULL,
	"label" text NOT NULL,
	"config_url" text NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"last_fetched_at" timestamp with time zone,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DROP INDEX "brand_corpus_embedding_idx";--> statement-breakpoint
DROP INDEX "signals_embedding_idx";--> statement-breakpoint
ALTER TABLE "brand_corpus" ALTER COLUMN "embedding" SET DATA TYPE halfvec(3072);--> statement-breakpoint
ALTER TABLE "signals" ALTER COLUMN "embedding" SET DATA TYPE halfvec(3072);--> statement-breakpoint
ALTER TABLE "drafts" ADD COLUMN "model_id" text;--> statement-breakpoint
ALTER TABLE "workspaces" ADD COLUMN "onboarding_step" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "workspaces" ADD COLUMN "onboarding_completed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "workspaces" ADD COLUMN "industry" text;--> statement-breakpoint
ALTER TABLE "workspaces" ADD COLUMN "voice_style" text;--> statement-breakpoint
ALTER TABLE "signal_source_configs" ADD CONSTRAINT "signal_source_configs_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "signal_source_configs_workspace_idx" ON "signal_source_configs" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "signal_source_configs_source_idx" ON "signal_source_configs" USING btree ("workspace_id","source");--> statement-breakpoint
CREATE INDEX "signal_source_configs_enabled_idx" ON "signal_source_configs" USING btree ("workspace_id","enabled") WHERE "signal_source_configs"."enabled" = true;--> statement-breakpoint
CREATE INDEX "brand_corpus_embedding_idx" ON "brand_corpus" USING hnsw ("embedding" halfvec_cosine_ops);--> statement-breakpoint
CREATE INDEX "signals_embedding_idx" ON "signals" USING hnsw ("embedding" halfvec_cosine_ops);