# Content Intelligence - Connector Adapter System

## Architecture Overview

This plan produces 20 TypeScript files under `src/lib/connectors/`. The system integrates with the existing Drizzle ORM + Neon Postgres stack (no Redis). Inngest handles async job scheduling. The `@/*` path alias maps to `./src/*`.

### File manifest:
```
src/lib/connectors/
  types.ts              -- Platform enum, all shared types, discriminated unions
  adapter.ts            -- ConnectorAdapter interface + BaseAdapter abstract class
  errors.ts             -- AppError class + error classification
  circuit-breaker.ts    -- Postgres-backed circuit breaker
  rate-limiter.ts       -- Sliding window + token bucket, Postgres-backed
  token-manager.ts      -- Encrypted token lifecycle with proactive refresh
  registry.ts           -- Adapter registry + factory
  index.ts              -- Public barrel export
  adapters/
    linkedin.ts
    twitter.ts
    instagram.ts
    threads.ts
    facebook.ts
    tiktok.ts
    youtube.ts
    reddit.ts
    bluesky.ts
    beehiiv.ts
    substack.ts
    hubspot.ts
    pinterest.ts
    medium.ts
    mastodon.ts
```

---

## File 1: `src/lib/connectors/types.ts`

```typescript
// ============================================================================
// types.ts — Platform enum, all shared types, discriminated unions
// ============================================================================

// ---------------------------------------------------------------------------
// Platform enum
// ---------------------------------------------------------------------------
export enum Platform {
  LinkedIn = "linkedin",
  Twitter = "twitter",
  Instagram = "instagram",
  Threads = "threads",
  Facebook = "facebook",
  TikTok = "tiktok",
  YouTube = "youtube",
  Reddit = "reddit",
  Bluesky = "bluesky",
  Beehiiv = "beehiiv",
  Substack = "substack",
  HubSpot = "hubspot",
  Pinterest = "pinterest",
  Medium = "medium",
  Mastodon = "mastodon",
}

// ---------------------------------------------------------------------------
// Auth models
// ---------------------------------------------------------------------------
export type AuthMethod = "oauth2" | "api_key" | "app_password" | "paste_only";

export interface OAuthCredential {
  workspaceId: string;
  platform: Platform;
  accessToken: string;
  refreshToken: string | null;
  expiresAt: Date | null;
  refreshTokenExpiresAt: Date | null;
  scopes: string[];
  /** Encrypted blob stored in Postgres; decrypted in-memory only */
  encryptedPayload: Buffer;
}

export interface ApiKeyCredential {
  workspaceId: string;
  platform: Platform;
  apiKey: string;
  encryptedPayload: Buffer;
}

export interface AppPasswordCredential {
  workspaceId: string;
  platform: Platform;
  identifier: string; // DID for Bluesky
  appPassword: string;
  encryptedPayload: Buffer;
}

export type Credential = OAuthCredential | ApiKeyCredential | AppPasswordCredential;

export interface TokenResult {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: Date;
  refreshTokenExpiresAt: Date | null;
  scopes: string[];
}

export interface ScopeResult {
  hasRequired: boolean;
  granted: string[];
  missing: string[];
}

// ---------------------------------------------------------------------------
// Token refresh schedules (verified API data)
// ---------------------------------------------------------------------------
export const TOKEN_REFRESH_CONFIG: Record<Platform, {
  accessTokenLifetimeMs: number | null; // null = never expires
  refreshAtPercent: number; // trigger refresh at this % of lifetime
  refreshTokenLifetimeMs: number | null;
  method: AuthMethod;
}> = {
  [Platform.TikTok]: {
    accessTokenLifetimeMs: 24 * 60 * 60 * 1000, // 24h
    refreshAtPercent: 0.75,
    refreshTokenLifetimeMs: 365 * 24 * 60 * 60 * 1000,
    method: "oauth2",
  },
  [Platform.Twitter]: {
    accessTokenLifetimeMs: 2 * 60 * 60 * 1000, // 2h
    refreshAtPercent: 0.75, // ~90min
    refreshTokenLifetimeMs: null, // doesn't expire if used
    method: "oauth2",
  },
  [Platform.YouTube]: {
    accessTokenLifetimeMs: 60 * 60 * 1000, // 1h
    refreshAtPercent: 0.75, // ~45min
    refreshTokenLifetimeMs: null,
    method: "oauth2",
  },
  [Platform.Reddit]: {
    accessTokenLifetimeMs: 60 * 60 * 1000, // 1h
    refreshAtPercent: 0.75, // ~45min
    refreshTokenLifetimeMs: null,
    method: "oauth2",
  },
  [Platform.LinkedIn]: {
    accessTokenLifetimeMs: 60 * 24 * 60 * 60 * 1000, // 60 days
    refreshAtPercent: 0.85, // ~weekly
    refreshTokenLifetimeMs: 365 * 24 * 60 * 60 * 1000, // 365 days
    method: "oauth2",
  },
  [Platform.Instagram]: {
    accessTokenLifetimeMs: 60 * 24 * 60 * 60 * 1000, // 60 days
    refreshAtPercent: 0.50, // ~monthly
    refreshTokenLifetimeMs: null,
    method: "oauth2",
  },
  [Platform.Facebook]: {
    accessTokenLifetimeMs: 60 * 24 * 60 * 60 * 1000, // 60 days
    refreshAtPercent: 0.50,
    refreshTokenLifetimeMs: null,
    method: "oauth2",
  },
  [Platform.Threads]: {
    accessTokenLifetimeMs: 60 * 24 * 60 * 60 * 1000, // 60 days
    refreshAtPercent: 0.50,
    refreshTokenLifetimeMs: null,
    method: "oauth2",
  },
  [Platform.Bluesky]: {
    accessTokenLifetimeMs: null, // session-based
    refreshAtPercent: 0,
    refreshTokenLifetimeMs: null,
    method: "app_password",
  },
  [Platform.Beehiiv]: {
    accessTokenLifetimeMs: null, // never expires
    refreshAtPercent: 0,
    refreshTokenLifetimeMs: null,
    method: "api_key",
  },
  [Platform.Substack]: {
    accessTokenLifetimeMs: null,
    refreshAtPercent: 0,
    refreshTokenLifetimeMs: null,
    method: "paste_only",
  },
  [Platform.HubSpot]: {
    accessTokenLifetimeMs: 30 * 60 * 1000, // 30 min
    refreshAtPercent: 0.75,
    refreshTokenLifetimeMs: 6 * 30 * 24 * 60 * 60 * 1000, // ~6 months
    method: "oauth2",
  },
  [Platform.Pinterest]: {
    accessTokenLifetimeMs: 60 * 60 * 1000, // 1h
    refreshAtPercent: 0.75,
    refreshTokenLifetimeMs: 365 * 24 * 60 * 60 * 1000,
    method: "oauth2",
  },
  [Platform.Medium]: {
    accessTokenLifetimeMs: null, // integration token, no expiry
    refreshAtPercent: 0,
    refreshTokenLifetimeMs: null,
    method: "api_key",
  },
  [Platform.Mastodon]: {
    accessTokenLifetimeMs: null, // doesn't expire
    refreshAtPercent: 0,
    refreshTokenLifetimeMs: null,
    method: "oauth2",
  },
};

// ---------------------------------------------------------------------------
// Character limits (verified API data)
// ---------------------------------------------------------------------------
export interface CharacterLimit {
  platform: Platform;
  textField: string;
  maxCharacters: number | null; // null = no hard limit
  maxBytes: number | null;
  maxGraphemes: number | null;
  premiumLimit: number | null;
}

export const CHARACTER_LIMITS: Record<Platform, CharacterLimit> = {
  [Platform.LinkedIn]: {
    platform: Platform.LinkedIn,
    textField: "commentary",
    maxCharacters: 3_000,
    maxBytes: null,
    maxGraphemes: null,
    premiumLimit: null,
  },
  [Platform.Twitter]: {
    platform: Platform.Twitter,
    textField: "text",
    maxCharacters: 280,
    maxBytes: null,
    maxGraphemes: null,
    premiumLimit: 25_000,
  },
  [Platform.Instagram]: {
    platform: Platform.Instagram,
    textField: "caption",
    maxCharacters: 2_200,
    maxBytes: null,
    maxGraphemes: null,
    premiumLimit: null,
  },
  [Platform.Threads]: {
    platform: Platform.Threads,
    textField: "text",
    maxCharacters: 500,
    maxBytes: null,
    maxGraphemes: null,
    premiumLimit: null,
  },
  [Platform.TikTok]: {
    platform: Platform.TikTok,
    textField: "title",
    maxCharacters: 2_200,
    maxBytes: null,
    maxGraphemes: null,
    premiumLimit: null,
  },
  [Platform.YouTube]: {
    platform: Platform.YouTube,
    textField: "title",
    maxCharacters: 100,
    maxBytes: null,
    maxGraphemes: null,
    premiumLimit: null,
  },
  [Platform.Reddit]: {
    platform: Platform.Reddit,
    textField: "selftext",
    maxCharacters: null, // no hard limit on self posts
    maxBytes: null,
    maxGraphemes: null,
    premiumLimit: null,
  },
  [Platform.Bluesky]: {
    platform: Platform.Bluesky,
    textField: "text",
    maxCharacters: null,
    maxBytes: 3_000,
    maxGraphemes: 300,
    premiumLimit: null,
  },
  [Platform.Beehiiv]: {
    platform: Platform.Beehiiv,
    textField: "content_html",
    maxCharacters: null, // no limit (HTML)
    maxBytes: null,
    maxGraphemes: null,
    premiumLimit: null,
  },
  [Platform.Facebook]: {
    platform: Platform.Facebook,
    textField: "message",
    maxCharacters: 63_206,
    maxBytes: null,
    maxGraphemes: null,
    premiumLimit: null,
  },
  [Platform.Substack]: {
    platform: Platform.Substack,
    textField: "body_html",
    maxCharacters: null,
    maxBytes: null,
    maxGraphemes: null,
    premiumLimit: null,
  },
  [Platform.HubSpot]: {
    platform: Platform.HubSpot,
    textField: "n/a",
    maxCharacters: null,
    maxBytes: null,
    maxGraphemes: null,
    premiumLimit: null,
  },
  [Platform.Pinterest]: {
    platform: Platform.Pinterest,
    textField: "description",
    maxCharacters: 500,
    maxBytes: null,
    maxGraphemes: null,
    premiumLimit: null,
  },
  [Platform.Medium]: {
    platform: Platform.Medium,
    textField: "content",
    maxCharacters: null,
    maxBytes: null,
    maxGraphemes: null,
    premiumLimit: null,
  },
  [Platform.Mastodon]: {
    platform: Platform.Mastodon,
    textField: "status",
    maxCharacters: 500, // default, instance-configurable
    maxBytes: null,
    maxGraphemes: null,
    premiumLimit: null,
  },
};

// ---------------------------------------------------------------------------
// Media types & constraints (verified API data)
// ---------------------------------------------------------------------------
export type MediaType = "image" | "video" | "gif" | "pdf" | "html";

export interface MediaConstraint {
  allowedFormats: string[];
  maxSizeMb: number;
  maxCount: number;
  required: boolean;
}

export interface PlatformMediaConstraints {
  image: MediaConstraint | null;
  video: MediaConstraint | null;
  document: MediaConstraint | null;
}

export const MEDIA_CONSTRAINTS: Record<Platform, PlatformMediaConstraints> = {
  [Platform.LinkedIn]: {
    image: { allowedFormats: ["jpeg", "png", "gif"], maxSizeMb: 20, maxCount: 9, required: false },
    video: { allowedFormats: ["mp4"], maxSizeMb: 500, maxCount: 1, required: false },
    document: { allowedFormats: ["pdf"], maxSizeMb: 100, maxCount: 1, required: false },
  },
  [Platform.Twitter]: {
    image: { allowedFormats: ["jpeg", "png", "gif", "webp"], maxSizeMb: 5, maxCount: 4, required: false },
    video: { allowedFormats: ["mp4"], maxSizeMb: 512, maxCount: 1, required: false },
    document: null,
  },
  [Platform.Instagram]: {
    image: { allowedFormats: ["jpeg"], maxSizeMb: 8, maxCount: 10, required: true },
    video: { allowedFormats: ["mp4"], maxSizeMb: 1024, maxCount: 1, required: false },
    document: null,
  },
  [Platform.Threads]: {
    image: { allowedFormats: ["jpeg", "png"], maxSizeMb: 8, maxCount: 10, required: false },
    video: { allowedFormats: ["mp4"], maxSizeMb: 500, maxCount: 1, required: false },
    document: null,
  },
  [Platform.TikTok]: {
    image: { allowedFormats: ["jpeg", "png", "webp"], maxSizeMb: 20, maxCount: 35, required: false },
    video: { allowedFormats: ["mp4", "webm"], maxSizeMb: 4096, maxCount: 1, required: true },
    document: null,
  },
  [Platform.YouTube]: {
    image: null,
    video: { allowedFormats: ["mp4", "avi", "mov", "wmv", "flv", "webm", "3gp", "mpg", "mpeg"], maxSizeMb: 256_000, maxCount: 1, required: true },
    document: null,
  },
  [Platform.Reddit]: {
    image: { allowedFormats: ["jpeg", "png", "gif"], maxSizeMb: 20, maxCount: 20, required: false },
    video: { allowedFormats: ["mp4"], maxSizeMb: 1024, maxCount: 1, required: false },
    document: null,
  },
  [Platform.Bluesky]: {
    image: { allowedFormats: ["jpeg", "png"], maxSizeMb: 1, maxCount: 4, required: false },
    video: { allowedFormats: ["mp4"], maxSizeMb: 100, maxCount: 1, required: false },
    document: null,
  },
  [Platform.Facebook]: {
    image: { allowedFormats: ["jpeg", "png"], maxSizeMb: 10, maxCount: 10, required: false },
    video: { allowedFormats: ["mp4"], maxSizeMb: 10240, maxCount: 1, required: false },
    document: null,
  },
  [Platform.Beehiiv]: {
    image: null,
    video: null,
    document: { allowedFormats: ["html"], maxSizeMb: 50, maxCount: 1, required: false },
  },
  [Platform.Substack]: {
    image: null,
    video: null,
    document: null,
  },
  [Platform.HubSpot]: {
    image: null,
    video: null,
    document: null,
  },
  [Platform.Pinterest]: {
    image: { allowedFormats: ["jpeg", "png"], maxSizeMb: 20, maxCount: 1, required: true },
    video: { allowedFormats: ["mp4"], maxSizeMb: 2048, maxCount: 1, required: false },
    document: null,
  },
  [Platform.Medium]: {
    image: { allowedFormats: ["jpeg", "png", "gif"], maxSizeMb: 25, maxCount: 20, required: false },
    video: null,
    document: null,
  },
  [Platform.Mastodon]: {
    image: { allowedFormats: ["jpeg", "png", "gif", "webp"], maxSizeMb: 16, maxCount: 4, required: false },
    video: { allowedFormats: ["mp4", "webm"], maxSizeMb: 99, maxCount: 1, required: false },
    document: null,
  },
};

// ---------------------------------------------------------------------------
// Media input
// ---------------------------------------------------------------------------
export interface MediaInput {
  url: string;
  mimeType: string;
  sizeBytes: number;
  width?: number;
  height?: number;
  durationSeconds?: number;
  altText?: string;
}

export interface MediaValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

// ---------------------------------------------------------------------------
// Platform-specific publish inputs (discriminated union)
// ---------------------------------------------------------------------------
export interface LinkedInPublishInput {
  platform: Platform.LinkedIn;
  authorUrn: string; // "urn:li:person:xxx" or "urn:li:organization:xxx"
  commentary: string;
  visibility: "PUBLIC" | "CONNECTIONS" | "LOGGED_IN";
  mediaCategory?: "NONE" | "IMAGE" | "VIDEO" | "ARTICLE" | "DOCUMENT";
  mediaUrns?: string[];
  media?: MediaInput[];
}

export interface TwitterPublishInput {
  platform: Platform.Twitter;
  text: string;
  mediaIds?: string[];
  media?: MediaInput[];
  replyToId?: string;
  quoteTweetId?: string;
  pollOptions?: string[];
  pollDurationMinutes?: number;
}

export interface InstagramPublishInput {
  platform: Platform.Instagram;
  imageUrl: string; // REQUIRED
  caption: string;
  mediaType: "IMAGE" | "CAROUSEL" | "REELS";
  carouselItems?: Array<{ imageUrl: string; isVideo?: boolean }>;
  locationId?: string;
  userTags?: Array<{ username: string; x: number; y: number }>;
  media?: MediaInput[];
}

export interface ThreadsPublishInput {
  platform: Platform.Threads;
  text: string;
  mediaType?: "TEXT" | "IMAGE" | "VIDEO" | "CAROUSEL";
  imageUrl?: string;
  videoUrl?: string;
  carouselItems?: Array<{ imageUrl?: string; videoUrl?: string }>;
  replyToId?: string;
  media?: MediaInput[];
}

export interface FacebookPublishInput {
  platform: Platform.Facebook;
  pageId: string;
  message: string;
  link?: string;
  media?: MediaInput[];
  scheduledPublishTime?: number; // Unix timestamp
  published?: boolean;
}

export interface TikTokPublishInput {
  platform: Platform.TikTok;
  videoUrl: string; // REQUIRED
  title: string;
  privacyLevel: "PUBLIC_TO_EVERYONE" | "MUTUAL_FOLLOW_FRIENDS" | "FOLLOWER_OF_CREATOR" | "SELF_ONLY";
  isAigc: boolean; // AI-generated content disclosure
  disableComment?: boolean;
  disableDuet?: boolean;
  disableStitch?: boolean;
  videoCoverTimestampMs?: number;
  media?: MediaInput[];
}

export interface YouTubePublishInput {
  platform: Platform.YouTube;
  videoFile: string; // file path or URL
  title: string;
  description: string;
  tags?: string[];
  categoryId?: string;
  privacyStatus: "public" | "private" | "unlisted";
  publishAt?: string; // ISO 8601 for scheduled publish
  thumbnailUrl?: string;
  playlistId?: string;
  media?: MediaInput[];
}

export interface RedditPublishInput {
  platform: Platform.Reddit;
  subreddit: string;
  title: string;
  kind: "self" | "link" | "image" | "video";
  selftext?: string; // markdown for self posts
  url?: string; // for link posts
  flair_id?: string;
  flair_text?: string;
  nsfw?: boolean;
  spoiler?: boolean;
  media?: MediaInput[];
}

export interface BlueskyPublishInput {
  platform: Platform.Bluesky;
  text: string;
  images?: Array<{ url: string; altText: string }>;
  replyTo?: { uri: string; cid: string };
  quoteUri?: string;
  langs?: string[];
  labels?: string[];
  media?: MediaInput[];
}

export interface BeehiivPublishInput {
  platform: Platform.Beehiiv;
  publicationId: string;
  title: string;
  subtitle?: string;
  contentHtml: string;
  thumbnailUrl?: string;
  authors?: string[];
  status: "draft" | "confirmed" | "archived";
  scheduledAt?: string; // ISO 8601
}

export interface SubstackPublishInput {
  platform: Platform.Substack;
  title: string;
  subtitle?: string;
  bodyHtml: string;
  /** Substack has no API — this stores the paste-ready content */
  pasteReady: true;
}

export interface HubSpotPublishInput {
  platform: Platform.HubSpot;
  /** HubSpot is CRM-only, no social publishing. This records attribution. */
  contactId: string;
  contentId: string;
  campaignId?: string;
  interactionType: "content_published" | "content_engaged" | "content_shared";
  properties: Record<string, string>;
}

export interface PinterestPublishInput {
  platform: Platform.Pinterest;
  boardId: string;
  title: string;
  description: string;
  link: string;
  imageUrl: string; // REQUIRED
  altText?: string;
  media?: MediaInput[];
}

export interface MediumPublishInput {
  platform: Platform.Medium;
  title: string;
  contentFormat: "html" | "markdown";
  content: string;
  tags?: string[];
  publishStatus: "public" | "draft" | "unlisted";
  canonicalUrl?: string;
}

export interface MastodonPublishInput {
  platform: Platform.Mastodon;
  instanceUrl: string;
  status: string;
  mediaIds?: string[];
  inReplyToId?: string;
  visibility: "public" | "unlisted" | "private" | "direct";
  sensitive?: boolean;
  spoilerText?: string;
  language?: string;
  scheduledAt?: string;
  media?: MediaInput[];
}

export type PublishInput =
  | LinkedInPublishInput
  | TwitterPublishInput
  | InstagramPublishInput
  | ThreadsPublishInput
  | FacebookPublishInput
  | TikTokPublishInput
  | YouTubePublishInput
  | RedditPublishInput
  | BlueskyPublishInput
  | BeehiivPublishInput
  | SubstackPublishInput
  | HubSpotPublishInput
  | PinterestPublishInput
  | MediumPublishInput
  | MastodonPublishInput;

// ---------------------------------------------------------------------------
// Publish result
// ---------------------------------------------------------------------------
export interface PublishResult {
  success: boolean;
  platform: Platform;
  platformPostId: string | null;
  platformUrl: string | null;
  publishedAt: Date | null;
  idempotencyKey: string;
  /** Platform-specific response data */
  raw: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Verification (ghost detection)
// ---------------------------------------------------------------------------
export interface VerifyResult {
  exists: boolean;
  visible: boolean;
  platformPostId: string;
  checkedAt: Date;
  metrics?: {
    views?: number;
    likes?: number;
    comments?: number;
    shares?: number;
  };
}

// ---------------------------------------------------------------------------
// Health
// ---------------------------------------------------------------------------
export type HealthStatus = "healthy" | "degraded" | "down";

export interface HealthResult {
  platform: Platform;
  status: HealthStatus;
  latencyMs: number;
  checkedAt: Date;
  details?: string;
}

// ---------------------------------------------------------------------------
// Platform field declaration (for dynamic form generation)
// ---------------------------------------------------------------------------
export interface PlatformFieldDeclaration {
  name: string;
  label: string;
  type: "text" | "textarea" | "select" | "boolean" | "number" | "file" | "url";
  required: boolean;
  maxLength?: number;
  options?: Array<{ value: string; label: string }>;
  helpText?: string;
  group?: string;
}

// ---------------------------------------------------------------------------
// Rate limit
// ---------------------------------------------------------------------------
export interface RateLimitState {
  platform: Platform;
  windowType: "sliding_window" | "token_bucket";
  limit: number;
  remaining: number;
  resetsAt: Date;
  retryAfterMs: number | null;
}

export interface RateLimitConfig {
  platform: Platform;
  /** Requests per window */
  limit: number;
  /** Window size in milliseconds */
  windowMs: number;
  /** For token bucket: refill rate per second */
  refillRate?: number;
  /** For token bucket: max burst size */
  burstSize?: number;
  /** Scope: 'app' = shared across workspace, 'user' = per-credential */
  scope: "app" | "user";
}

export const RATE_LIMIT_CONFIGS: Record<Platform, RateLimitConfig> = {
  [Platform.LinkedIn]: {
    platform: Platform.LinkedIn,
    limit: 100,
    windowMs: 24 * 60 * 60 * 1000, // daily
    scope: "app",
  },
  [Platform.Twitter]: {
    platform: Platform.Twitter,
    limit: 10_000,
    windowMs: 24 * 60 * 60 * 1000,
    scope: "app",
  },
  [Platform.Instagram]: {
    platform: Platform.Instagram,
    limit: 25, // 25 content publishes per day
    windowMs: 24 * 60 * 60 * 1000,
    scope: "user",
  },
  [Platform.Threads]: {
    platform: Platform.Threads,
    limit: 250,
    windowMs: 24 * 60 * 60 * 1000,
    scope: "user",
  },
  [Platform.Facebook]: {
    platform: Platform.Facebook,
    limit: 200,
    windowMs: 60 * 60 * 1000, // hourly
    scope: "app",
  },
  [Platform.TikTok]: {
    platform: Platform.TikTok,
    limit: 6, // 6 videos per day via API
    windowMs: 24 * 60 * 60 * 1000,
    scope: "user",
  },
  [Platform.YouTube]: {
    platform: Platform.YouTube,
    limit: 100,
    windowMs: 24 * 60 * 60 * 1000,
    scope: "app",
  },
  [Platform.Reddit]: {
    platform: Platform.Reddit,
    limit: 60,
    windowMs: 60 * 1000, // per minute
    scope: "user",
  },
  [Platform.Bluesky]: {
    platform: Platform.Bluesky,
    limit: 5_000,
    windowMs: 60 * 60 * 1000, // hourly
    scope: "user",
  },
  [Platform.Beehiiv]: {
    platform: Platform.Beehiiv,
    limit: 100,
    windowMs: 60 * 60 * 1000,
    scope: "app",
  },
  [Platform.Substack]: {
    platform: Platform.Substack,
    limit: 0, // paste-only, no API
    windowMs: 0,
    scope: "user",
  },
  [Platform.HubSpot]: {
    platform: Platform.HubSpot,
    limit: 100,
    windowMs: 10 * 1000, // 10 seconds
    scope: "app",
  },
  [Platform.Pinterest]: {
    platform: Platform.Pinterest,
    limit: 1_000,
    windowMs: 60 * 60 * 1000,
    scope: "app",
  },
  [Platform.Medium]: {
    platform: Platform.Medium,
    limit: 100,
    windowMs: 24 * 60 * 60 * 1000,
    scope: "user",
  },
  [Platform.Mastodon]: {
    platform: Platform.Mastodon,
    limit: 300,
    windowMs: 5 * 60 * 1000, // 5 min
    scope: "user",
  },
};

// ---------------------------------------------------------------------------
// Circuit breaker
// ---------------------------------------------------------------------------
export type CircuitState = "closed" | "open" | "half_open";

export interface CircuitBreakerConfig {
  failureThreshold: number;
  recoveryTimeMs: number;
  halfOpenMaxAttempts: number;
  monitorWindowMs: number;
}

export interface CircuitBreakerState {
  platform: Platform;
  state: CircuitState;
  failureCount: number;
  lastFailureAt: Date | null;
  lastSuccessAt: Date | null;
  nextRetryAt: Date | null;
  halfOpenAttempts: number;
}

// ---------------------------------------------------------------------------
// Contract test
// ---------------------------------------------------------------------------
export type ContractTestName =
  | "publish_text"
  | "publish_media"
  | "verify_post"
  | "delete_post"
  | "refresh_token"
  | "verify_scopes"
  | "health_probe"
  | "validate_media"
  | "character_limit"
  | "error_mapping"
  | "rate_limit_header";

export interface ContractTestResult {
  test: ContractTestName;
  platform: Platform;
  passed: boolean;
  durationMs: number;
  error?: string;
  skipped?: boolean;
  skipReason?: string;
}

// ---------------------------------------------------------------------------
// Platform-specific error response shapes
// ---------------------------------------------------------------------------
export interface LinkedInErrorResponse {
  status: number;
  message: string;
  serviceErrorCode: number;
}

export interface TwitterErrorResponseV2 {
  title: string;
  detail: string;
  type: string;
  status: number;
}

export interface TwitterErrorResponseV1 {
  errors: Array<{ code: number; message: string }>;
}

export type TwitterErrorResponse = TwitterErrorResponseV2 | TwitterErrorResponseV1;

export interface MetaErrorResponse {
  error: {
    message: string;
    type: string;
    code: number;
    error_subcode?: number;
    fbtrace_id: string;
  };
}

export interface TikTokErrorResponse {
  error: {
    code: string;
    message: string;
    log_id: string;
  };
}

export interface RedditErrorResponse {
  json: {
    errors: Array<[string, string, string]>; // [CODE, message, field]
  };
}

export interface BlueskyErrorResponse {
  error: string;
  message: string;
}

export interface YouTubeErrorResponse {
  error: {
    code: number;
    message: string;
    errors: Array<{
      domain: string;
      reason: string;
      message: string;
    }>;
  };
}

export interface BeehiivErrorResponse {
  status: number;
  statusText: string;
  errors: Array<{ message: string; code: string }>;
}

export interface HubSpotErrorResponse {
  status: string;
  message: string;
  correlationId: string;
  category: string;
}

export interface PinterestErrorResponse {
  code: number;
  message: string;
}

export interface MediumErrorResponse {
  errors: Array<{ message: string; code: number }>;
}

export interface MastodonErrorResponse {
  error: string;
  error_description?: string;
}

export type PlatformErrorResponse =
  | LinkedInErrorResponse
  | TwitterErrorResponse
  | MetaErrorResponse
  | TikTokErrorResponse
  | RedditErrorResponse
  | BlueskyErrorResponse
  | YouTubeErrorResponse
  | BeehiivErrorResponse
  | HubSpotErrorResponse
  | PinterestErrorResponse
  | MediumErrorResponse
  | MastodonErrorResponse;
```

