ALTER TABLE "brand_corpus" ALTER COLUMN "embedding" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "anti_ai_rules" ADD COLUMN "pattern_type" text DEFAULT 'phrase' NOT NULL;--> statement-breakpoint
ALTER TABLE "brand_briefs" ADD COLUMN "changelog" text;--> statement-breakpoint
ALTER TABLE "brands" ADD COLUMN "strict_mode" boolean DEFAULT false NOT NULL;