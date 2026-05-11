import type { Platform } from "@/lib/platforms";
import type {
  PublishInput,
  PublishResult,
  VerifyResult,
  HealthResult,
  MediaInput,
  MediaValidationResult,
  CharacterLimit,
  TokenResult,
  OAuthCredential,
  AuthMethod,
} from "./types";
import { CHARACTER_LIMITS, MEDIA_CONSTRAINTS } from "./types";
import { AppError, mapPlatformError } from "@/lib/errors/app-error";

export interface ContentValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface ConnectorAdapter {
  readonly platform: Platform;
  readonly supportsPublish: boolean;
  readonly supportsDelete: boolean;
  readonly authMethod: AuthMethod;

  publish(
    input: PublishInput,
    token: string,
    idempotencyKey: string,
  ): Promise<PublishResult>;

  verify(platformPostId: string, token: string): Promise<VerifyResult>;

  deletePost(platformPostId: string, token: string): Promise<void>;

  refreshToken(credential: OAuthCredential): Promise<TokenResult>;

  validateContent(input: PublishInput): ContentValidationResult;

  validateMedia(media: MediaInput): MediaValidationResult;

  healthProbe(): Promise<HealthResult>;

  mapError(httpStatus: number, body: unknown): AppError;
}

export abstract class BaseAdapter implements ConnectorAdapter {
  abstract readonly platform: Platform;
  abstract readonly supportsPublish: boolean;
  abstract readonly supportsDelete: boolean;
  abstract readonly authMethod: AuthMethod;

  abstract publish(
    input: PublishInput,
    token: string,
    idempotencyKey: string,
  ): Promise<PublishResult>;

  abstract verify(platformPostId: string, token: string): Promise<VerifyResult>;

  abstract deletePost(platformPostId: string, token: string): Promise<void>;

  abstract refreshToken(credential: OAuthCredential): Promise<TokenResult>;

  abstract healthProbe(): Promise<HealthResult>;

  validateContent(input: PublishInput): ContentValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const limits = CHARACTER_LIMITS[this.platform];

    const text = getTextContent(input);
    if (text && limits.maxCharacters && text.length > limits.maxCharacters) {
      errors.push(
        `Text exceeds ${limits.maxCharacters} char limit (got ${text.length})`,
      );
    }
    if (text && limits.maxBytes) {
      const byteLength = new TextEncoder().encode(text).length;
      if (byteLength > limits.maxBytes) {
        errors.push(
          `Text exceeds ${limits.maxBytes} byte limit (got ${byteLength})`,
        );
      }
    }
    if (text && limits.maxGraphemes) {
      const segmenter = new Intl.Segmenter(undefined, {
        granularity: "grapheme",
      });
      const graphemeCount = [...segmenter.segment(text)].length;
      if (graphemeCount > limits.maxGraphemes) {
        errors.push(
          `Text exceeds ${limits.maxGraphemes} grapheme limit (got ${graphemeCount})`,
        );
      }
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  validateMedia(media: MediaInput): MediaValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const constraints = MEDIA_CONSTRAINTS[this.platform];

    const ext = media.mimeType.split("/")[1]?.toLowerCase();
    const imageC = constraints.image;

    if (imageC && ext) {
      if (!imageC.allowedFormats.includes(ext)) {
        errors.push(
          `Format ${ext} not supported. Allowed: ${imageC.allowedFormats.join(", ")}`,
        );
      }
      const sizeMb = media.sizeBytes / (1024 * 1024);
      if (sizeMb > imageC.maxSizeMb) {
        errors.push(
          `File ${sizeMb.toFixed(1)}MB exceeds ${imageC.maxSizeMb}MB limit`,
        );
      }
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  mapError(httpStatus: number, body: unknown): AppError {
    return mapPlatformError(this.platform, { httpStatus, body });
  }
}

function getTextContent(input: PublishInput): string | null {
  switch (input.platform) {
    case "linkedin":
      return input.commentary;
    case "twitter":
      return input.text;
    case "instagram":
      return input.caption;
    case "threads":
      return input.text;
    case "facebook":
      return input.message;
    case "tiktok":
      return input.title;
    case "youtube":
      return input.title;
    case "reddit":
      return input.selftext ?? input.title;
    case "bluesky":
      return input.text;
    case "beehiiv":
      return input.title;
    case "substack":
      return input.title;
    case "hubspot":
      return null;
    case "pinterest":
      return input.description;
    case "medium":
      return input.title;
    case "mastodon":
      return input.status;
    default:
      return null;
  }
}