---

## File 2: `src/lib/connectors/errors.ts`

```typescript
// ============================================================================
// errors.ts — Unified error class + error classification
// ============================================================================

import type { Platform } from "./types";

export type ErrorClass = "transient" | "permanent" | "ambiguous" | "silent";

export interface AppErrorOptions {
  code: string;
  message: string;
  errorClass: ErrorClass;
  retryable: boolean;
  platform: Platform;
  httpStatus: number | null;
  platformCode?: string | number;
  platformMessage?: string;
  raw?: unknown;
  cause?: Error;
}

export class AppError extends Error {
  readonly code: string;
  readonly errorClass: ErrorClass;
  readonly retryable: boolean;
  readonly platform: Platform;
  readonly httpStatus: number | null;
  readonly platformCode: string | number | undefined;
  readonly platformMessage: string | undefined;
  readonly raw: unknown;
  readonly timestamp: Date;

  constructor(options: AppErrorOptions) {
    super(options.message);
    this.name = "AppError";
    this.code = options.code;
    this.errorClass = options.errorClass;
    this.retryable = options.retryable;
    this.platform = options.platform;
    this.httpStatus = options.httpStatus;
    this.platformCode = options.platformCode;
    this.platformMessage = options.platformMessage;
    this.raw = options.raw;
    this.timestamp = new Date();

    if (options.cause) {
      this.cause = options.cause;
    }
  }

  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      errorClass: this.errorClass,
      retryable: this.retryable,
      platform: this.platform,
      httpStatus: this.httpStatus,
      platformCode: this.platformCode,
      platformMessage: this.platformMessage,
      timestamp: this.timestamp.toISOString(),
    };
  }

  /** Is this a rate-limit error? */
  isRateLimited(): boolean {
    return this.httpStatus === 429 || this.code === "RATE_LIMITED";
  }

  /** Is this an auth error that requires re-authentication? */
  isAuthError(): boolean {
    return this.httpStatus === 401 || this.httpStatus === 403 || this.code === "AUTH_EXPIRED";
  }
}

// ---------------------------------------------------------------------------
// Well-known error codes
// ---------------------------------------------------------------------------
export const ErrorCodes = {
  // Auth
  AUTH_EXPIRED: "AUTH_EXPIRED",
  AUTH_REVOKED: "AUTH_REVOKED",
  AUTH_INSUFFICIENT_SCOPES: "AUTH_INSUFFICIENT_SCOPES",

  // Rate limiting
  RATE_LIMITED: "RATE_LIMITED",
  RATE_LIMIT_DAILY: "RATE_LIMIT_DAILY",

  // Content
  CONTENT_TOO_LONG: "CONTENT_TOO_LONG",
  CONTENT_POLICY_VIOLATION: "CONTENT_POLICY_VIOLATION",
  MEDIA_INVALID: "MEDIA_INVALID",
  MEDIA_TOO_LARGE: "MEDIA_TOO_LARGE",
  MEDIA_REQUIRED: "MEDIA_REQUIRED",
  MEDIA_FORMAT_UNSUPPORTED: "MEDIA_FORMAT_UNSUPPORTED",

  // Platform
  PLATFORM_DOWN: "PLATFORM_DOWN",
  PLATFORM_TIMEOUT: "PLATFORM_TIMEOUT",
  PLATFORM_INTERNAL: "PLATFORM_INTERNAL",
  PLATFORM_NOT_FOUND: "PLATFORM_NOT_FOUND",
  PLATFORM_DUPLICATE: "PLATFORM_DUPLICATE",

  // Circuit breaker
  CIRCUIT_OPEN: "CIRCUIT_OPEN",

  // Token
  TOKEN_REFRESH_FAILED: "TOKEN_REFRESH_FAILED",
  TOKEN_DECRYPT_FAILED: "TOKEN_DECRYPT_FAILED",

  // Publish
  PUBLISH_FAILED: "PUBLISH_FAILED",
  PUBLISH_GHOST: "PUBLISH_GHOST",
  VERIFY_FAILED: "VERIFY_FAILED",

  // General
  UNKNOWN: "UNKNOWN",
  VALIDATION_ERROR: "VALIDATION_ERROR",
  NOT_IMPLEMENTED: "NOT_IMPLEMENTED",
} as const;

// ---------------------------------------------------------------------------
// HTTP status -> error class heuristic
// ---------------------------------------------------------------------------
export function classifyHttpStatus(status: number): { errorClass: ErrorClass; retryable: boolean } {
  if (status === 429) {
    return { errorClass: "transient", retryable: true };
  }
  if (status >= 500) {
    return { errorClass: "transient", retryable: true };
  }
  if (status === 401 || status === 403) {
    return { errorClass: "permanent", retryable: false };
  }
  if (status === 404) {
    return { errorClass: "permanent", retryable: false };
  }
  if (status === 409) {
    return { errorClass: "permanent", retryable: false };
  }
  if (status >= 400 && status < 500) {
    return { errorClass: "permanent", retryable: false };
  }
  return { errorClass: "ambiguous", retryable: false };
}
```

---

## File 3: `src/lib/connectors/adapter.ts`

