import type { Platform } from "@/lib/platforms";

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

  isRateLimited(): boolean {
    return this.httpStatus === 429 || this.code === "RATE_LIMITED";
  }

  isAuthError(): boolean {
    return (
      this.httpStatus === 401 ||
      this.httpStatus === 403 ||
      this.code === "AUTH_EXPIRED"
    );
  }
}

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

  // Account
  ACCOUNT_RESTRICTED: "ACCOUNT_RESTRICTED",
  ACCOUNT_WARMUP_REQUIRED: "ACCOUNT_WARMUP_REQUIRED",

  // Publish
  PUBLISH_FAILED: "PUBLISH_FAILED",
  PUBLISH_GHOST: "PUBLISH_GHOST",
  VERIFY_FAILED: "VERIFY_FAILED",

  // General
  UNKNOWN: "UNKNOWN",
  VALIDATION_ERROR: "VALIDATION_ERROR",
  NOT_IMPLEMENTED: "NOT_IMPLEMENTED",
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

export function classifyHttpStatus(
  status: number,
): { errorClass: ErrorClass; retryable: boolean } {
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

export interface PlatformErrorResponse {
  httpStatus: number;
  body: unknown;
  headers?: Record<string, string>;
}

/**
 * Maps a raw platform HTTP response to an AppError with platform-specific
 * code extraction. Each platform encodes errors differently — this handles
 * LinkedIn serviceErrorCode, X error arrays, Meta error.code/error_subcode,
 * Reddit json.errors, and generic fallbacks.
 */
export function mapPlatformError(
  platform: Platform,
  response: PlatformErrorResponse,
): AppError {
  const { httpStatus, body } = response;
  const base = classifyHttpStatus(httpStatus);

  const platformCode = extractPlatformCode(platform, body);
  const platformMessage = extractPlatformMessage(platform, body);

  const override = getCodeOverride(platform, httpStatus, platformCode);

  return new AppError({
    code: override?.code ?? mapHttpToErrorCode(httpStatus),
    message: platformMessage || `${platform} API returned ${httpStatus}`,
    errorClass: override?.errorClass ?? base.errorClass,
    retryable: override?.retryable ?? base.retryable,
    platform,
    httpStatus,
    platformCode: platformCode ?? undefined,
    platformMessage: platformMessage ?? undefined,
    raw: body,
  });
}

function extractPlatformCode(
  platform: Platform,
  body: unknown,
): string | number | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;

  switch (platform) {
    case "linkedin":
      return (b.serviceErrorCode as number) ?? null;
    case "twitter": {
      const errors = (b.errors ?? b.detail) as
        | Array<{ code?: number }>
        | undefined;
      return errors?.[0]?.code ?? null;
    }
    case "facebook":
    case "instagram":
    case "threads": {
      const err = b.error as Record<string, unknown> | undefined;
      return err?.code as number ?? null;
    }
    case "reddit": {
      const json = b.json as Record<string, unknown> | undefined;
      const errors = json?.errors as Array<[string, string, string]> | undefined;
      return errors?.[0]?.[0] ?? null;
    }
    case "tiktok":
      return (b.error as Record<string, unknown>)?.code as string ?? null;
    default:
      return (b.code as string | number) ?? null;
  }
}

function extractPlatformMessage(
  platform: Platform,
  body: unknown,
): string | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;

  switch (platform) {
    case "linkedin":
      return (b.message as string) ?? null;
    case "twitter": {
      const errors = b.errors as Array<{ message?: string }> | undefined;
      return errors?.[0]?.message ?? (b.detail as string) ?? null;
    }
    case "facebook":
    case "instagram":
    case "threads": {
      const err = b.error as Record<string, unknown> | undefined;
      return (err?.message as string) ?? null;
    }
    case "reddit": {
      const json = b.json as Record<string, unknown> | undefined;
      const errors = json?.errors as Array<[string, string, string]> | undefined;
      return errors?.[0]?.[1] ?? null;
    }
    default:
      return (b.message as string) ?? (b.error as string) ?? null;
  }
}

interface ErrorOverride {
  code: string;
  errorClass: ErrorClass;
  retryable: boolean;
}

function getCodeOverride(
  platform: Platform,
  httpStatus: number,
  platformCode: string | number | null,
): ErrorOverride | null {
  if (httpStatus === 429) {
    return { code: ErrorCodes.RATE_LIMITED, errorClass: "transient", retryable: true };
  }

  if (httpStatus === 401) {
    return { code: ErrorCodes.AUTH_EXPIRED, errorClass: "permanent", retryable: false };
  }

  if (platform === "facebook" || platform === "instagram" || platform === "threads") {
    if (platformCode === 190) {
      return { code: ErrorCodes.AUTH_EXPIRED, errorClass: "permanent", retryable: false };
    }
    if (platformCode === 4) {
      return { code: ErrorCodes.RATE_LIMITED, errorClass: "transient", retryable: true };
    }
    if (platformCode === 506) {
      return { code: ErrorCodes.PLATFORM_DUPLICATE, errorClass: "permanent", retryable: false };
    }
  }

  if (platform === "linkedin" && platformCode === 100) {
    return { code: ErrorCodes.RATE_LIMITED, errorClass: "transient", retryable: true };
  }

  return null;
}

function mapHttpToErrorCode(httpStatus: number): string {
  if (httpStatus === 429) return ErrorCodes.RATE_LIMITED;
  if (httpStatus === 401) return ErrorCodes.AUTH_EXPIRED;
  if (httpStatus === 403) return ErrorCodes.AUTH_INSUFFICIENT_SCOPES;
  if (httpStatus === 404) return ErrorCodes.PLATFORM_NOT_FOUND;
  if (httpStatus === 409) return ErrorCodes.PLATFORM_DUPLICATE;
  if (httpStatus === 413) return ErrorCodes.MEDIA_TOO_LARGE;
  if (httpStatus >= 500) return ErrorCodes.PLATFORM_INTERNAL;
  return ErrorCodes.PUBLISH_FAILED;
}
