import { Platform } from "@/lib/platforms";

export { Platform } from "@/lib/platforms";

export type AuthMethod = "oauth2" | "api_key" | "app_password" | "paste_only";

export interface OAuthCredential {
  workspaceId: string;
  platform: Platform;
  accessToken: string;
  refreshToken: string | null;
  expiresAt: Date | null;
  refreshTokenExpiresAt: Date | null;
  scopes: string[];
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
  identifier: string;
  appPassword: string;
  encryptedPayload: Buffer;
}

export type Credential =
  | OAuthCredential
  | ApiKeyCredential
  | AppPasswordCredential;

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

export const TOKEN_REFRESH_CONFIG: Record<
  Platform,
  {
    accessTokenLifetimeMs: number | null;
    refreshAtPercent: number;
    refreshTokenLifetimeMs: number | null;
    method: AuthMethod;
  }
> = {
  [Platform.TikTok]: {
    accessTokenLifetimeMs: 24 * 60 * 60 * 1000,
    refreshAtPercent: 0.75,
    refreshTokenLifetimeMs: 365 * 24 * 60 * 60 * 1000,
    method: "oauth2",
  },
  [Platform.Twitter]: {
    accessTokenLifetimeMs: 2 * 60 * 60 * 1000,
    refreshAtPercent: 0.75,
    refreshTokenLifetimeMs: null,
    method: "oauth2",
  },
  [Platform.YouTube]: {
    accessTokenLifetimeMs: 60 * 60 * 1000,
    refreshAtPercent: 0.75,
    refreshTokenLifetimeMs: null,
    method: "oauth2",
  },
  [Platform.Reddit]: {
    accessTokenLifetimeMs: 60 * 60 * 1000,
    refreshAtPercent: 0.75,
    refreshTokenLifetimeMs: null,
    method: "oauth2",
  },
  [Platform.LinkedIn]: {
    accessTokenLifetimeMs: 60 * 24 * 60 * 60 * 1000,
    refreshAtPercent: 0.85,
    refreshTokenLifetimeMs: 365 * 24 * 60 * 60 * 1000,
    method: "oauth2",
  },
  [Platform.Instagram]: {
    accessTokenLifetimeMs: 60 * 24 * 60 * 60 * 1000,
    refreshAtPercent: 0.5,
    refreshTokenLifetimeMs: null,
    method: "oauth2",
  },
  [Platform.Facebook]: {
    accessTokenLifetimeMs: 60 * 24 * 60 * 60 * 1000,
    refreshAtPercent: 0.5,
    refreshTokenLifetimeMs: null,
    method: "oauth2",
  },
  [Platform.Threads]: {
    accessTokenLifetimeMs: 60 * 24 * 60 * 60 * 1000,
    refreshAtPercent: 0.5,
    refreshTokenLifetimeMs: null,
    method: "oauth2",
  },
  [Platform.Bluesky]: {
    accessTokenLifetimeMs: null,
    refreshAtPercent: 0,
    refreshTokenLifetimeMs: null,
    method: "app_password",
  },
  [Platform.Beehiiv]: {
    accessTokenLifetimeMs: null,
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
    accessTokenLifetimeMs: 30 * 60 * 1000,
    refreshAtPercent: 0.75,
    refreshTokenLifetimeMs: 6 * 30 * 24 * 60 * 60 * 1000,
    method: "oauth2",
  },
  [Platform.Pinterest]: {
    accessTokenLifetimeMs: 60 * 60 * 1000,
    refreshAtPercent: 0.75,
    refreshTokenLifetimeMs: 365 * 24 * 60 * 60 * 1000,
    method: "oauth2",
  },
  [Platform.Medium]: {
    accessTokenLifetimeMs: null,
    refreshAtPercent: 0,
    refreshTokenLifetimeMs: null,
    method: "api_key",
  },
  [Platform.Mastodon]: {
    accessTokenLifetimeMs: null,
    refreshAtPercent: 0,
    refreshTokenLifetimeMs: null,
    method: "oauth2",
  },
};

export interface CharacterLimit {
  platform: Platform;
  textField: string;
  maxCharacters: number | null;
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
    textField: "description",
    maxCharacters: 5_000,
    maxBytes: null,
    maxGraphemes: null,
    premiumLimit: null,
  },
  [Platform.Reddit]: {
    platform: Platform.Reddit,
    textField: "selftext",
    maxCharacters: 40_000,
    maxBytes: null,
    maxGraphemes: null,
    premiumLimit: 80_000,
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
    maxCharacters: null,
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
    maxCharacters: 500,
    maxBytes: null,
    maxGraphemes: null,
    premiumLimit: null,
  },
};

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

export interface LinkedInPublishInput {
  platform: Platform.LinkedIn;
  authorUrn: string;
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
  imageUrl: string;
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
  scheduledPublishTime?: number;
  published?: boolean;
}

export interface TikTokPublishInput {
  platform: Platform.TikTok;
  videoUrl: string;
  title: string;
  privacyLevel:
    | "PUBLIC_TO_EVERYONE"
    | "MUTUAL_FOLLOW_FRIENDS"
    | "FOLLOWER_OF_CREATOR"
    | "SELF_ONLY";
  isAigc: boolean;
  disableComment?: boolean;
  disableDuet?: boolean;
  disableStitch?: boolean;
  videoCoverTimestampMs?: number;
  media?: MediaInput[];
}

export interface YouTubePublishInput {
  platform: Platform.YouTube;
  videoFile: string;
  title: string;
  description: string;
  tags?: string[];
  categoryId?: string;
  privacyStatus: "public" | "private" | "unlisted";
  publishAt?: string;
  thumbnailUrl?: string;
  playlistId?: string;
  media?: MediaInput[];
}

export interface RedditPublishInput {
  platform: Platform.Reddit;
  subreddit: string;
  title: string;
  kind: "self" | "link" | "image" | "video";
  selftext?: string;
  url?: string;
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
  scheduledAt?: string;
}

export interface SubstackPublishInput {
  platform: Platform.Substack;
  title: string;
  subtitle?: string;
  bodyHtml: string;
  pasteReady: true;
}

export interface HubSpotPublishInput {
  platform: Platform.HubSpot;
  contactId: string;
  contentId: string;
  campaignId?: string;
  interactionType:
    | "content_published"
    | "content_engaged"
    | "content_shared";
  properties: Record<string, string>;
}

export interface PinterestPublishInput {
  platform: Platform.Pinterest;
  boardId: string;
  title: string;
  description: string;
  link: string;
  imageUrl: string;
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

export interface PublishResult {
  success: boolean;
  platform: Platform;
  platformPostId: string | null;
  platformUrl: string | null;
  publishedAt: Date | null;
  idempotencyKey: string;
  raw: Record<string, unknown>;
}

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

export type HealthStatus = "healthy" | "degraded" | "down";

export interface HealthResult {
  platform: Platform;
  status: HealthStatus;
  latencyMs: number;
  checkedAt: Date;
  details?: string;
}

export interface PlatformFieldDeclaration {
  name: string;
  label: string;
  type:
    | "text"
    | "textarea"
    | "select"
    | "boolean"
    | "number"
    | "file"
    | "url";
  required: boolean;
  maxLength?: number;
  options?: Array<{ value: string; label: string }>;
  helpText?: string;
  group?: string;
}

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