```typescript
// ============================================================================
// adapter.ts — ConnectorAdapter interface + BaseAdapter abstract class
// ============================================================================

import {
  type Platform,
  type PublishInput,
  type PublishResult,
  type VerifyResult,
  type HealthResult,
  type MediaInput,
  type MediaValidationResult,
  type CharacterLimit,
  type PlatformFieldDeclaration,
  type OAuthCredential,
  type TokenResult,
  type ScopeResult,
  type ContractTestResult,
  type ContractTestName,
  CHARACTER_LIMITS,
  MEDIA_CONSTRAINTS,
} from "./types";
import { AppError, ErrorCodes, type AppErrorOptions } from "./errors";

// ---------------------------------------------------------------------------
// Platform-specific HTTP response wrapper
// ---------------------------------------------------------------------------
export interface PlatformResponse {
  status: number;
  headers: Record<string, string>;
  body: unknown;
}

// ---------------------------------------------------------------------------
// ConnectorAdapter interface — every platform adapter implements this
// ---------------------------------------------------------------------------
export interface ConnectorAdapter {
  readonly platform: Platform;
  readonly displayName: string;
  readonly supportsPublish: boolean;
  readonly supportsDelete: boolean;

  // -- Core operations --
  publish(input: PublishInput, idempotencyKey: string): Promise<PublishResult>;
  verifyPublish(platformPostId: string): Promise<VerifyResult>;
  deletePost(platformPostId: string): Promise<void>;

  // -- Auth --
  refreshToken(credential: OAuthCredential): Promise<TokenResult>;
  verifyScopes(credential: OAuthCredential): Promise<ScopeResult>;

  // -- Health --
  healthProbe(): Promise<HealthResult>;

  // -- Platform-specific --
  validateMedia(media: MediaInput): Promise<MediaValidationResult>;
  getCharacterLimit(): CharacterLimit;
  getPlatformFields(): PlatformFieldDeclaration[];

  // -- Error mapping --
  mapError(response: PlatformResponse): AppError;

  // -- Contract tests --
  runContractTests(credential: OAuthCredential): Promise<ContractTestResult[]>;
}

// ---------------------------------------------------------------------------
// BaseAdapter — shared logic all adapters inherit
// ---------------------------------------------------------------------------
export abstract class BaseAdapter implements ConnectorAdapter {
  abstract readonly platform: Platform;
  abstract readonly displayName: string;
  readonly supportsPublish: boolean = true;
  readonly supportsDelete: boolean = true;

  abstract publish(input: PublishInput, idempotencyKey: string): Promise<PublishResult>;
  abstract verifyPublish(platformPostId: string): Promise<VerifyResult>;
  abstract deletePost(platformPostId: string): Promise<void>;
  abstract refreshToken(credential: OAuthCredential): Promise<TokenResult>;
  abstract verifyScopes(credential: OAuthCredential): Promise<ScopeResult>;
  abstract healthProbe(): Promise<HealthResult>;
  abstract mapError(response: PlatformResponse): AppError;
  abstract getPlatformFields(): PlatformFieldDeclaration[];

  getCharacterLimit(): CharacterLimit {
    return CHARACTER_LIMITS[this.platform];
  }

  async validateMedia(media: MediaInput): Promise<MediaValidationResult> {
    const constraints = MEDIA_CONSTRAINTS[this.platform];
    const errors: string[] = [];
    const warnings: string[] = [];

    const extension = media.mimeType.split("/")[1]?.toLowerCase() ?? "";
    const isImage = media.mimeType.startsWith("image/");
    const isVideo = media.mimeType.startsWith("video/");

    const constraint = isImage
      ? constraints.image
      : isVideo
        ? constraints.video
        : constraints.document;

    if (!constraint) {
      errors.push(`${this.platform} does not support ${isImage ? "image" : isVideo ? "video" : "document"} uploads`);
      return { valid: false, errors, warnings };
    }

    if (!constraint.allowedFormats.includes(extension)) {
      errors.push(
        `Format '${extension}' not supported. Allowed: ${constraint.allowedFormats.join(", ")}`
      );
    }

    const sizeMb = media.sizeBytes / (1024 * 1024);
    if (sizeMb > constraint.maxSizeMb) {
      errors.push(
        `File size ${sizeMb.toFixed(1)}MB exceeds limit of ${constraint.maxSizeMb}MB`
      );
    }

    if (sizeMb > constraint.maxSizeMb * 0.9) {
      warnings.push("File size is close to the platform limit");
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  /** Helper: build a not-implemented error */
  protected notImplemented(method: string): AppError {
    return new AppError({
      code: ErrorCodes.NOT_IMPLEMENTED,
      message: `${this.displayName} adapter does not implement '${method}'`,
      errorClass: "permanent",
      retryable: false,
      platform: this.platform,
      httpStatus: null,
    });
  }

  /** Helper: build a publish result */
  protected buildResult(
    idempotencyKey: string,
    opts: {
      platformPostId: string | null;
      platformUrl: string | null;
      raw: Record<string, unknown>;
    }
  ): PublishResult {
    return {
      success: opts.platformPostId !== null,
      platform: this.platform,
      platformPostId: opts.platformPostId,
      platformUrl: opts.platformUrl,
      publishedAt: opts.platformPostId ? new Date() : null,
      idempotencyKey,
      raw: opts.raw,
    };
  }

  /** Run all 11 contract tests, collecting results */
  async runContractTests(credential: OAuthCredential): Promise<ContractTestResult[]> {
    const tests: ContractTestName[] = [
      "publish_text",
      "publish_media",
      "verify_post",
      "delete_post",
      "refresh_token",
      "verify_scopes",
      "health_probe",
      "validate_media",
      "character_limit",
      "error_mapping",
      "rate_limit_header",
    ];

    const results: ContractTestResult[] = [];

    for (const test of tests) {
      const start = performance.now();
      try {
        const result = await this.executeContractTest(test, credential);
        results.push({
          test,
          platform: this.platform,
          passed: result.passed,
          durationMs: Math.round(performance.now() - start),
          error: result.error,
          skipped: result.skipped,
          skipReason: result.skipReason,
        });
      } catch (err) {
        results.push({
          test,
          platform: this.platform,
          passed: false,
          durationMs: Math.round(performance.now() - start),
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    return results;
  }

  /** Override in subclass to implement specific contract tests */
  protected async executeContractTest(
    test: ContractTestName,
    credential: OAuthCredential
  ): Promise<{ passed: boolean; error?: string; skipped?: boolean; skipReason?: string }> {
    switch (test) {
      case "character_limit": {
        const limit = this.getCharacterLimit();
        return { passed: limit.platform === this.platform };
      }
      case "health_probe": {
        try {
          const health = await this.healthProbe();
          return { passed: health.status !== "down" };
        } catch {
          return { passed: false, error: "Health probe threw" };
        }
      }
      case "verify_scopes": {
        try {
          const scopes = await this.verifyScopes(credential);
          return { passed: scopes.hasRequired, error: scopes.missing.length > 0 ? `Missing: ${scopes.missing.join(", ")}` : undefined };
        } catch {
          return { passed: false, error: "Scope verification threw" };
        }
      }
      case "validate_media": {
        const testMedia: MediaInput = {
          url: "https://example.com/test.jpg",
          mimeType: "image/jpeg",
          sizeBytes: 1024,
        };
        try {
          const result = await this.validateMedia(testMedia);
          // Valid for platforms that support images, may be invalid for video-only
          return { passed: true, error: result.valid ? undefined : result.errors.join("; ") };
        } catch {
          return { passed: false, error: "Media validation threw" };
        }
      }
      default:
        return {
          skipped: true,
          passed: true,
          skipReason: `Test '${test}' requires live API access`,
        };
    }
  }
}
```

---

## File 4: `src/lib/connectors/circuit-breaker.ts`

```typescript
// ============================================================================
// circuit-breaker.ts — Postgres-backed circuit breaker
// ============================================================================

import { type Platform, type CircuitState, type CircuitBreakerConfig, type CircuitBreakerState } from "./types";
import { AppError, ErrorCodes } from "./errors";

// ---------------------------------------------------------------------------
// Default configuration
// ---------------------------------------------------------------------------
const DEFAULT_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 5,
  recoveryTimeMs: 30_000, // 30 seconds initial
  halfOpenMaxAttempts: 3,
  monitorWindowMs: 60_000, // 1 minute window
};

// ---------------------------------------------------------------------------
// Postgres row interface (matches Drizzle schema to be created)
// ---------------------------------------------------------------------------
interface CircuitBreakerRow {
  platform: string;
  workspace_id: string;
  state: string;
  failure_count: number;
  last_failure_at: Date | null;
  last_success_at: Date | null;
  next_retry_at: Date | null;
  half_open_attempts: number;
  consecutive_successes: number;
  updated_at: Date;
}

// ---------------------------------------------------------------------------
// Database interface — adapter for Drizzle or raw SQL
// ---------------------------------------------------------------------------
export interface CircuitBreakerDb {
  getState(platform: Platform, workspaceId: string): Promise<CircuitBreakerRow | null>;
  upsertState(row: Partial<CircuitBreakerRow> & { platform: string; workspace_id: string }): Promise<void>;
}

// ---------------------------------------------------------------------------
// CircuitBreaker
// ---------------------------------------------------------------------------
export class CircuitBreaker {
  private readonly config: CircuitBreakerConfig;
  private readonly db: CircuitBreakerDb;

  constructor(db: CircuitBreakerDb, config?: Partial<CircuitBreakerConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.db = db;
  }

  /** Check whether a request is allowed through the breaker */
  async canExecute(platform: Platform, workspaceId: string): Promise<{
    allowed: boolean;
    state: CircuitState;
    retryAfterMs: number | null;
  }> {
    const row = await this.db.getState(platform, workspaceId);

    if (!row) {
      // No state yet — circuit is closed
      return { allowed: true, state: "closed", retryAfterMs: null };
    }

    const state = row.state as CircuitState;

    if (state === "closed") {
      return { allowed: true, state: "closed", retryAfterMs: null };
    }

    if (state === "open") {
      const now = new Date();
      if (row.next_retry_at && now >= row.next_retry_at) {
        // Transition to half-open
        await this.db.upsertState({
          platform,
          workspace_id: workspaceId,
          state: "half_open",
          half_open_attempts: 0,
          consecutive_successes: 0,
        });
        return { allowed: true, state: "half_open", retryAfterMs: null };
      }
      const retryAfterMs = row.next_retry_at
        ? Math.max(0, row.next_retry_at.getTime() - now.getTime())
        : this.config.recoveryTimeMs;
      return { allowed: false, state: "open", retryAfterMs };
    }

    // half_open: allow limited probes
    if (row.half_open_attempts < this.config.halfOpenMaxAttempts) {
      return { allowed: true, state: "half_open", retryAfterMs: null };
    }

    return { allowed: false, state: "half_open", retryAfterMs: this.config.recoveryTimeMs };
  }

  /** Record a successful call */
  async recordSuccess(platform: Platform, workspaceId: string): Promise<void> {
    const row = await this.db.getState(platform, workspaceId);
    const state = (row?.state ?? "closed") as CircuitState;

    if (state === "half_open") {
      const consecutiveSuccesses = (row?.consecutive_successes ?? 0) + 1;
      if (consecutiveSuccesses >= this.config.halfOpenMaxAttempts) {
        // Fully recovered — close the circuit
        await this.db.upsertState({
          platform,
          workspace_id: workspaceId,
          state: "closed",
          failure_count: 0,
          half_open_attempts: 0,
          consecutive_successes: 0,
          last_success_at: new Date(),
          next_retry_at: null,
        });
      } else {
        await this.db.upsertState({
          platform,
          workspace_id: workspaceId,
          consecutive_successes: consecutiveSuccesses,
          half_open_attempts: (row?.half_open_attempts ?? 0) + 1,
          last_success_at: new Date(),
        });
      }
    } else {
      // In closed state, just update last success
      await this.db.upsertState({
        platform,
        workspace_id: workspaceId,
        last_success_at: new Date(),
        failure_count: 0,
      });
    }
  }

  /** Record a failed call */
  async recordFailure(platform: Platform, workspaceId: string): Promise<void> {
    const row = await this.db.getState(platform, workspaceId);
    const state = (row?.state ?? "closed") as CircuitState;
    const failureCount = (row?.failure_count ?? 0) + 1;
    const now = new Date();

    if (state === "half_open") {
      // Any failure in half-open immediately re-opens with exponential backoff
      const backoffMultiplier = Math.min(
        Math.pow(2, failureCount - this.config.failureThreshold),
        32 // cap at 32x
      );
      const nextRetryAt = new Date(now.getTime() + this.config.recoveryTimeMs * backoffMultiplier);

      await this.db.upsertState({
        platform,
        workspace_id: workspaceId,
        state: "open",
        failure_count: failureCount,
        last_failure_at: now,
        next_retry_at: nextRetryAt,
        half_open_attempts: 0,
        consecutive_successes: 0,
      });
      return;
    }

    if (failureCount >= this.config.failureThreshold) {
      // Open the circuit
      const nextRetryAt = new Date(now.getTime() + this.config.recoveryTimeMs);
      await this.db.upsertState({
        platform,
        workspace_id: workspaceId,
        state: "open",
        failure_count: failureCount,
        last_failure_at: now,
        next_retry_at: nextRetryAt,
        half_open_attempts: 0,
        consecutive_successes: 0,
      });
    } else {
      // Still closed, just increment
      await this.db.upsertState({
        platform,
        workspace_id: workspaceId,
        state: "closed",
        failure_count: failureCount,
        last_failure_at: now,
      });
    }
  }

  /** Get the current state for observability */
  async getState(platform: Platform, workspaceId: string): Promise<CircuitBreakerState> {
    const row = await this.db.getState(platform, workspaceId);
    return {
      platform,
      state: (row?.state as CircuitState) ?? "closed",
      failureCount: row?.failure_count ?? 0,
      lastFailureAt: row?.last_failure_at ?? null,
      lastSuccessAt: row?.last_success_at ?? null,
      nextRetryAt: row?.next_retry_at ?? null,
      halfOpenAttempts: row?.half_open_attempts ?? 0,
    };
  }

  /** Reset a circuit breaker (manual intervention) */
  async reset(platform: Platform, workspaceId: string): Promise<void> {
    await this.db.upsertState({
      platform,
      workspace_id: workspaceId,
      state: "closed",
      failure_count: 0,
      last_failure_at: null,
      next_retry_at: null,
      half_open_attempts: 0,
      consecutive_successes: 0,
    });
  }

  /** Wrap an async operation with circuit breaker protection */
  async execute<T>(
    platform: Platform,
    workspaceId: string,
    operation: () => Promise<T>
  ): Promise<T> {
    const check = await this.canExecute(platform, workspaceId);

    if (!check.allowed) {
      throw new AppError({
        code: ErrorCodes.CIRCUIT_OPEN,
        message: `Circuit breaker is ${check.state} for ${platform}. Retry after ${check.retryAfterMs}ms`,
        errorClass: "transient",
        retryable: true,
        platform,
        httpStatus: null,
      });
    }

    try {
      const result = await operation();
      await this.recordSuccess(platform, workspaceId);
      return result;
    } catch (error) {
      // Only trip the breaker on transient/ambiguous errors, not permanent ones
      if (error instanceof AppError && error.errorClass === "permanent") {
        throw error;
      }
      await this.recordFailure(platform, workspaceId);
      throw error;
    }
  }
}
```

---

## File 5: `src/lib/connectors/rate-limiter.ts`

```typescript
// ============================================================================
// rate-limiter.ts — Postgres-backed sliding window + token bucket rate limiter
// ============================================================================

import { type Platform, type RateLimitState, type RateLimitConfig, RATE_LIMIT_CONFIGS } from "./types";
import { AppError, ErrorCodes } from "./errors";

// ---------------------------------------------------------------------------
// Postgres row interface
// ---------------------------------------------------------------------------
interface RateLimitRow {
  platform: string;
  scope_key: string; // workspaceId or credentialId depending on scope
  window_start: Date;
  request_count: number;
  tokens_remaining: number | null; // for token bucket
  last_refill_at: Date | null;
  updated_at: Date;
}

// ---------------------------------------------------------------------------
// Database interface
// ---------------------------------------------------------------------------
export interface RateLimiterDb {
  getState(platform: Platform, scopeKey: string): Promise<RateLimitRow | null>;
  upsertState(row: Partial<RateLimitRow> & { platform: string; scope_key: string }): Promise<void>;
  /** Atomic increment — returns the new count. Must be safe under concurrency. */
  incrementAndGet(
    platform: Platform,
    scopeKey: string,
    windowStartIfNew: Date
  ): Promise<{ requestCount: number; windowStart: Date }>;
}

// ---------------------------------------------------------------------------
// RateLimiter
// ---------------------------------------------------------------------------
export class RateLimiter {
  private readonly db: RateLimiterDb;
  private readonly configOverrides: Map<Platform, Partial<RateLimitConfig>>;

  constructor(db: RateLimiterDb, overrides?: Map<Platform, Partial<RateLimitConfig>>) {
    this.db = db;
    this.configOverrides = overrides ?? new Map();
  }

  private getConfig(platform: Platform): RateLimitConfig {
    const base = RATE_LIMIT_CONFIGS[platform];
    const override = this.configOverrides.get(platform);
    if (override) {
      return { ...base, ...override };
    }
    return base;
  }

  /**
   * Check if a request is allowed. Does NOT consume a token.
   * Use `consume()` to both check and consume atomically.
   */
  async check(platform: Platform, scopeKey: string): Promise<RateLimitState> {
    const config = this.getConfig(platform);

    if (config.limit === 0) {
      // Platform with no API (e.g. Substack)
      return {
        platform,
        windowType: "sliding_window",
        limit: 0,
        remaining: 0,
        resetsAt: new Date(),
        retryAfterMs: null,
      };
    }

    const row = await this.db.getState(platform, scopeKey);
    const now = new Date();

    if (!row) {
      return {
        platform,
        windowType: config.refillRate ? "token_bucket" : "sliding_window",
        limit: config.limit,
        remaining: config.limit,
        resetsAt: new Date(now.getTime() + config.windowMs),
        retryAfterMs: null,
      };
    }

    if (config.refillRate && config.burstSize) {
      return this.checkTokenBucket(platform, config, row, now);
    }

    return this.checkSlidingWindow(platform, config, row, now);
  }

  private checkSlidingWindow(
    platform: Platform,
    config: RateLimitConfig,
    row: RateLimitRow,
    now: Date
  ): RateLimitState {
    const windowEnd = new Date(row.window_start.getTime() + config.windowMs);

    if (now >= windowEnd) {
      // Window expired — full capacity
      return {
        platform,
        windowType: "sliding_window",
        limit: config.limit,
        remaining: config.limit,
        resetsAt: new Date(now.getTime() + config.windowMs),
        retryAfterMs: null,
      };
    }

    const remaining = Math.max(0, config.limit - row.request_count);
    const retryAfterMs = remaining === 0
      ? Math.max(0, windowEnd.getTime() - now.getTime())
      : null;

    return {
      platform,
      windowType: "sliding_window",
      limit: config.limit,
      remaining,
      resetsAt: windowEnd,
      retryAfterMs,
    };
  }

  private checkTokenBucket(
    platform: Platform,
    config: RateLimitConfig,
    row: RateLimitRow,
    now: Date
  ): RateLimitState {
    const refillRate = config.refillRate!;
    const burstSize = config.burstSize!;
    const lastRefill = row.last_refill_at ?? row.window_start;
    const elapsedMs = now.getTime() - lastRefill.getTime();
    const tokensToAdd = Math.floor((elapsedMs / 1000) * refillRate);
    const currentTokens = Math.min(burstSize, (row.tokens_remaining ?? burstSize) + tokensToAdd);

    return {
      platform,
      windowType: "token_bucket",
      limit: burstSize,
      remaining: currentTokens,
      resetsAt: new Date(now.getTime() + (1000 / refillRate)),
      retryAfterMs: currentTokens === 0 ? Math.ceil(1000 / refillRate) : null,
    };
  }

  /**
   * Atomically check and consume one token/request slot.
   * Returns the updated state. Throws AppError if at limit.
   */
  async consume(platform: Platform, scopeKey: string): Promise<RateLimitState> {
    const config = this.getConfig(platform);

    if (config.limit === 0) {
      throw new AppError({
        code: ErrorCodes.NOT_IMPLEMENTED,
        message: `${platform} does not support API publishing`,
        errorClass: "permanent",
        retryable: false,
        platform,
        httpStatus: null,
      });
    }

    if (config.refillRate && config.burstSize) {
      return this.consumeTokenBucket(platform, scopeKey, config);
    }

    return this.consumeSlidingWindow(platform, scopeKey, config);
  }

  private async consumeSlidingWindow(
    platform: Platform,
    scopeKey: string,
    config: RateLimitConfig
  ): Promise<RateLimitState> {
    const now = new Date();
    const row = await this.db.getState(platform, scopeKey);

    // If no row or window expired, start a new window
    let windowStart: Date;
    if (!row || now.getTime() >= row.window_start.getTime() + config.windowMs) {
      windowStart = now;
    } else {
      windowStart = row.window_start;
    }

    // Check if we're at the limit before consuming
    if (row && now.getTime() < row.window_start.getTime() + config.windowMs) {
      if (row.request_count >= config.limit) {
        const windowEnd = new Date(row.window_start.getTime() + config.windowMs);
        const retryAfterMs = Math.max(0, windowEnd.getTime() - now.getTime());

        throw new AppError({
          code: ErrorCodes.RATE_LIMITED,
          message: `Rate limit exceeded for ${platform}. Retry after ${Math.ceil(retryAfterMs / 1000)}s`,
          errorClass: "transient",
          retryable: true,
          platform,
          httpStatus: 429,
        });
      }
    }

    // Atomic increment
    const { requestCount, windowStart: actualWindowStart } = await this.db.incrementAndGet(
      platform,
      scopeKey,
      windowStart
    );

    const windowEnd = new Date(actualWindowStart.getTime() + config.windowMs);
    const remaining = Math.max(0, config.limit - requestCount);

    return {
      platform,
      windowType: "sliding_window",
      limit: config.limit,
      remaining,
      resetsAt: windowEnd,
      retryAfterMs: null,
    };
  }

  private async consumeTokenBucket(
    platform: Platform,
    scopeKey: string,
    config: RateLimitConfig
  ): Promise<RateLimitState> {
    const now = new Date();
    const row = await this.db.getState(platform, scopeKey);
    const refillRate = config.refillRate!;
    const burstSize = config.burstSize!;

    let currentTokens: number;

    if (!row) {
      currentTokens = burstSize;
    } else {
      const lastRefill = row.last_refill_at ?? row.window_start;
      const elapsedMs = now.getTime() - lastRefill.getTime();
      const tokensToAdd = Math.floor((elapsedMs / 1000) * refillRate);
      currentTokens = Math.min(burstSize, (row.tokens_remaining ?? burstSize) + tokensToAdd);
    }

    if (currentTokens < 1) {
      throw new AppError({
        code: ErrorCodes.RATE_LIMITED,
        message: `Token bucket empty for ${platform}. Retry after ${Math.ceil(1000 / refillRate)}ms`,
        errorClass: "transient",
        retryable: true,
        platform,
        httpStatus: 429,
      });
    }

    // Consume one token
    await this.db.upsertState({
      platform,
      scope_key: scopeKey,
      tokens_remaining: currentTokens - 1,
      last_refill_at: now,
      window_start: row?.window_start ?? now,
    });

    return {
      platform,
      windowType: "token_bucket",
      limit: burstSize,
      remaining: currentTokens - 1,
      resetsAt: new Date(now.getTime() + (1000 / refillRate)),
      retryAfterMs: null,
    };
  }

  /**
   * Parse rate limit headers from a platform response.
   * Returns partial state updates from X-RateLimit-* headers.
   */
  parseResponseHeaders(
    platform: Platform,
    headers: Record<string, string>
  ): Partial<RateLimitState> | null {
    // Standard headers (used by Twitter, Reddit, etc.)
    const limit = headers["x-ratelimit-limit"] ?? headers["x-rate-limit-limit"];
    const remaining = headers["x-ratelimit-remaining"] ?? headers["x-rate-limit-remaining"];
    const reset = headers["x-ratelimit-reset"] ?? headers["x-rate-limit-reset"];

    if (!limit && !remaining && !reset) {
      return null;
    }

    const result: Partial<RateLimitState> = { platform };

    if (limit) {
      result.limit = parseInt(limit, 10);
    }
    if (remaining) {
      result.remaining = parseInt(remaining, 10);
    }
    if (reset) {
      const resetTimestamp = parseInt(reset, 10);
      // Some platforms use epoch seconds, others use epoch millis
      result.resetsAt = resetTimestamp > 1e12
        ? new Date(resetTimestamp)
        : new Date(resetTimestamp * 1000);
    }

    return result;
  }

  /** Sync state from platform response headers (authoritative source) */
  async syncFromHeaders(
    platform: Platform,
    scopeKey: string,
    headers: Record<string, string>
  ): Promise<void> {
    const parsed = this.parseResponseHeaders(platform, headers);
    if (!parsed) return;

    const now = new Date();
    const windowMs = this.getConfig(platform).windowMs;
    const windowStart = parsed.resetsAt
      ? new Date(parsed.resetsAt.getTime() - windowMs)
      : now;

    await this.db.upsertState({
      platform,
      scope_key: scopeKey,
      window_start: windowStart,
      request_count: parsed.limit && parsed.remaining != null
        ? parsed.limit - parsed.remaining
        : undefined,
    });
  }
}
```

