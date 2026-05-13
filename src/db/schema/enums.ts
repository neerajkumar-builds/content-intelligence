import { pgEnum } from "drizzle-orm/pg-core";

export const postStatusEnum = pgEnum("post_status", [
  "draft",
  "graded",
  "approved",
  "scheduled",
  "publishing",
  "live",
  "failed",
]);

export const severityEnum = pgEnum("severity", [
  "block",
  "warn",
  "suggest",
  "log",
]);

export const connectorStateEnum = pgEnum("connector_state", [
  "healthy",
  "reconnect",
  "paste",
  "disconnected",
]);

export const tierEnum = pgEnum("tier", ["tier1", "tier2", "tier3"]);

export const memberRoleEnum = pgEnum("member_role", [
  "owner",
  "admin",
  "editor",
  "approver",
  "viewer",
]);

export const signalSourceEnum = pgEnum("signal_source", [
  "rss",
  "reddit",
  "linkedin",
  "twitter",
  "apify",
  "manual",
  "competitor",
  "thought_leader",
]);

export const ruleCategoryEnum = pgEnum("rule_category", [
  "punctuation",
  "transition",
  "filler",
  "corporate",
  "cliche",
  "custom",
]);

export const aiTaskTypeEnum = pgEnum("ai_task_type", [
  "hook",
  "body",
  "voice_score",
  "anti_ai_audit",
  "idea_rank",
  "embedding",
  "rerank",
]);

export const exportFormatEnum = pgEnum("export_format", [
  "json",
  "csv",
  "sql",
]);

export const exportStatusEnum = pgEnum("export_status", [
  "pending",
  "processing",
  "completed",
  "failed",
]);

export const profileTypeEnum = pgEnum("profile_type", [
  "competitor",
  "thought_leader",
  "content_creator",
]);

export const profileImportanceEnum = pgEnum("profile_importance", [
  "high",
  "medium",
  "low",
]);

export const profilePlatformEnum = pgEnum("profile_platform", [
  "website",
  "linkedin",
  "twitter",
  "youtube",
  "instagram",
  "tiktok",
  "reddit",
  "substack",
  "medium",
  "podcast",
]);

export const fetchMethodEnum = pgEnum("fetch_method", [
  "rss",
  "rss_discovery",
  "youtube_rss",
  "reddit_rss",
  "google_news",
  "apify",
  "manual",
]);