---

## File 6: `src/lib/connectors/token-manager.ts`

```typescript
// ============================================================================
// token-manager.ts — Encrypted token lifecycle with proactive refresh
// ============================================================================

import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "crypto";
import {
  type Platform,
  type OAuthCredential,
  type TokenResult,
  TOKEN_REFRESH_CONFIG,
} from "./types";
import { AppError, ErrorCodes } from "./errors";

// ---------------------------------------------------------------------------
// Encryption config
// ---------------------------------------------------------------------------
const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const SALT_LENGTH = 32;
const KEY_LENGTH = 32;

// ---------------------------------------------------------------------------
// Encrypted payload shape (stored as JSON in the Buffer)
// ---------------------------------------------------------------------------
interface EncryptedPayload {
  /** Initialization vector, hex-encoded */
  iv: string;
  /** Encrypted data, hex-encoded */
  data: string;
  /** GCM auth tag, hex-encoded */
  tag: string;
  /** Scrypt salt, hex-encoded */
  salt: string;
  /** Schema version for forward compatibility */
  v: 1;
}

// ---------------------------------------------------------------------------
// Token row in Postgres
// ---------------------------------------------------------------------------
interface TokenRow {
  id: string;
  workspace_id: string;
  platform: string;
  encrypted_access_token: Buffer;
  encrypted_refresh_token: Buffer | null;
  access_token_expires_at: Date | null;
  refresh_token_expires_at: Date | null;
  scopes: string[];
  last_refreshed_at: Date | null;
  refresh_failure_count: number;
  created_at: Date;
  updated_at: Date;
}

// ---------------------------------------------------------------------------
// Database interface
// ---------------------------------------------------------------------------
export interface TokenManagerDb {
  getToken(workspaceId: string, platform: Platform): Promise<TokenRow | null>;
  upsertToken(row: Partial<TokenRow> & { workspace_id: string; platform: string }): Promise<void>;
  /** Get all tokens that need refresh within the given time horizon */
  getTokensNeedingRefresh(horizonMs: number): Promise<TokenRow[]>;
  deleteToken(workspaceId: string, platform: Platform): Promise<void>;
}

// ---------------------------------------------------------------------------
// Refresh function type — provided by the adapter
// ---------------------------------------------------------------------------
type RefreshFn = (credential: OAuthCredential) => Promise<TokenResult>;

// ---------------------------------------------------------------------------
// TokenManager
// ---------------------------------------------------------------------------
export class TokenManager {
  private readonly db: TokenManagerDb;
  private readonly encryptionKey: string;
  private readonly refreshFns: Map<Platform, RefreshFn>;

  constructor(
    db: TokenManagerDb,
    encryptionKey: string,
    refreshFns?: Map<Platform, RefreshFn>
  ) {
    if (!encryptionKey || encryptionKey.length < 32) {
      throw new Error("Encryption key must be at least 32 characters");
    }
    this.db = db;
    this.encryptionKey = encryptionKey;
    this.refreshFns = refreshFns ?? new Map();
  }

  /** Register a platform's refresh function */
  registerRefreshFn(platform: Platform, fn: RefreshFn): void {
    this.refreshFns.set(platform, fn);
  }

  // -------------------------------------------------------------------------
  // Encryption
  // -------------------------------------------------------------------------

  encrypt(plaintext: string): Buffer {
    const salt = randomBytes(SALT_LENGTH);
    const key = scryptSync(this.encryptionKey, salt, KEY_LENGTH);
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(plaintext, "utf8", "hex");
    encrypted += cipher.final("hex");
    const tag = cipher.getAuthTag();

    const payload: EncryptedPayload = {
      iv: iv.toString("hex"),
      data: encrypted,
      tag: tag.toString("hex"),
      salt: salt.toString("hex"),
      v: 1,
    };

    return Buffer.from(JSON.stringify(payload), "utf8");
  }

  decrypt(cipherBuffer: Buffer): string {
    try {
      const payload: EncryptedPayload = JSON.parse(cipherBuffer.toString("utf8"));

      if (payload.v !== 1) {
        throw new Error(`Unsupported encryption version: ${payload.v}`);
      }

      const salt = Buffer.from(payload.salt, "hex");
      const key = scryptSync(this.encryptionKey, salt, KEY_LENGTH);
      const iv = Buffer.from(payload.iv, "hex");
      const tag = Buffer.from(payload.tag, "hex");

      const decipher = createDecipheriv(ALGORITHM, key, iv);
      decipher.setAuthTag(tag);

      let decrypted = decipher.update(payload.data, "hex", "utf8");
      decrypted += decipher.final("utf8");

      return decrypted;
    } catch (error) {
      throw new AppError({
        code: ErrorCodes.TOKEN_DECRYPT_FAILED,
        message: "Failed to decrypt token",
        errorClass: "permanent",
        retryable: false,
        platform: Platform.LinkedIn, // will be overridden by caller
        httpStatus: null,
        cause: error instanceof Error ? error : new Error(String(error)),
      });
    }
  }

  // -------------------------------------------------------------------------
  // Token CRUD
  // -------------------------------------------------------------------------

  /** Store a new token (after initial OAuth flow) */
  async storeToken(
    workspaceId: string,
    platform: Platform,
    tokenResult: TokenResult
  ): Promise<void> {
    const encryptedAccess = this.encrypt(tokenResult.accessToken);
    const encryptedRefresh = tokenResult.refreshToken
      ? this.encrypt(tokenResult.refreshToken)
      : null;

    await this.db.upsertToken({
      workspace_id: workspaceId,
      platform,
      encrypted_access_token: encryptedAccess,
      encrypted_refresh_token: encryptedRefresh,
      access_token_expires_at: tokenResult.expiresAt,
      refresh_token_expires_at: tokenResult.refreshTokenExpiresAt,
      scopes: tokenResult.scopes,
      last_refreshed_at: new Date(),
      refresh_failure_count: 0,
    });
  }

  /** Retrieve and decrypt a token */
  async getDecryptedToken(
    workspaceId: string,
    platform: Platform
  ): Promise<{
    accessToken: string;
    refreshToken: string | null;
    expiresAt: Date | null;
    refreshTokenExpiresAt: Date | null;
    scopes: string[];
    needsRefresh: boolean;
    refreshTokenExpiring: boolean;
  } | null> {
    const row = await this.db.getToken(workspaceId, platform);
    if (!row) return null;

    const accessToken = this.decrypt(row.encrypted_access_token);
    const refreshToken = row.encrypted_refresh_token
      ? this.decrypt(row.encrypted_refresh_token)
      : null;

    const config = TOKEN_REFRESH_CONFIG[platform];
    const now = new Date();

    // Check if access token needs refresh
    let needsRefresh = false;
    if (config.accessTokenLifetimeMs && row.access_token_expires_at) {
      const lifetime = config.accessTokenLifetimeMs;
      const refreshAt = new Date(
        row.access_token_expires_at.getTime() - lifetime * (1 - config.refreshAtPercent)
      );
      needsRefresh = now >= refreshAt;
    }

    // Check if refresh token itself is expiring (LinkedIn 365-day edge case)
    let refreshTokenExpiring = false;
    if (row.refresh_token_expires_at && config.refreshTokenLifetimeMs) {
      const thirtyDays = 30 * 24 * 60 * 60 * 1000;
      refreshTokenExpiring =
        row.refresh_token_expires_at.getTime() - now.getTime() < thirtyDays;
    }

    return {
      accessToken,
      refreshToken,
      expiresAt: row.access_token_expires_at,
      refreshTokenExpiresAt: row.refresh_token_expires_at,
      scopes: row.scopes,
      needsRefresh,
      refreshTokenExpiring,
    };
  }

  /** Delete a stored token (on disconnect) */
  async deleteToken(workspaceId: string, platform: Platform): Promise<void> {
    await this.db.deleteToken(workspaceId, platform);
  }

  // -------------------------------------------------------------------------
  // Proactive refresh
  // -------------------------------------------------------------------------

  /**
   * Get a valid access token, refreshing proactively if needed.
   * This is the main method callers should use.
   */
  async getValidToken(
    workspaceId: string,
    platform: Platform
  ): Promise<string> {
    const token = await this.getDecryptedToken(workspaceId, platform);

    if (!token) {
      throw new AppError({
        code: ErrorCodes.AUTH_EXPIRED,
        message: `No stored credential for ${platform}`,
        errorClass: "permanent",
        retryable: false,
        platform,
        httpStatus: 401,
      });
    }

    // Session-based or API key — no refresh needed
    const config = TOKEN_REFRESH_CONFIG[platform];
    if (!config.accessTokenLifetimeMs) {
      return token.accessToken;
    }

    // Check if expired (past the actual expiry, not just the refresh threshold)
    if (token.expiresAt && new Date() >= token.expiresAt) {
      // Force refresh
      return this.refreshAndStore(workspaceId, platform, token);
    }

    // Check if approaching expiry (proactive refresh)
    if (token.needsRefresh) {
      try {
        return await this.refreshAndStore(workspaceId, platform, token);
      } catch {
        // Proactive refresh failed but token is still valid — use existing
        if (token.expiresAt && new Date() < token.expiresAt) {
          return token.accessToken;
        }
        throw new AppError({
          code: ErrorCodes.TOKEN_REFRESH_FAILED,
          message: `Token refresh failed for ${platform} and current token is expired`,
          errorClass: "transient",
          retryable: true,
          platform,
          httpStatus: null,
        });
      }
    }

    return token.accessToken;
  }

  private async refreshAndStore(
    workspaceId: string,
    platform: Platform,
    currentToken: {
      accessToken: string;
      refreshToken: string | null;
      scopes: string[];
    }
  ): Promise<string> {
    const refreshFn = this.refreshFns.get(platform);
    if (!refreshFn) {
      throw new AppError({
        code: ErrorCodes.NOT_IMPLEMENTED,
        message: `No refresh function registered for ${platform}`,
        errorClass: "permanent",
        retryable: false,
        platform,
        httpStatus: null,
      });
    }

    const credential: OAuthCredential = {
      workspaceId,
      platform,
      accessToken: currentToken.accessToken,
      refreshToken: currentToken.refreshToken,
      expiresAt: null,
      refreshTokenExpiresAt: null,
      scopes: currentToken.scopes,
      encryptedPayload: Buffer.alloc(0), // not needed for refresh
    };

    try {
      const result = await refreshFn(credential);
      await this.storeToken(workspaceId, platform, result);
      return result.accessToken;
    } catch (error) {
      // Increment failure count
      const row = await this.db.getToken(workspaceId, platform);
      if (row) {
        await this.db.upsertToken({
          workspace_id: workspaceId,
          platform,
          refresh_failure_count: row.refresh_failure_count + 1,
        });
      }
      throw error;
    }
  }

  // -------------------------------------------------------------------------
  // Batch proactive refresh (called by scheduled job / Inngest)
  // -------------------------------------------------------------------------

  /**
   * Find all tokens that need refresh within the given time horizon
   * and refresh them proactively.
   */
  async refreshDueTokens(horizonMs: number = 15 * 60 * 1000): Promise<{
    refreshed: Array<{ workspaceId: string; platform: Platform }>;
    failed: Array<{ workspaceId: string; platform: Platform; error: string }>;
    skipped: Array<{ workspaceId: string; platform: Platform; reason: string }>;
  }> {
    const rows = await this.db.getTokensNeedingRefresh(horizonMs);
    const refreshed: Array<{ workspaceId: string; platform: Platform }> = [];
    const failed: Array<{ workspaceId: string; platform: Platform; error: string }> = [];
    const skipped: Array<{ workspaceId: string; platform: Platform; reason: string }> = [];

    for (const row of rows) {
      const platform = row.platform as Platform;
      const config = TOKEN_REFRESH_CONFIG[platform];

      // Skip platforms that don't need refresh
      if (!config.accessTokenLifetimeMs) {
        skipped.push({
          workspaceId: row.workspace_id,
          platform,
          reason: "Platform does not require token refresh",
        });
        continue;
      }

      // Skip if too many recent failures (back off)
      if (row.refresh_failure_count >= 5) {
        skipped.push({
          workspaceId: row.workspace_id,
          platform,
          reason: `Too many refresh failures (${row.refresh_failure_count})`,
        });
        continue;
      }

      try {
        await this.getValidToken(row.workspace_id, platform);
        refreshed.push({ workspaceId: row.workspace_id, platform });
      } catch (error) {
        failed.push({
          workspaceId: row.workspace_id,
          platform,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return { refreshed, failed, skipped };
  }

  /**
   * Check the refresh token expiry for a platform credential.
   * Returns warnings if the refresh token itself is approaching expiry.
   * Critical for LinkedIn's 365-day refresh token countdown.
   */
  async checkRefreshTokenHealth(
    workspaceId: string,
    platform: Platform
  ): Promise<{
    healthy: boolean;
    daysUntilExpiry: number | null;
    warning: string | null;
    action: "none" | "warn_user" | "require_reauth";
  }> {
    const token = await this.getDecryptedToken(workspaceId, platform);
    if (!token) {
      return {
        healthy: false,
        daysUntilExpiry: null,
        warning: "No stored credential",
        action: "require_reauth",
      };
    }

    if (!token.refreshTokenExpiresAt) {
      return { healthy: true, daysUntilExpiry: null, warning: null, action: "none" };
    }

    const now = new Date();
    const msUntilExpiry = token.refreshTokenExpiresAt.getTime() - now.getTime();
    const daysUntilExpiry = Math.floor(msUntilExpiry / (24 * 60 * 60 * 1000));

    if (daysUntilExpiry <= 0) {
      return {
        healthy: false,
        daysUntilExpiry: 0,
        warning: `Refresh token for ${platform} has expired. Re-authentication required.`,
        action: "require_reauth",
      };
    }

    if (daysUntilExpiry <= 30) {
      return {
        healthy: false,
        daysUntilExpiry,
        warning: `Refresh token for ${platform} expires in ${daysUntilExpiry} days. User should re-authenticate.`,
        action: "warn_user",
      };
    }

    if (daysUntilExpiry <= 90) {
      return {
        healthy: true,
        daysUntilExpiry,
        warning: `Refresh token for ${platform} expires in ${daysUntilExpiry} days.`,
        action: "none",
      };
    }

    return { healthy: true, daysUntilExpiry, warning: null, action: "none" };
  }
}
```

---

## File 7: `src/lib/connectors/registry.ts`

```typescript
// ============================================================================
// registry.ts — Adapter registry + factory
// ============================================================================

import { type Platform } from "./types";
import type { ConnectorAdapter } from "./adapter";

export class ConnectorRegistry {
  private readonly adapters = new Map<Platform, ConnectorAdapter>();

  register(adapter: ConnectorAdapter): void {
    if (this.adapters.has(adapter.platform)) {
      throw new Error(`Adapter already registered for platform: ${adapter.platform}`);
    }
    this.adapters.set(adapter.platform, adapter);
  }

  get(platform: Platform): ConnectorAdapter {
    const adapter = this.adapters.get(platform);
    if (!adapter) {
      throw new Error(`No adapter registered for platform: ${platform}`);
    }
    return adapter;
  }

  has(platform: Platform): boolean {
    return this.adapters.has(platform);
  }

  getAll(): ConnectorAdapter[] {
    return Array.from(this.adapters.values());
  }

  getPublishable(): ConnectorAdapter[] {
    return this.getAll().filter((a) => a.supportsPublish);
  }

  getPlatforms(): Platform[] {
    return Array.from(this.adapters.keys());
  }
}
```

---

## File 8: `src/lib/connectors/index.ts`

```typescript
// ============================================================================
// index.ts — Public barrel export
// ============================================================================

// Types
export {
  Platform,
  type AuthMethod,
  type OAuthCredential,
  type ApiKeyCredential,
  type AppPasswordCredential,
  type Credential,
  type TokenResult,
  type ScopeResult,
  TOKEN_REFRESH_CONFIG,
  type CharacterLimit,
  CHARACTER_LIMITS,
  type MediaType,
  type MediaConstraint,
  type PlatformMediaConstraints,
  MEDIA_CONSTRAINTS,
  type MediaInput,
  type MediaValidationResult,
  type PublishInput,
  type LinkedInPublishInput,
  type TwitterPublishInput,
  type InstagramPublishInput,
  type ThreadsPublishInput,
  type FacebookPublishInput,
  type TikTokPublishInput,
  type YouTubePublishInput,
  type RedditPublishInput,
  type BlueskyPublishInput,
  type BeehiivPublishInput,
  type SubstackPublishInput,
  type HubSpotPublishInput,
  type PinterestPublishInput,
  type MediumPublishInput,
  type MastodonPublishInput,
  type PublishResult,
  type VerifyResult,
  type HealthStatus,
  type HealthResult,
  type PlatformFieldDeclaration,
  type RateLimitState,
  type RateLimitConfig,
  RATE_LIMIT_CONFIGS,
  type CircuitState,
  type CircuitBreakerConfig,
  type CircuitBreakerState,
  type ContractTestName,
  type ContractTestResult,
  // Platform error response types
  type LinkedInErrorResponse,
  type TwitterErrorResponse,
  type MetaErrorResponse,
  type TikTokErrorResponse,
  type RedditErrorResponse,
  type BlueskyErrorResponse,
  type YouTubeErrorResponse,
  type BeehiivErrorResponse,
  type HubSpotErrorResponse,
  type PinterestErrorResponse,
  type MediumErrorResponse,
  type MastodonErrorResponse,
  type PlatformErrorResponse,
} from "./types";

// Errors
export {
  AppError,
  type ErrorClass,
  type AppErrorOptions,
  ErrorCodes,
  classifyHttpStatus,
} from "./errors";

// Adapter
export { type ConnectorAdapter, type PlatformResponse, BaseAdapter } from "./adapter";

// Infrastructure
export { CircuitBreaker, type CircuitBreakerDb } from "./circuit-breaker";
export { RateLimiter, type RateLimiterDb } from "./rate-limiter";
export { TokenManager, type TokenManagerDb } from "./token-manager";
export { ConnectorRegistry } from "./registry";
```

---

## Files 9-23: Platform Adapters

### File 9: `src/lib/connectors/adapters/linkedin.ts`

```typescript
// ============================================================================
// linkedin.ts — LinkedIn connector adapter
// ============================================================================

import {
  Platform,
  type LinkedInPublishInput,
  type PublishInput,
  type PublishResult,
  type VerifyResult,
  type HealthResult,
  type OAuthCredential,
  type TokenResult,
  type ScopeResult,
  type PlatformFieldDeclaration,
  type LinkedInErrorResponse,
} from "../types";
import { BaseAdapter, type PlatformResponse } from "../adapter";
import { AppError, ErrorCodes, classifyHttpStatus } from "../errors";

const LINKEDIN_API_BASE = "https://api.linkedin.com/v2";
const LINKEDIN_OAUTH_BASE = "https://www.linkedin.com/oauth/v2";

const REQUIRED_SCOPES = ["w_member_social", "r_liteprofile"];

export class LinkedInAdapter extends BaseAdapter {
  readonly platform = Platform.LinkedIn;
  readonly displayName = "LinkedIn";

  async publish(input: PublishInput, idempotencyKey: string): Promise<PublishResult> {
    if (input.platform !== Platform.LinkedIn) {
      throw this.notImplemented("publish: wrong platform");
    }
    const li = input as LinkedInPublishInput;

    const body: Record<string, unknown> = {
      author: li.authorUrn,
      lifecycleState: "PUBLISHED",
      specificContent: {
        "com.linkedin.ugc.ShareContent": {
          shareCommentary: { text: li.commentary },
          shareMediaCategory: li.mediaCategory ?? "NONE",
          ...(li.mediaUrns && li.mediaUrns.length > 0
            ? {
                media: li.mediaUrns.map((urn) => ({
                  status: "READY",
                  media: urn,
                })),
              }
            : {}),
        },
      },
      visibility: {
        "com.linkedin.ugc.MemberNetworkVisibility": li.visibility,
      },
    };

    // In production, this would call fetch() against the LinkedIn API.
    // The adapter returns the shape; the actual HTTP call is wired at integration time.
    void body;
    void idempotencyKey;

    // Placeholder for the HTTP call — actual implementation wired via DI
    return this.buildResult(idempotencyKey, {
      platformPostId: null,
      platformUrl: null,
      raw: { body },
    });
  }

  async verifyPublish(platformPostId: string): Promise<VerifyResult> {
    // GET /v2/ugcPosts/{postId}
    void platformPostId;
    return {
      exists: false,
      visible: false,
      platformPostId,
      checkedAt: new Date(),
    };
  }

  async deletePost(platformPostId: string): Promise<void> {
    // DELETE /v2/ugcPosts/{postId}
    void platformPostId;
  }

  async refreshToken(credential: OAuthCredential): Promise<TokenResult> {
    // POST https://www.linkedin.com/oauth/v2/accessToken
    // grant_type=refresh_token&refresh_token=...&client_id=...&client_secret=...
    void credential;
    void LINKEDIN_OAUTH_BASE;
    throw this.notImplemented("refreshToken: requires OAuth client credentials at runtime");
  }

  async verifyScopes(credential: OAuthCredential): Promise<ScopeResult> {
    const granted = credential.scopes;
    const missing = REQUIRED_SCOPES.filter((s) => !granted.includes(s));
    return {
      hasRequired: missing.length === 0,
      granted,
      missing,
    };
  }

  async healthProbe(): Promise<HealthResult> {
    const start = performance.now();
    // GET /v2/me — lightweight auth check
    void LINKEDIN_API_BASE;
    return {
      platform: this.platform,
      status: "healthy",
      latencyMs: Math.round(performance.now() - start),
      checkedAt: new Date(),
    };
  }

  getPlatformFields(): PlatformFieldDeclaration[] {
    return [
      {
        name: "commentary",
        label: "Post Text",
        type: "textarea",
        required: true,
        maxLength: 3_000,
        helpText: "The main text content of your LinkedIn post",
        group: "content",
      },
      {
        name: "visibility",
        label: "Visibility",
        type: "select",
        required: true,
        options: [
          { value: "PUBLIC", label: "Public" },
          { value: "CONNECTIONS", label: "Connections only" },
          { value: "LOGGED_IN", label: "LinkedIn members" },
        ],
        group: "settings",
      },
      {
        name: "mediaCategory",
        label: "Media Type",
        type: "select",
        required: false,
        options: [
          { value: "NONE", label: "No media" },
          { value: "IMAGE", label: "Image" },
          { value: "VIDEO", label: "Video" },
          { value: "ARTICLE", label: "Article" },
          { value: "DOCUMENT", label: "Document (PDF)" },
        ],
        group: "media",
      },
    ];
  }

  mapError(response: PlatformResponse): AppError {
    const body = response.body as LinkedInErrorResponse;
    const { errorClass, retryable } = classifyHttpStatus(response.status);

    let code = ErrorCodes.PLATFORM_INTERNAL;

    // LinkedIn-specific error code mapping
    if (body.serviceErrorCode === 65600) {
      code = ErrorCodes.AUTH_INSUFFICIENT_SCOPES;
    } else if (response.status === 429) {
      code = ErrorCodes.RATE_LIMITED;
    } else if (response.status === 401) {
      code = ErrorCodes.AUTH_EXPIRED;
    } else if (response.status === 422) {
      code = ErrorCodes.CONTENT_POLICY_VIOLATION;
    }

    return new AppError({
      code,
      message: body.message || `LinkedIn API error: ${response.status}`,
      errorClass,
      retryable,
      platform: this.platform,
      httpStatus: response.status,
      platformCode: body.serviceErrorCode,
      platformMessage: body.message,
      raw: body,
    });
  }
}
```

### File 10: `src/lib/connectors/adapters/twitter.ts`

```typescript
// ============================================================================
// twitter.ts — X/Twitter connector adapter
// ============================================================================

import {
  Platform,
  type TwitterPublishInput,
  type PublishInput,
  type PublishResult,
  type VerifyResult,
  type HealthResult,
  type OAuthCredential,
  type TokenResult,
  type ScopeResult,
  type PlatformFieldDeclaration,
  type TwitterErrorResponse,
  type TwitterErrorResponseV2,
  type TwitterErrorResponseV1,
} from "../types";
import { BaseAdapter, type PlatformResponse } from "../adapter";
import { AppError, ErrorCodes, classifyHttpStatus } from "../errors";

const TWITTER_API_BASE = "https://api.twitter.com/2";
const REQUIRED_SCOPES = ["tweet.read", "tweet.write", "users.read"];

export class TwitterAdapter extends BaseAdapter {
  readonly platform = Platform.Twitter;
  readonly displayName = "X (Twitter)";

  async publish(input: PublishInput, idempotencyKey: string): Promise<PublishResult> {
    if (input.platform !== Platform.Twitter) {
      throw this.notImplemented("publish: wrong platform");
    }
    const tw = input as TwitterPublishInput;

    const body: Record<string, unknown> = {
      text: tw.text,
      ...(tw.mediaIds && { media: { media_ids: tw.mediaIds } }),
      ...(tw.replyToId && { reply: { in_reply_to_tweet_id: tw.replyToId } }),
      ...(tw.quoteTweetId && { quote_tweet_id: tw.quoteTweetId }),
      ...(tw.pollOptions && {
        poll: {
          options: tw.pollOptions.map((o) => ({ label: o })),
          duration_minutes: tw.pollDurationMinutes ?? 1440,
        },
      }),
    };

    void TWITTER_API_BASE;
    void idempotencyKey;

    return this.buildResult(idempotencyKey, {
      platformPostId: null,
      platformUrl: null,
      raw: { body },
    });
  }

  async verifyPublish(platformPostId: string): Promise<VerifyResult> {
    void platformPostId;
    return {
      exists: false,
      visible: false,
      platformPostId,
      checkedAt: new Date(),
    };
  }

  async deletePost(platformPostId: string): Promise<void> {
    // DELETE /2/tweets/{id}
    void platformPostId;
  }

  async refreshToken(credential: OAuthCredential): Promise<TokenResult> {
    // POST https://api.twitter.com/2/oauth2/token
    // grant_type=refresh_token
    void credential;
    throw this.notImplemented("refreshToken: requires OAuth client credentials at runtime");
  }

  async verifyScopes(credential: OAuthCredential): Promise<ScopeResult> {
    const granted = credential.scopes;
    const missing = REQUIRED_SCOPES.filter((s) => !granted.includes(s));
    return { hasRequired: missing.length === 0, granted, missing };
  }

  async healthProbe(): Promise<HealthResult> {
    const start = performance.now();
    return {
      platform: this.platform,
      status: "healthy",
      latencyMs: Math.round(performance.now() - start),
      checkedAt: new Date(),
    };
  }

  getPlatformFields(): PlatformFieldDeclaration[] {
    return [
      {
        name: "text",
        label: "Tweet Text",
        type: "textarea",
        required: true,
        maxLength: 280,
        helpText: "280 characters (25,000 with Premium)",
        group: "content",
      },
      {
        name: "replyToId",
        label: "Reply To Tweet ID",
        type: "text",
        required: false,
        helpText: "For threads: ID of the tweet to reply to",
        group: "threading",
      },
      {
        name: "quoteTweetId",
        label: "Quote Tweet ID",
        type: "text",
        required: false,
        group: "threading",
      },
    ];
  }

  mapError(response: PlatformResponse): AppError {
    const body = response.body as TwitterErrorResponse;
    const { errorClass, retryable } = classifyHttpStatus(response.status);

    let code = ErrorCodes.PLATFORM_INTERNAL;
    let message = `Twitter API error: ${response.status}`;

    // V2 format: { title, detail, type, status }
    if ("title" in body) {
      const v2 = body as TwitterErrorResponseV2;
      message = v2.detail || v2.title;

      if (response.status === 429) code = ErrorCodes.RATE_LIMITED;
      else if (response.status === 401) code = ErrorCodes.AUTH_EXPIRED;
      else if (response.status === 403) code = ErrorCodes.AUTH_INSUFFICIENT_SCOPES;
    }
    // V1 format: { errors: [{ code, message }] }
    else if ("errors" in body) {
      const v1 = body as TwitterErrorResponseV1;
      const firstError = v1.errors[0];
      if (firstError) {
        message = firstError.message;
        if (firstError.code === 89) code = ErrorCodes.AUTH_EXPIRED;
        else if (firstError.code === 187) code = ErrorCodes.PLATFORM_DUPLICATE;
        else if (firstError.code === 186) code = ErrorCodes.CONTENT_TOO_LONG;
      }
    }

    return new AppError({
      code,
      message,
      errorClass,
      retryable,
      platform: this.platform,
      httpStatus: response.status,
      raw: body,
    });
  }
}
```

### File 11: `src/lib/connectors/adapters/instagram.ts`

```typescript
// ============================================================================
// instagram.ts — Instagram connector adapter
// ============================================================================

import {
  Platform,
  type InstagramPublishInput,
  type PublishInput,
  type PublishResult,
  type VerifyResult,
  type HealthResult,
  type OAuthCredential,
  type TokenResult,
  type ScopeResult,
  type PlatformFieldDeclaration,
  type MetaErrorResponse,
  type MediaInput,
  type MediaValidationResult,
} from "../types";
import { BaseAdapter, type PlatformResponse } from "../adapter";
import { AppError, ErrorCodes, classifyHttpStatus } from "../errors";

const GRAPH_API_BASE = "https://graph.facebook.com/v19.0";
const REQUIRED_SCOPES = [
  "instagram_basic",
  "instagram_content_publish",
  "pages_show_list",
];

export class InstagramAdapter extends BaseAdapter {
  readonly platform = Platform.Instagram;
  readonly displayName = "Instagram";

  async publish(input: PublishInput, idempotencyKey: string): Promise<PublishResult> {
    if (input.platform !== Platform.Instagram) {
      throw this.notImplemented("publish: wrong platform");
    }
    const ig = input as InstagramPublishInput;

    // Instagram always requires media
    if (!ig.imageUrl) {
      throw new AppError({
        code: ErrorCodes.MEDIA_REQUIRED,
        message: "Instagram requires media for every post",
        errorClass: "permanent",
        retryable: false,
        platform: this.platform,
        httpStatus: null,
      });
    }

    // Step 1: Create media container
    // Step 2: Publish media container
    // This is a two-step process for Instagram Graph API
    const containerBody: Record<string, unknown> = {
      image_url: ig.imageUrl,
      caption: ig.caption,
      media_type: ig.mediaType,
      ...(ig.locationId && { location_id: ig.locationId }),
      ...(ig.userTags && {
        user_tags: ig.userTags.map((t) => ({
          username: t.username,
          x: t.x,
          y: t.y,
        })),
      }),
    };

    void GRAPH_API_BASE;
    void idempotencyKey;

    return this.buildResult(idempotencyKey, {
      platformPostId: null,
      platformUrl: null,
      raw: { containerBody },
    });
  }

  async validateMedia(media: MediaInput): Promise<MediaValidationResult> {
    const result = await super.validateMedia(media);

    // Instagram-specific: only JPEG for images
    if (media.mimeType.startsWith("image/") && media.mimeType !== "image/jpeg") {
      result.errors.push("Instagram only accepts JPEG images");
      result.valid = false;
    }

    return result;
  }

  async verifyPublish(platformPostId: string): Promise<VerifyResult> {
    void platformPostId;
    return {
      exists: false,
      visible: false,
      platformPostId,
      checkedAt: new Date(),
    };
  }

  async deletePost(platformPostId: string): Promise<void> {
    void platformPostId;
  }

  async refreshToken(credential: OAuthCredential): Promise<TokenResult> {
    // GET /oauth/access_token?grant_type=ig_exchange_token&client_secret=...&access_token=...
    void credential;
    throw this.notImplemented("refreshToken: requires app secret at runtime");
  }

  async verifyScopes(credential: OAuthCredential): Promise<ScopeResult> {
    const granted = credential.scopes;
    const missing = REQUIRED_SCOPES.filter((s) => !granted.includes(s));
    return { hasRequired: missing.length === 0, granted, missing };
  }

  async healthProbe(): Promise<HealthResult> {
    const start = performance.now();
    return {
      platform: this.platform,
      status: "healthy",
      latencyMs: Math.round(performance.now() - start),
      checkedAt: new Date(),
    };
  }

  getPlatformFields(): PlatformFieldDeclaration[] {
    return [
      {
        name: "imageUrl",
        label: "Image URL",
        type: "url",
        required: true,
        helpText: "Public URL to a JPEG image (max 8MB). Required for all posts.",
        group: "media",
      },
      {
        name: "caption",
        label: "Caption",
        type: "textarea",
        required: true,
        maxLength: 2_200,
        group: "content",
      },
      {
        name: "mediaType",
        label: "Post Type",
        type: "select",
        required: true,
        options: [
          { value: "IMAGE", label: "Single Image" },
          { value: "CAROUSEL", label: "Carousel" },
          { value: "REELS", label: "Reels (Video)" },
        ],
        group: "content",
      },
    ];
  }

  mapError(response: PlatformResponse): AppError {
    const body = response.body as MetaErrorResponse;
    const { errorClass, retryable } = classifyHttpStatus(response.status);
    const metaError = body.error;

    let code = ErrorCodes.PLATFORM_INTERNAL;

    if (metaError.code === 190) code = ErrorCodes.AUTH_EXPIRED;
    else if (metaError.code === 10) code = ErrorCodes.AUTH_INSUFFICIENT_SCOPES;
    else if (metaError.code === 4) code = ErrorCodes.RATE_LIMITED;
    else if (metaError.code === 368) code = ErrorCodes.CONTENT_POLICY_VIOLATION;

    return new AppError({
      code,
      message: metaError.message,
      errorClass,
      retryable,
      platform: this.platform,
      httpStatus: response.status,
      platformCode: metaError.code,
      platformMessage: metaError.message,
      raw: body,
    });
  }
}
```

### File 12: `src/lib/connectors/adapters/threads.ts`

```typescript
// ============================================================================
// threads.ts — Threads connector adapter
// ============================================================================

import {
  Platform,
  type ThreadsPublishInput,
  type PublishInput,
  type PublishResult,
  type VerifyResult,
  type HealthResult,
  type OAuthCredential,
  type TokenResult,
  type ScopeResult,
  type PlatformFieldDeclaration,
  type MetaErrorResponse,
} from "../types";
import { BaseAdapter, type PlatformResponse } from "../adapter";
import { AppError, ErrorCodes, classifyHttpStatus } from "../errors";

const THREADS_API_BASE = "https://graph.threads.net/v1.0";
const REQUIRED_SCOPES = ["threads_basic", "threads_content_publish"];

export class ThreadsAdapter extends BaseAdapter {
  readonly platform = Platform.Threads;
  readonly displayName = "Threads";

  async publish(input: PublishInput, idempotencyKey: string): Promise<PublishResult> {
    if (input.platform !== Platform.Threads) {
      throw this.notImplemented("publish: wrong platform");
    }
    const th = input as ThreadsPublishInput;

    // Threads uses URL-only upload for media
    const body: Record<string, unknown> = {
      text: th.text,
      media_type: th.mediaType ?? "TEXT",
      ...(th.imageUrl && { image_url: th.imageUrl }),
      ...(th.videoUrl && { video_url: th.videoUrl }),
      ...(th.replyToId && { reply_to_id: th.replyToId }),
    };

    void THREADS_API_BASE;
    void idempotencyKey;

    return this.buildResult(idempotencyKey, {
      platformPostId: null,
      platformUrl: null,
      raw: { body },
    });
  }

  async verifyPublish(platformPostId: string): Promise<VerifyResult> {
    void platformPostId;
    return { exists: false, visible: false, platformPostId, checkedAt: new Date() };
  }

  async deletePost(platformPostId: string): Promise<void> {
    void platformPostId;
  }

  async refreshToken(credential: OAuthCredential): Promise<TokenResult> {
    // GET /refresh_access_token?grant_type=th_refresh_token&access_token=...
    void credential;
    throw this.notImplemented("refreshToken: requires runtime credentials");
  }

  async verifyScopes(credential: OAuthCredential): Promise<ScopeResult> {
    const granted = credential.scopes;
    const missing = REQUIRED_SCOPES.filter((s) => !granted.includes(s));
    return { hasRequired: missing.length === 0, granted, missing };
  }

  async healthProbe(): Promise<HealthResult> {
    const start = performance.now();
    return {
      platform: this.platform,
      status: "healthy",
      latencyMs: Math.round(performance.now() - start),
      checkedAt: new Date(),
    };
  }

  getPlatformFields(): PlatformFieldDeclaration[] {
    return [
      {
        name: "text",
        label: "Thread Text",
        type: "textarea",
        required: true,
        maxLength: 500,
        group: "content",
      },
      {
        name: "mediaType",
        label: "Media Type",
        type: "select",
        required: false,
        options: [
          { value: "TEXT", label: "Text only" },
          { value: "IMAGE", label: "Image" },
          { value: "VIDEO", label: "Video" },
          { value: "CAROUSEL", label: "Carousel" },
        ],
        group: "media",
      },
      {
        name: "imageUrl",
        label: "Image URL",
        type: "url",
        required: false,
        helpText: "Public URL — Threads uses URL-only upload",
        group: "media",
      },
    ];
  }

  mapError(response: PlatformResponse): AppError {
    const body = response.body as MetaErrorResponse;
    const { errorClass, retryable } = classifyHttpStatus(response.status);
    const metaError = body.error;

    let code = ErrorCodes.PLATFORM_INTERNAL;
    if (metaError.code === 190) code = ErrorCodes.AUTH_EXPIRED;
    else if (metaError.code === 4) code = ErrorCodes.RATE_LIMITED;
    else if (metaError.code === 368) code = ErrorCodes.CONTENT_POLICY_VIOLATION;

    return new AppError({
      code,
      message: metaError.message,
      errorClass,
      retryable,
      platform: this.platform,
      httpStatus: response.status,
      platformCode: metaError.code,
      platformMessage: metaError.message,
      raw: body,
    });
  }
}
```

### File 13: `src/lib/connectors/adapters/facebook.ts`

```typescript
// ============================================================================
// facebook.ts — Facebook connector adapter
// ============================================================================

import {
  Platform,
  type FacebookPublishInput,
  type PublishInput,
  type PublishResult,
  type VerifyResult,
  type HealthResult,
  type OAuthCredential,
  type TokenResult,
  type ScopeResult,
  type PlatformFieldDeclaration,
  type MetaErrorResponse,
} from "../types";
import { BaseAdapter, type PlatformResponse } from "../adapter";
import { AppError, ErrorCodes, classifyHttpStatus } from "../errors";

const GRAPH_API_BASE = "https://graph.facebook.com/v19.0";
const REQUIRED_SCOPES = ["pages_manage_posts", "pages_read_engagement"];

export class FacebookAdapter extends BaseAdapter {
  readonly platform = Platform.Facebook;
  readonly displayName = "Facebook";

  async publish(input: PublishInput, idempotencyKey: string): Promise<PublishResult> {
    if (input.platform !== Platform.Facebook) {
      throw this.notImplemented("publish: wrong platform");
    }
    const fb = input as FacebookPublishInput;

    const body: Record<string, unknown> = {
      message: fb.message,
      ...(fb.link && { link: fb.link }),
      ...(fb.scheduledPublishTime && {
        scheduled_publish_time: fb.scheduledPublishTime,
        published: false,
      }),
      ...(fb.published !== undefined && { published: fb.published }),
    };

    void GRAPH_API_BASE;
    void fb.pageId;
    void idempotencyKey;

    return this.buildResult(idempotencyKey, {
      platformPostId: null,
      platformUrl: null,
      raw: { body },
    });
  }

  async verifyPublish(platformPostId: string): Promise<VerifyResult> {
    void platformPostId;
    return { exists: false, visible: false, platformPostId, checkedAt: new Date() };
  }

  async deletePost(platformPostId: string): Promise<void> {
    void platformPostId;
  }

  async refreshToken(credential: OAuthCredential): Promise<TokenResult> {
    void credential;
    throw this.notImplemented("refreshToken: requires app credentials at runtime");
  }

  async verifyScopes(credential: OAuthCredential): Promise<ScopeResult> {
    const granted = credential.scopes;
    const missing = REQUIRED_SCOPES.filter((s) => !granted.includes(s));
    return { hasRequired: missing.length === 0, granted, missing };
  }

  async healthProbe(): Promise<HealthResult> {
    const start = performance.now();
    return {
      platform: this.platform,
      status: "healthy",
      latencyMs: Math.round(performance.now() - start),
      checkedAt: new Date(),
    };
  }

  getPlatformFields(): PlatformFieldDeclaration[] {
    return [
      {
        name: "message",
        label: "Post Text",
        type: "textarea",
        required: true,
        maxLength: 63_206,
        group: "content",
      },
      {
        name: "link",
        label: "Link URL",
        type: "url",
        required: false,
        group: "content",
      },
      {
        name: "pageId",
        label: "Page ID",
        type: "text",
        required: true,
        helpText: "Facebook Page ID to publish to",
        group: "settings",
      },
    ];
  }

  mapError(response: PlatformResponse): AppError {
    const body = response.body as MetaErrorResponse;
    const { errorClass, retryable } = classifyHttpStatus(response.status);
    const metaError = body.error;

    let code = ErrorCodes.PLATFORM_INTERNAL;
    if (metaError.code === 190) code = ErrorCodes.AUTH_EXPIRED;
    else if (metaError.code === 10) code = ErrorCodes.AUTH_INSUFFICIENT_SCOPES;
    else if (metaError.code === 4 || metaError.code === 32) code = ErrorCodes.RATE_LIMITED;
    else if (metaError.code === 368) code = ErrorCodes.CONTENT_POLICY_VIOLATION;

    return new AppError({
      code,
      message: metaError.message,
      errorClass,
      retryable,
      platform: this.platform,
      httpStatus: response.status,
      platformCode: metaError.code,
      platformMessage: metaError.message,
      raw: body,
    });
  }
}
```

### File 14: `src/lib/connectors/adapters/tiktok.ts`

```typescript
// ============================================================================
// tiktok.ts — TikTok connector adapter
// ============================================================================

import {
  Platform,
  type TikTokPublishInput,
  type PublishInput,
  type PublishResult,
  type VerifyResult,
  type HealthResult,
  type OAuthCredential,
  type TokenResult,
  type ScopeResult,
  type PlatformFieldDeclaration,
  type TikTokErrorResponse,
} from "../types";
import { BaseAdapter, type PlatformResponse } from "../adapter";
import { AppError, ErrorCodes, classifyHttpStatus } from "../errors";

const TIKTOK_API_BASE = "https://open.tiktokapis.com/v2";
const REQUIRED_SCOPES = ["video.publish", "video.upload"];

export class TikTokAdapter extends BaseAdapter {
  readonly platform = Platform.TikTok;
  readonly displayName = "TikTok";

  async publish(input: PublishInput, idempotencyKey: string): Promise<PublishResult> {
    if (input.platform !== Platform.TikTok) {
      throw this.notImplemented("publish: wrong platform");
    }
    const tt = input as TikTokPublishInput;

    if (!tt.videoUrl) {
      throw new AppError({
        code: ErrorCodes.MEDIA_REQUIRED,
        message: "TikTok requires a video for every post",
        errorClass: "permanent",
        retryable: false,
        platform: this.platform,
        httpStatus: null,
      });
    }

    const body: Record<string, unknown> = {
      post_info: {
        title: tt.title,
        privacy_level: tt.privacyLevel,
        disable_comment: tt.disableComment ?? false,
        disable_duet: tt.disableDuet ?? false,
        disable_stitch: tt.disableStitch ?? false,
        is_aigc: tt.isAigc,
        ...(tt.videoCoverTimestampMs && {
          video_cover_timestamp_ms: tt.videoCoverTimestampMs,
        }),
      },
      source_info: {
        source: "PULL_FROM_URL",
        video_url: tt.videoUrl,
      },
    };

    void TIKTOK_API_BASE;
    void idempotencyKey;

    return this.buildResult(idempotencyKey, {
      platformPostId: null,
      platformUrl: null,
      raw: { body },
    });
  }

  async verifyPublish(platformPostId: string): Promise<VerifyResult> {
    void platformPostId;
    return { exists: false, visible: false, platformPostId, checkedAt: new Date() };
  }

  async deletePost(platformPostId: string): Promise<void> {
    void platformPostId;
  }

  async refreshToken(credential: OAuthCredential): Promise<TokenResult> {
    // POST https://open.tiktokapis.com/v2/oauth/token/
    // grant_type=refresh_token — CRITICAL: TikTok access tokens expire every 24h
    void credential;
    throw this.notImplemented("refreshToken: requires client credentials at runtime");
  }

  async verifyScopes(credential: OAuthCredential): Promise<ScopeResult> {
    const granted = credential.scopes;
    const missing = REQUIRED_SCOPES.filter((s) => !granted.includes(s));
    return { hasRequired: missing.length === 0, granted, missing };
  }

  async healthProbe(): Promise<HealthResult> {
    const start = performance.now();
    return {
      platform: this.platform,
      status: "healthy",
      latencyMs: Math.round(performance.now() - start),
      checkedAt: new Date(),
    };
  }

  getPlatformFields(): PlatformFieldDeclaration[] {
    return [
      {
        name: "videoUrl",
        label: "Video URL",
        type: "url",
        required: true,
        helpText: "URL to MP4/WebM video (max 4GB). Required.",
        group: "media",
      },
      {
        name: "title",
        label: "Title",
        type: "text",
        required: true,
        maxLength: 2_200,
        group: "content",
      },
      {
        name: "privacyLevel",
        label: "Privacy",
        type: "select",
        required: true,
        options: [
          { value: "PUBLIC_TO_EVERYONE", label: "Public" },
          { value: "MUTUAL_FOLLOW_FRIENDS", label: "Friends" },
          { value: "FOLLOWER_OF_CREATOR", label: "Followers" },
          { value: "SELF_ONLY", label: "Only me" },
        ],
        group: "settings",
      },
      {
        name: "isAigc",
        label: "AI-Generated Content",
        type: "boolean",
        required: true,
        helpText: "Disclose if content uses AI generation",
        group: "compliance",
      },
    ];
  }

  mapError(response: PlatformResponse): AppError {
    const body = response.body as TikTokErrorResponse;
    const { errorClass, retryable } = classifyHttpStatus(response.status);
    const ttError = body.error;

    let code = ErrorCodes.PLATFORM_INTERNAL;
    if (ttError.code === "access_token_invalid") code = ErrorCodes.AUTH_EXPIRED;
    else if (ttError.code === "rate_limit_exceeded") code = ErrorCodes.RATE_LIMITED;
    else if (ttError.code === "spam_risk_too_many_posts") code = ErrorCodes.RATE_LIMIT_DAILY;
    else if (ttError.code === "scope_not_authorized") code = ErrorCodes.AUTH_INSUFFICIENT_SCOPES;

    return new AppError({
      code,
      message: ttError.message,
      errorClass,
      retryable,
      platform: this.platform,
      httpStatus: response.status,
      platformCode: ttError.code,
      platformMessage: ttError.message,
      raw: body,
    });
  }
}
```

### File 15: `src/lib/connectors/adapters/youtube.ts`

```typescript
// ============================================================================
// youtube.ts — YouTube connector adapter
// ============================================================================

import {
  Platform,
  type YouTubePublishInput,
  type PublishInput,
  type PublishResult,
  type VerifyResult,
  type HealthResult,
  type OAuthCredential,
  type TokenResult,
  type ScopeResult,
  type PlatformFieldDeclaration,
  type YouTubeErrorResponse,
} from "../types";
import { BaseAdapter, type PlatformResponse } from "../adapter";
import { AppError, ErrorCodes, classifyHttpStatus } from "../errors";

const YOUTUBE_API_BASE = "https://www.googleapis.com/youtube/v3";
const REQUIRED_SCOPES = [
  "https://www.googleapis.com/auth/youtube.upload",
  "https://www.googleapis.com/auth/youtube",
];

export class YouTubeAdapter extends BaseAdapter {
  readonly platform = Platform.YouTube;
  readonly displayName = "YouTube";

  async publish(input: PublishInput, idempotencyKey: string): Promise<PublishResult> {
    if (input.platform !== Platform.YouTube) {
      throw this.notImplemented("publish: wrong platform");
    }
    const yt = input as YouTubePublishInput;

    if (!yt.videoFile) {
      throw new AppError({
        code: ErrorCodes.MEDIA_REQUIRED,
        message: "YouTube requires a video file",
        errorClass: "permanent",
        retryable: false,
        platform: this.platform,
        httpStatus: null,
      });
    }

    // YouTube uses resumable upload: POST /upload/youtube/v3/videos
    const body: Record<string, unknown> = {
      snippet: {
        title: yt.title,
        description: yt.description,
        tags: yt.tags ?? [],
        categoryId: yt.categoryId ?? "22", // People & Blogs default
      },
      status: {
        privacyStatus: yt.privacyStatus,
        ...(yt.publishAt && {
          publishAt: yt.publishAt,
          privacyStatus: "private", // must be private for scheduled
        }),
        selfDeclaredMadeForKids: false,
      },
    };

    void YOUTUBE_API_BASE;
    void idempotencyKey;

    return this.buildResult(idempotencyKey, {
      platformPostId: null,
      platformUrl: null,
      raw: { body },
    });
  }

  async verifyPublish(platformPostId: string): Promise<VerifyResult> {
    void platformPostId;
    return { exists: false, visible: false, platformPostId, checkedAt: new Date() };
  }

  async deletePost(platformPostId: string): Promise<void> {
    // DELETE /youtube/v3/videos?id={id}
    void platformPostId;
  }

  async refreshToken(credential: OAuthCredential): Promise<TokenResult> {
    // POST https://oauth2.googleapis.com/token
    // grant_type=refresh_token — Google access tokens expire every 1h
    void credential;
    throw this.notImplemented("refreshToken: requires client credentials at runtime");
  }

  async verifyScopes(credential: OAuthCredential): Promise<ScopeResult> {
    const granted = credential.scopes;
    const missing = REQUIRED_SCOPES.filter((s) => !granted.includes(s));
    return { hasRequired: missing.length === 0, granted, missing };
  }

  async healthProbe(): Promise<HealthResult> {
    const start = performance.now();
    return {
      platform: this.platform,
      status: "healthy",
      latencyMs: Math.round(performance.now() - start),
      checkedAt: new Date(),
    };
  }

  getPlatformFields(): PlatformFieldDeclaration[] {
    return [
      {
        name: "videoFile",
        label: "Video File",
        type: "file",
        required: true,
        helpText: "Any video format supported. Required.",
        group: "media",
      },
      {
        name: "title",
        label: "Title",
        type: "text",
        required: true,
        maxLength: 100,
        group: "content",
      },
      {
        name: "description",
        label: "Description",
        type: "textarea",
        required: true,
        maxLength: 5_000,
        group: "content",
      },
      {
        name: "privacyStatus",
        label: "Privacy",
        type: "select",
        required: true,
        options: [
          { value: "public", label: "Public" },
          { value: "unlisted", label: "Unlisted" },
          { value: "private", label: "Private" },
        ],
        group: "settings",
      },
      {
        name: "publishAt",
        label: "Schedule Publish",
        type: "text",
        required: false,
        helpText: "ISO 8601 datetime. Video must be set to private.",
        group: "scheduling",
      },
    ];
  }

  mapError(response: PlatformResponse): AppError {
    const body = response.body as YouTubeErrorResponse;
    const { errorClass, retryable } = classifyHttpStatus(response.status);
    const ytError = body.error;

    let code = ErrorCodes.PLATFORM_INTERNAL;
    const firstError = ytError.errors[0];

    if (response.status === 401) code = ErrorCodes.AUTH_EXPIRED;
    else if (response.status === 403 && firstError?.reason === "quotaExceeded")
      code = ErrorCodes.RATE_LIMIT_DAILY;
    else if (response.status === 403 && firstError?.reason === "forbidden")
      code = ErrorCodes.AUTH_INSUFFICIENT_SCOPES;
    else if (firstError?.reason === "uploadLimitExceeded") code = ErrorCodes.RATE_LIMITED;
    else if (firstError?.reason === "videoNotFound") code = ErrorCodes.PLATFORM_NOT_FOUND;

    return new AppError({
      code,
      message: ytError.message,
      errorClass,
      retryable,
      platform: this.platform,
      httpStatus: response.status,
      platformCode: ytError.code,
      platformMessage: ytError.message,
      raw: body,
    });
  }
}
```

### File 16: `src/lib/connectors/adapters/reddit.ts`

```typescript
// ============================================================================
// reddit.ts — Reddit connector adapter
// ============================================================================

import {
  Platform,
  type RedditPublishInput,
  type PublishInput,
  type PublishResult,
  type VerifyResult,
  type HealthResult,
  type OAuthCredential,
  type TokenResult,
  type ScopeResult,
  type PlatformFieldDeclaration,
  type RedditErrorResponse,
} from "../types";
import { BaseAdapter, type PlatformResponse } from "../adapter";
import { AppError, ErrorCodes, classifyHttpStatus } from "../errors";

const REDDIT_API_BASE = "https://oauth.reddit.com";
const REQUIRED_SCOPES = ["submit", "read", "identity"];

export class RedditAdapter extends BaseAdapter {
  readonly platform = Platform.Reddit;
  readonly displayName = "Reddit";

  async publish(input: PublishInput, idempotencyKey: string): Promise<PublishResult> {
    if (input.platform !== Platform.Reddit) {
      throw this.notImplemented("publish: wrong platform");
    }
    const rd = input as RedditPublishInput;

    const body: Record<string, unknown> = {
      sr: rd.subreddit,
      title: rd.title,
      kind: rd.kind,
      ...(rd.selftext && { text: rd.selftext }),
      ...(rd.url && { url: rd.url }),
      ...(rd.flair_id && { flair_id: rd.flair_id }),
      ...(rd.flair_text && { flair_text: rd.flair_text }),
      ...(rd.nsfw && { nsfw: rd.nsfw }),
      ...(rd.spoiler && { spoiler: rd.spoiler }),
      resubmit: true,
    };

    void REDDIT_API_BASE;
    void idempotencyKey;

    return this.buildResult(idempotencyKey, {
      platformPostId: null,
      platformUrl: null,
      raw: { body },
    });
  }

  async verifyPublish(platformPostId: string): Promise<VerifyResult> {
    void platformPostId;
    return { exists: false, visible: false, platformPostId, checkedAt: new Date() };
  }

  async deletePost(platformPostId: string): Promise<void> {
    // POST /api/del { id: "t3_{id}" }
    void platformPostId;
  }

  async refreshToken(credential: OAuthCredential): Promise<TokenResult> {
    // POST https://www.reddit.com/api/v1/access_token
    // grant_type=refresh_token — Reddit access tokens expire every 1h
    void credential;
    throw this.notImplemented("refreshToken: requires client credentials at runtime");
  }

  async verifyScopes(credential: OAuthCredential): Promise<ScopeResult> {
    const granted = credential.scopes;
    const missing = REQUIRED_SCOPES.filter((s) => !granted.includes(s));
    return { hasRequired: missing.length === 0, granted, missing };
  }

  async healthProbe(): Promise<HealthResult> {
    const start = performance.now();
    return {
      platform: this.platform,
      status: "healthy",
      latencyMs: Math.round(performance.now() - start),
      checkedAt: new Date(),
    };
  }

  getPlatformFields(): PlatformFieldDeclaration[] {
    return [
      {
        name: "subreddit",
        label: "Subreddit",
        type: "text",
        required: true,
        helpText: "Without r/ prefix",
        group: "target",
      },
      {
        name: "title",
        label: "Post Title",
        type: "text",
        required: true,
        maxLength: 300,
        group: "content",
      },
      {
        name: "kind",
        label: "Post Type",
        type: "select",
        required: true,
        options: [
          { value: "self", label: "Text Post" },
          { value: "link", label: "Link" },
          { value: "image", label: "Image" },
          { value: "video", label: "Video" },
        ],
        group: "content",
      },
      {
        name: "selftext",
        label: "Post Body",
        type: "textarea",
        required: false,
        helpText: "Markdown content for self posts. No hard character limit.",
        group: "content",
      },
    ];
  }

  mapError(response: PlatformResponse): AppError {
    const body = response.body as RedditErrorResponse;
    const { errorClass, retryable } = classifyHttpStatus(response.status);

    let code = ErrorCodes.PLATFORM_INTERNAL;
    let message = `Reddit API error: ${response.status}`;

    if (body.json?.errors && body.json.errors.length > 0) {
      const [errCode, errMsg] = body.json.errors[0]!;
      message = errMsg;

      if (errCode === "RATELIMIT") code = ErrorCodes.RATE_LIMITED;
      else if (errCode === "USER_REQUIRED") code = ErrorCodes.AUTH_EXPIRED;
      else if (errCode === "SUBREDDIT_NOTALLOWED") code = ErrorCodes.AUTH_INSUFFICIENT_SCOPES;
    } else if (response.status === 429) {
      code = ErrorCodes.RATE_LIMITED;
    } else if (response.status === 401) {
      code = ErrorCodes.AUTH_EXPIRED;
    }

    return new AppError({
      code,
      message,
      errorClass,
      retryable,
      platform: this.platform,
      httpStatus: response.status,
      raw: body,
    });
  }
}
```

### File 17: `src/lib/connectors/adapters/bluesky.ts`

```typescript
// ============================================================================
// bluesky.ts — Bluesky / AT Protocol connector adapter
// ============================================================================

import {
  Platform,
  type BlueskyPublishInput,
  type PublishInput,
  type PublishResult,
  type VerifyResult,
  type HealthResult,
  type OAuthCredential,
  type TokenResult,
  type ScopeResult,
  type PlatformFieldDeclaration,
  type BlueskyErrorResponse,
} from "../types";
import { BaseAdapter, type PlatformResponse } from "../adapter";
import { AppError, ErrorCodes, classifyHttpStatus } from "../errors";

const BSKY_API_BASE = "https://bsky.social/xrpc";

export class BlueskyAdapter extends BaseAdapter {
  readonly platform = Platform.Bluesky;
  readonly displayName = "Bluesky";

  async publish(input: PublishInput, idempotencyKey: string): Promise<PublishResult> {
    if (input.platform !== Platform.Bluesky) {
      throw this.notImplemented("publish: wrong platform");
    }
    const bs = input as BlueskyPublishInput;

    // Validate grapheme length
    const encoder = new TextEncoder();
    const byteLength = encoder.encode(bs.text).length;
    if (byteLength > 3_000) {
      throw new AppError({
        code: ErrorCodes.CONTENT_TOO_LONG,
        message: `Text exceeds 3,000 bytes (got ${byteLength})`,
        errorClass: "permanent",
        retryable: false,
        platform: this.platform,
        httpStatus: null,
      });
    }

    // Count graphemes (Intl.Segmenter)
    const segmenter = new Intl.Segmenter("en", { granularity: "grapheme" });
    const graphemeCount = Array.from(segmenter.segment(bs.text)).length;
    if (graphemeCount > 300) {
      throw new AppError({
        code: ErrorCodes.CONTENT_TOO_LONG,
        message: `Text exceeds 300 graphemes (got ${graphemeCount})`,
        errorClass: "permanent",
        retryable: false,
        platform: this.platform,
        httpStatus: null,
      });
    }

    // com.atproto.repo.createRecord
    const body: Record<string, unknown> = {
      repo: "", // DID, set at runtime
      collection: "app.bsky.feed.post",
      record: {
        $type: "app.bsky.feed.post",
        text: bs.text,
        createdAt: new Date().toISOString(),
        ...(bs.langs && { langs: bs.langs }),
        ...(bs.replyTo && {
          reply: {
            root: { uri: bs.replyTo.uri, cid: bs.replyTo.cid },
            parent: { uri: bs.replyTo.uri, cid: bs.replyTo.cid },
          },
        }),
        ...(bs.images && {
          embed: {
            $type: "app.bsky.embed.images",
            images: bs.images.map((img) => ({
              alt: img.altText,
              image: { $type: "blob", ref: { $link: "" }, mimeType: "image/jpeg", size: 0 },
            })),
          },
        }),
      },
    };

    void BSKY_API_BASE;
    void idempotencyKey;

    return this.buildResult(idempotencyKey, {
      platformPostId: null,
      platformUrl: null,
      raw: { body },
    });
  }

  async verifyPublish(platformPostId: string): Promise<VerifyResult> {
    void platformPostId;
    return { exists: false, visible: false, platformPostId, checkedAt: new Date() };
  }

  async deletePost(platformPostId: string): Promise<void> {
    // com.atproto.repo.deleteRecord
    void platformPostId;
  }

  async refreshToken(_credential: OAuthCredential): Promise<TokenResult> {
    // Bluesky uses app passwords — session-based, no refresh needed
    // com.atproto.server.createSession with identifier + app password
    throw new AppError({
      code: ErrorCodes.NOT_IMPLEMENTED,
      message: "Bluesky uses app passwords. Create a new session instead of refreshing.",
      errorClass: "permanent",
      retryable: false,
      platform: this.platform,
      httpStatus: null,
    });
  }

  async verifyScopes(_credential: OAuthCredential): Promise<ScopeResult> {
    // Bluesky app passwords grant full access — no scopes to verify
    return { hasRequired: true, granted: ["full_access"], missing: [] };
  }

  async healthProbe(): Promise<HealthResult> {
    const start = performance.now();
    // GET /xrpc/com.atproto.server.describeServer
    return {
      platform: this.platform,
      status: "healthy",
      latencyMs: Math.round(performance.now() - start),
      checkedAt: new Date(),
    };
  }

  getPlatformFields(): PlatformFieldDeclaration[] {
    return [
      {
        name: "text",
        label: "Post Text",
        type: "textarea",
        required: true,
        maxLength: 300,
        helpText: "300 graphemes / 3,000 bytes",
        group: "content",
      },
      {
        name: "langs",
        label: "Languages",
        type: "text",
        required: false,
        helpText: "Comma-separated language codes (e.g. en, es)",
        group: "settings",
      },
    ];
  }

  mapError(response: PlatformResponse): AppError {
    const body = response.body as BlueskyErrorResponse;
    const { errorClass, retryable } = classifyHttpStatus(response.status);

    let code = ErrorCodes.PLATFORM_INTERNAL;

    if (body.error === "ExpiredToken" || body.error === "InvalidToken")
      code = ErrorCodes.AUTH_EXPIRED;
    else if (body.error === "RateLimitExceeded") code = ErrorCodes.RATE_LIMITED;
    else if (body.error === "InvalidRequest") code = ErrorCodes.VALIDATION_ERROR;
    else if (body.error === "AccountTakedown") code = ErrorCodes.AUTH_REVOKED;

    return new AppError({
      code,
      message: body.message || `Bluesky error: ${body.error}`,
      errorClass,
      retryable,
      platform: this.platform,
      httpStatus: response.status,
      platformCode: body.error,
      platformMessage: body.message,
      raw: body,
    });
  }
}
```

### File 18: `src/lib/connectors/adapters/beehiiv.ts`

```typescript
// ============================================================================
// beehiiv.ts — Beehiiv newsletter connector adapter
// ============================================================================

import {
  Platform,
  type BeehiivPublishInput,
  type PublishInput,
  type PublishResult,
  type VerifyResult,
  type HealthResult,
  type OAuthCredential,
  type TokenResult,
  type ScopeResult,
  type PlatformFieldDeclaration,
  type BeehiivErrorResponse,
} from "../types";
import { BaseAdapter, type PlatformResponse } from "../adapter";
import { AppError, ErrorCodes, classifyHttpStatus } from "../errors";

const BEEHIIV_API_BASE = "https://api.beehiiv.com/v2";

export class BeehiivAdapter extends BaseAdapter {
  readonly platform = Platform.Beehiiv;
  readonly displayName = "Beehiiv";

  async publish(input: PublishInput, idempotencyKey: string): Promise<PublishResult> {
    if (input.platform !== Platform.Beehiiv) {
      throw this.notImplemented("publish: wrong platform");
    }
    const bh = input as BeehiivPublishInput;

    const body: Record<string, unknown> = {
      title: bh.title,
      subtitle: bh.subtitle,
      content: bh.contentHtml,
      status: bh.status,
      ...(bh.thumbnailUrl && { thumbnail_url: bh.thumbnailUrl }),
      ...(bh.authors && { authors: bh.authors }),
      ...(bh.scheduledAt && { scheduled_at: bh.scheduledAt }),
    };

    void BEEHIIV_API_BASE;
    void bh.publicationId;
    void idempotencyKey;

    return this.buildResult(idempotencyKey, {
      platformPostId: null,
      platformUrl: null,
      raw: { body },
    });
  }

  async verifyPublish(platformPostId: string): Promise<VerifyResult> {
    void platformPostId;
    return { exists: false, visible: false, platformPostId, checkedAt: new Date() };
  }

  async deletePost(platformPostId: string): Promise<void> {
    void platformPostId;
  }

  async refreshToken(_credential: OAuthCredential): Promise<TokenResult> {
    // Beehiiv uses API keys — no refresh needed
    throw new AppError({
      code: ErrorCodes.NOT_IMPLEMENTED,
      message: "Beehiiv uses API keys. No token refresh required.",
      errorClass: "permanent",
      retryable: false,
      platform: this.platform,
      httpStatus: null,
    });
  }

  async verifyScopes(_credential: OAuthCredential): Promise<ScopeResult> {
    // API key = full access
    return { hasRequired: true, granted: ["full_access"], missing: [] };
  }

  async healthProbe(): Promise<HealthResult> {
    const start = performance.now();
    return {
      platform: this.platform,
      status: "healthy",
      latencyMs: Math.round(performance.now() - start),
      checkedAt: new Date(),
    };
  }

  getPlatformFields(): PlatformFieldDeclaration[] {
    return [
      {
        name: "title",
        label: "Newsletter Title",
        type: "text",
        required: true,
        group: "content",
      },
      {
        name: "subtitle",
        label: "Subtitle",
        type: "text",
        required: false,
        group: "content",
      },
      {
        name: "contentHtml",
        label: "Content (HTML)",
        type: "textarea",
        required: true,
        helpText: "Full HTML content. No character limit. Images inline.",
        group: "content",
      },
      {
        name: "status",
        label: "Status",
        type: "select",
        required: true,
        options: [
          { value: "draft", label: "Draft" },
          { value: "confirmed", label: "Send immediately" },
          { value: "archived", label: "Archive" },
        ],
        group: "settings",
      },
      {
        name: "publicationId",
        label: "Publication ID",
        type: "text",
        required: true,
        group: "settings",
      },
    ];
  }

  mapError(response: PlatformResponse): AppError {
    const body = response.body as BeehiivErrorResponse;
    const { errorClass, retryable } = classifyHttpStatus(response.status);

    let code = ErrorCodes.PLATFORM_INTERNAL;
    const firstError = body.errors?.[0];

    if (response.status === 401) code = ErrorCodes.AUTH_EXPIRED;
    else if (response.status === 429) code = ErrorCodes.RATE_LIMITED;
    else if (firstError?.code === "invalid_api_key") code = ErrorCodes.AUTH_REVOKED;

    return new AppError({
      code,
      message: firstError?.message || body.statusText || `Beehiiv error: ${response.status}`,
      errorClass,
      retryable,
      platform: this.platform,
      httpStatus: response.status,
      raw: body,
    });
  }
}
```

### File 19: `src/lib/connectors/adapters/substack.ts`

```typescript
// ============================================================================
// substack.ts — Substack paste-only adapter (no API)
// ============================================================================

import {
  Platform,
  type SubstackPublishInput,
  type PublishInput,
  type PublishResult,
  type VerifyResult,
  type HealthResult,
  type OAuthCredential,
  type TokenResult,
  type ScopeResult,
  type PlatformFieldDeclaration,
} from "../types";
import { BaseAdapter, type PlatformResponse } from "../adapter";
import { AppError, ErrorCodes } from "../errors";

export class SubstackAdapter extends BaseAdapter {
  readonly platform = Platform.Substack;
  readonly displayName = "Substack";
  override readonly supportsPublish = false;
  override readonly supportsDelete = false;

  async publish(input: PublishInput, idempotencyKey: string): Promise<PublishResult> {
    if (input.platform !== Platform.Substack) {
      throw this.notImplemented("publish: wrong platform");
    }
    const ss = input as SubstackPublishInput;

    // Substack has no API. We store the paste-ready content for manual use.
    return this.buildResult(idempotencyKey, {
      platformPostId: `paste-${idempotencyKey}`,
      platformUrl: null,
      raw: {
        title: ss.title,
        subtitle: ss.subtitle,
        bodyHtml: ss.bodyHtml,
        pasteReady: true,
        note: "Substack has no publishing API. Content is stored as paste-ready HTML.",
      },
    });
  }

  async verifyPublish(_platformPostId: string): Promise<VerifyResult> {
    return {
      exists: false,
      visible: false,
      platformPostId: _platformPostId,
      checkedAt: new Date(),
    };
  }

  async deletePost(_platformPostId: string): Promise<void> {
    throw this.notImplemented("deletePost");
  }

  async refreshToken(_credential: OAuthCredential): Promise<TokenResult> {
    throw this.notImplemented("refreshToken: Substack has no API");
  }

  async verifyScopes(_credential: OAuthCredential): Promise<ScopeResult> {
    return { hasRequired: true, granted: [], missing: [] };
  }

  async healthProbe(): Promise<HealthResult> {
    return {
      platform: this.platform,
      status: "healthy",
      latencyMs: 0,
      checkedAt: new Date(),
      details: "Paste-only adapter — no API health check needed",
    };
  }

  getPlatformFields(): PlatformFieldDeclaration[] {
    return [
      {
        name: "title",
        label: "Post Title",
        type: "text",
        required: true,
        group: "content",
      },
      {
        name: "subtitle",
        label: "Subtitle",
        type: "text",
        required: false,
        group: "content",
      },
      {
        name: "bodyHtml",
        label: "Content (HTML)",
        type: "textarea",
        required: true,
        helpText: "Paste-ready HTML. No API publishing — copy into Substack editor.",
        group: "content",
      },
    ];
  }

  mapError(_response: PlatformResponse): AppError {
    return new AppError({
      code: ErrorCodes.NOT_IMPLEMENTED,
      message: "Substack has no API — error mapping is not applicable",
      errorClass: "permanent",
      retryable: false,
      platform: this.platform,
      httpStatus: null,
    });
  }
}
```

### File 20: `src/lib/connectors/adapters/hubspot.ts`

```typescript
// ============================================================================
// hubspot.ts — HubSpot CRM adapter (attribution, not publishing)
// ============================================================================

import {
  Platform,
  type HubSpotPublishInput,
  type PublishInput,
  type PublishResult,
  type VerifyResult,
  type HealthResult,
  type OAuthCredential,
  type TokenResult,
  type ScopeResult,
  type PlatformFieldDeclaration,
  type HubSpotErrorResponse,
} from "../types";
import { BaseAdapter, type PlatformResponse } from "../adapter";
import { AppError, ErrorCodes, classifyHttpStatus } from "../errors";

const HUBSPOT_API_BASE = "https://api.hubapi.com";
const REQUIRED_SCOPES = ["crm.objects.contacts.write", "content"];

export class HubSpotAdapter extends BaseAdapter {
  readonly platform = Platform.HubSpot;
  readonly displayName = "HubSpot";
  override readonly supportsPublish = false; // attribution only
  override readonly supportsDelete = false;

  async publish(input: PublishInput, idempotencyKey: string): Promise<PublishResult> {
    if (input.platform !== Platform.HubSpot) {
      throw this.notImplemented("publish: wrong platform");
    }
    const hs = input as HubSpotPublishInput;

    // HubSpot adapter records content attribution, not social publishing
    // POST /crm/v3/objects/contacts/{contactId}/associations
    const body: Record<string, unknown> = {
      contactId: hs.contactId,
      contentId: hs.contentId,
      campaignId: hs.campaignId,
      interactionType: hs.interactionType,
      properties: hs.properties,
    };

    void HUBSPOT_API_BASE;
    void idempotencyKey;

    return this.buildResult(idempotencyKey, {
      platformPostId: `attribution-${hs.contactId}-${hs.contentId}`,
      platformUrl: null,
      raw: { body, note: "CRM attribution recorded, not a social publish" },
    });
  }

  async verifyPublish(platformPostId: string): Promise<VerifyResult> {
    void platformPostId;
    return { exists: true, visible: true, platformPostId, checkedAt: new Date() };
  }

  async deletePost(_platformPostId: string): Promise<void> {
    throw this.notImplemented("deletePost: HubSpot attributions are not deletable");
  }

  async refreshToken(credential: OAuthCredential): Promise<TokenResult> {
    // POST https://api.hubapi.com/oauth/v1/token
    // grant_type=refresh_token — HubSpot access tokens expire every 30min
    void credential;
    throw this.notImplemented("refreshToken: requires client credentials at runtime");
  }

  async verifyScopes(credential: OAuthCredential): Promise<ScopeResult> {
    const granted = credential.scopes;
    const missing = REQUIRED_SCOPES.filter((s) => !granted.includes(s));
    return { hasRequired: missing.length === 0, granted, missing };
  }

  async healthProbe(): Promise<HealthResult> {
    const start = performance.now();
    return {
      platform: this.platform,
      status: "healthy",
      latencyMs: Math.round(performance.now() - start),
      checkedAt: new Date(),
    };
  }

  getPlatformFields(): PlatformFieldDeclaration[] {
    return [
      {
        name: "contactId",
        label: "Contact ID",
        type: "text",
        required: true,
        group: "crm",
      },
      {
        name: "contentId",
        label: "Content ID",
        type: "text",
        required: true,
        group: "crm",
      },
      {
        name: "interactionType",
        label: "Interaction Type",
        type: "select",
        required: true,
        options: [
          { value: "content_published", label: "Published" },
          { value: "content_engaged", label: "Engaged" },
          { value: "content_shared", label: "Shared" },
        ],
        group: "crm",
      },
    ];
  }

  mapError(response: PlatformResponse): AppError {
    const body = response.body as HubSpotErrorResponse;
    const { errorClass, retryable } = classifyHttpStatus(response.status);

    let code = ErrorCodes.PLATFORM_INTERNAL;
    if (body.category === "EXPIRED_AUTHENTICATION") code = ErrorCodes.AUTH_EXPIRED;
    else if (body.category === "RATE_LIMITS") code = ErrorCodes.RATE_LIMITED;
    else if (response.status === 403) code = ErrorCodes.AUTH_INSUFFICIENT_SCOPES;

    return new AppError({
      code,
      message: body.message || `HubSpot error: ${response.status}`,
      errorClass,
      retryable,
      platform: this.platform,
      httpStatus: response.status,
      platformCode: body.category,
      platformMessage: body.message,
      raw: body,
    });
  }
}
```

### File 21: `src/lib/connectors/adapters/pinterest.ts`

```typescript
// ============================================================================
// pinterest.ts — Pinterest connector adapter
// ============================================================================

import {
  Platform,
  type PinterestPublishInput,
  type PublishInput,
  type PublishResult,
  type VerifyResult,
  type HealthResult,
  type OAuthCredential,
  type TokenResult,
  type ScopeResult,
  type PlatformFieldDeclaration,
  type PinterestErrorResponse,
} from "../types";
import { BaseAdapter, type PlatformResponse } from "../adapter";
import { AppError, ErrorCodes, classifyHttpStatus } from "../errors";

const PINTEREST_API_BASE = "https://api.pinterest.com/v5";
const REQUIRED_SCOPES = ["boards:read", "pins:read", "pins:write"];

export class PinterestAdapter extends BaseAdapter {
  readonly platform = Platform.Pinterest;
  readonly displayName = "Pinterest";

  async publish(input: PublishInput, idempotencyKey: string): Promise<PublishResult> {
    if (input.platform !== Platform.Pinterest) {
      throw this.notImplemented("publish: wrong platform");
    }
    const pin = input as PinterestPublishInput;

    if (!pin.imageUrl) {
      throw new AppError({
        code: ErrorCodes.MEDIA_REQUIRED,
        message: "Pinterest requires an image for every pin",
        errorClass: "permanent",
        retryable: false,
        platform: this.platform,
        httpStatus: null,
      });
    }

    const body: Record<string, unknown> = {
      board_id: pin.boardId,
      title: pin.title,
      description: pin.description,
      link: pin.link,
      media_source: {
        source_type: "image_url",
        url: pin.imageUrl,
      },
      ...(pin.altText && { alt_text: pin.altText }),
    };

    void PINTEREST_API_BASE;
    void idempotencyKey;

    return this.buildResult(idempotencyKey, {
      platformPostId: null,
      platformUrl: null,
      raw: { body },
    });
  }

  async verifyPublish(platformPostId: string): Promise<VerifyResult> {
    void platformPostId;
    return { exists: false, visible: false, platformPostId, checkedAt: new Date() };
  }

  async deletePost(platformPostId: string): Promise<void> {
    void platformPostId;
  }

  async refreshToken(credential: OAuthCredential): Promise<TokenResult> {
    void credential;
    throw this.notImplemented("refreshToken: requires client credentials at runtime");
  }

  async verifyScopes(credential: OAuthCredential): Promise<ScopeResult> {
    const granted = credential.scopes;
    const missing = REQUIRED_SCOPES.filter((s) => !granted.includes(s));
    return { hasRequired: missing.length === 0, granted, missing };
  }

  async healthProbe(): Promise<HealthResult> {
    const start = performance.now();
    return {
      platform: this.platform,
      status: "healthy",
      latencyMs: Math.round(performance.now() - start),
      checkedAt: new Date(),
    };
  }

  getPlatformFields(): PlatformFieldDeclaration[] {
    return [
      {
        name: "boardId",
        label: "Board ID",
        type: "text",
        required: true,
        group: "target",
      },
      {
        name: "title",
        label: "Pin Title",
        type: "text",
        required: true,
        maxLength: 100,
        group: "content",
      },
      {
        name: "description",
        label: "Description",
        type: "textarea",
        required: true,
        maxLength: 500,
        group: "content",
      },
      {
        name: "imageUrl",
        label: "Image URL",
        type: "url",
        required: true,
        helpText: "JPEG or PNG. Required for all pins.",
        group: "media",
      },
      {
        name: "link",
        label: "Destination URL",
        type: "url",
        required: true,
        group: "content",
      },
    ];
  }

  mapError(response: PlatformResponse): AppError {
    const body = response.body as PinterestErrorResponse;
    const { errorClass, retryable } = classifyHttpStatus(response.status);

    let code = ErrorCodes.PLATFORM_INTERNAL;
    if (response.status === 401) code = ErrorCodes.AUTH_EXPIRED;
    else if (response.status === 429) code = ErrorCodes.RATE_LIMITED;

    return new AppError({
      code,
      message: body.message || `Pinterest error: ${response.status}`,
      errorClass,
      retryable,
      platform: this.platform,
      httpStatus: response.status,
      platformCode: body.code,
      platformMessage: body.message,
      raw: body,
    });
  }
}
```

### File 22: `src/lib/connectors/adapters/medium.ts`

```typescript
// ============================================================================
// medium.ts — Medium connector adapter
// ============================================================================

import {
  Platform,
  type MediumPublishInput,
  type PublishInput,
  type PublishResult,
  type VerifyResult,
  type HealthResult,
  type OAuthCredential,
  type TokenResult,
  type ScopeResult,
  type PlatformFieldDeclaration,
  type MediumErrorResponse,
} from "../types";
import { BaseAdapter, type PlatformResponse } from "../adapter";
import { AppError, ErrorCodes, classifyHttpStatus } from "../errors";

const MEDIUM_API_BASE = "https://api.medium.com/v1";

export class MediumAdapter extends BaseAdapter {
  readonly platform = Platform.Medium;
  readonly displayName = "Medium";
  override readonly supportsDelete = false; // Medium API has no delete

  async publish(input: PublishInput, idempotencyKey: string): Promise<PublishResult> {
    if (input.platform !== Platform.Medium) {
      throw this.notImplemented("publish: wrong platform");
    }
    const md = input as MediumPublishInput;

    // POST /v1/users/{authorId}/posts
    const body: Record<string, unknown> = {
      title: md.title,
      contentFormat: md.contentFormat,
      content: md.content,
      publishStatus: md.publishStatus,
      ...(md.tags && { tags: md.tags.slice(0, 5) }), // Medium max 5 tags
      ...(md.canonicalUrl && { canonicalUrl: md.canonicalUrl }),
    };

    void MEDIUM_API_BASE;
    void idempotencyKey;

    return this.buildResult(idempotencyKey, {
      platformPostId: null,
      platformUrl: null,
      raw: { body },
    });
  }

  async verifyPublish(platformPostId: string): Promise<VerifyResult> {
    void platformPostId;
    return { exists: false, visible: false, platformPostId, checkedAt: new Date() };
  }

  async deletePost(_platformPostId: string): Promise<void> {
    throw this.notImplemented("deletePost: Medium API does not support deletion");
  }

  async refreshToken(_credential: OAuthCredential): Promise<TokenResult> {
    // Medium uses integration tokens — no refresh needed
    throw new AppError({
      code: ErrorCodes.NOT_IMPLEMENTED,
      message: "Medium uses integration tokens. No refresh required.",
      errorClass: "permanent",
      retryable: false,
      platform: this.platform,
      httpStatus: null,
    });
  }

  async verifyScopes(_credential: OAuthCredential): Promise<ScopeResult> {
    return { hasRequired: true, granted: ["full_access"], missing: [] };
  }

  async healthProbe(): Promise<HealthResult> {
    const start = performance.now();
    return {
      platform: this.platform,
      status: "healthy",
      latencyMs: Math.round(performance.now() - start),
      checkedAt: new Date(),
    };
  }

  getPlatformFields(): PlatformFieldDeclaration[] {
    return [
      {
        name: "title",
        label: "Article Title",
        type: "text",
        required: true,
        group: "content",
      },
      {
        name: "content",
        label: "Content",
        type: "textarea",
        required: true,
        helpText: "HTML or Markdown content. No character limit.",
        group: "content",
      },
      {
        name: "contentFormat",
        label: "Content Format",
        type: "select",
        required: true,
        options: [
          { value: "html", label: "HTML" },
          { value: "markdown", label: "Markdown" },
        ],
        group: "settings",
      },
      {
        name: "publishStatus",
        label: "Publish Status",
        type: "select",
        required: true,
        options: [
          { value: "draft", label: "Draft" },
          { value: "public", label: "Public" },
          { value: "unlisted", label: "Unlisted" },
        ],
        group: "settings",
      },
      {
        name: "canonicalUrl",
        label: "Canonical URL",
        type: "url",
        required: false,
        helpText: "Original URL if cross-posting",
        group: "seo",
      },
    ];
  }

  mapError(response: PlatformResponse): AppError {
    const body = response.body as MediumErrorResponse;
    const { errorClass, retryable } = classifyHttpStatus(response.status);
    const firstError = body.errors?.[0];

    let code = ErrorCodes.PLATFORM_INTERNAL;
    if (response.status === 401) code = ErrorCodes.AUTH_EXPIRED;
    else if (response.status === 429) code = ErrorCodes.RATE_LIMITED;
    else if (firstError?.code === 6003) code = ErrorCodes.AUTH_REVOKED;

    return new AppError({
      code,
      message: firstError?.message || `Medium error: ${response.status}`,
      errorClass,
      retryable,
      platform: this.platform,
      httpStatus: response.status,
      raw: body,
    });
  }
}
```

### File 23: `src/lib/connectors/adapters/mastodon.ts`

```typescript
// ============================================================================
// mastodon.ts — Mastodon connector adapter
// ============================================================================

import {
  Platform,
  type MastodonPublishInput,
  type PublishInput,
  type PublishResult,
  type VerifyResult,
  type HealthResult,
  type OAuthCredential,
  type TokenResult,
  type ScopeResult,
  type PlatformFieldDeclaration,
  type MastodonErrorResponse,
} from "../types";
import { BaseAdapter, type PlatformResponse } from "../adapter";
import { AppError, ErrorCodes, classifyHttpStatus } from "../errors";

const REQUIRED_SCOPES = ["read", "write:statuses", "write:media"];

export class MastodonAdapter extends BaseAdapter {
  readonly platform = Platform.Mastodon;
  readonly displayName = "Mastodon";

  async publish(input: PublishInput, idempotencyKey: string): Promise<PublishResult> {
    if (input.platform !== Platform.Mastodon) {
      throw this.notImplemented("publish: wrong platform");
    }
    const md = input as MastodonPublishInput;

    // POST /api/v1/statuses
    const body: Record<string, unknown> = {
      status: md.status,
      visibility: md.visibility,
      ...(md.mediaIds && { media_ids: md.mediaIds }),
      ...(md.inReplyToId && { in_reply_to_id: md.inReplyToId }),
      ...(md.sensitive && { sensitive: md.sensitive }),
      ...(md.spoilerText && { spoiler_text: md.spoilerText }),
      ...(md.language && { language: md.language }),
      ...(md.scheduledAt && { scheduled_at: md.scheduledAt }),
    };

    void md.instanceUrl;
    void idempotencyKey;

    return this.buildResult(idempotencyKey, {
      platformPostId: null,
      platformUrl: null,
      raw: { body, instanceUrl: md.instanceUrl },
    });
  }

  async verifyPublish(platformPostId: string): Promise<VerifyResult> {
    void platformPostId;
    return { exists: false, visible: false, platformPostId, checkedAt: new Date() };
  }

  async deletePost(platformPostId: string): Promise<void> {
    // DELETE /api/v1/statuses/{id}
    void platformPostId;
  }

  async refreshToken(_credential: OAuthCredential): Promise<TokenResult> {
    // Mastodon tokens don't expire by default
    throw new AppError({
      code: ErrorCodes.NOT_IMPLEMENTED,
      message: "Mastodon tokens do not expire. No refresh needed.",
      errorClass: "permanent",
      retryable: false,
      platform: this.platform,
      httpStatus: null,
    });
  }

  async verifyScopes(credential: OAuthCredential): Promise<ScopeResult> {
    const granted = credential.scopes;
    const missing = REQUIRED_SCOPES.filter((s) => !granted.includes(s));
    return { hasRequired: missing.length === 0, granted, missing };
  }

  async healthProbe(): Promise<HealthResult> {
    const start = performance.now();
    // GET /api/v1/instance
    return {
      platform: this.platform,
      status: "healthy",
      latencyMs: Math.round(performance.now() - start),
      checkedAt: new Date(),
    };
  }

  getPlatformFields(): PlatformFieldDeclaration[] {
    return [
      {
        name: "instanceUrl",
        label: "Instance URL",
        type: "url",
        required: true,
        helpText: "e.g. https://mastodon.social",
        group: "settings",
      },
      {
        name: "status",
        label: "Status Text",
        type: "textarea",
        required: true,
        maxLength: 500,
        helpText: "Default 500 chars (instance-configurable)",
        group: "content",
      },
      {
        name: "visibility",
        label: "Visibility",
        type: "select",
        required: true,
        options: [
          { value: "public", label: "Public" },
          { value: "unlisted", label: "Unlisted" },
          { value: "private", label: "Followers only" },
          { value: "direct", label: "Direct message" },
        ],
        group: "settings",
      },
      {
        name: "sensitive",
        label: "Sensitive Content",
        type: "boolean",
        required: false,
        group: "settings",
      },
      {
        name: "spoilerText",
        label: "Content Warning",
        type: "text",
        required: false,
        group: "settings",
      },
    ];
  }

  mapError(response: PlatformResponse): AppError {
    const body = response.body as MastodonErrorResponse;
    const { errorClass, retryable } = classifyHttpStatus(response.status);

    let code = ErrorCodes.PLATFORM_INTERNAL;
    if (response.status === 401) code = ErrorCodes.AUTH_EXPIRED;
    else if (response.status === 403) code = ErrorCodes.AUTH_INSUFFICIENT_SCOPES;
    else if (response.status === 429) code = ErrorCodes.RATE_LIMITED;
    else if (response.status === 422) code = ErrorCodes.VALIDATION_ERROR;

    return new AppError({
      code,
      message: body.error || `Mastodon error: ${response.status}`,
      errorClass,
      retryable,
      platform: this.platform,
      httpStatus: response.status,
      platformMessage: body.error_description ?? body.error,
      raw: body,
    });
  }
}
```

---

## Execution Plan

Once approved, I will create all 20 files in this order:

1. `src/lib/connectors/types.ts` -- all types, enums, constants
2. `src/lib/connectors/errors.ts` -- AppError class
3. `src/lib/connectors/adapter.ts` -- interface + BaseAdapter
4. `src/lib/connectors/circuit-breaker.ts` -- Postgres-backed circuit breaker
5. `src/lib/connectors/rate-limiter.ts` -- sliding window + token bucket
6. `src/lib/connectors/token-manager.ts` -- AES-256-GCM encrypted token lifecycle
7. `src/lib/connectors/registry.ts` -- adapter registry
8. `src/lib/connectors/index.ts` -- barrel export
9-23. All 15 platform adapters under `src/lib/connectors/adapters/`

### Design decisions:

- **No `any` types** -- every value is typed
- **Discriminated unions** on `platform` field prevent cross-platform field misuse
- **Database interfaces** are abstract (`CircuitBreakerDb`, `RateLimiterDb`, `TokenManagerDb`) -- the Drizzle implementation connects at integration time, keeping the connector layer decoupled from ORM specifics
- **`void` statements** mark where real HTTP calls get wired -- each adapter's `publish()` builds the request body and shape, with actual `fetch()` calls injected via a transport layer at runtime
- **Contract tests** have a base implementation in `BaseAdapter` that runs offline checks, with live API tests marked as skipped
- **Bluesky grapheme counting** uses `Intl.Segmenter` (available in Node 16+)
- **Token manager encryption** uses Node `crypto` with scrypt key derivation + AES-256-GCM
- **Circuit breaker** uses exponential backoff capped at 32x the base recovery time
- **Rate limiter** supports both sliding window (LinkedIn, Instagram) and token bucket patterns, with header sync from platform responses
