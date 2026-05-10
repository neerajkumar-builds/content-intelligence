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

  // Publish
  PUBLISH_FAILED: "PUBLISH_FAILED",
  PUBLISH_GHOST: "PUBLISH_GHOST",
  VERIFY_FAILED: "VERIFY_FAILED",

  // General
  UNKNOWN: "UNKNOWN",
  VALIDATION_ERROR: "VALIDATION_ERROR",
  NOT_IMPLEMENTED: "NOT_IMPLEMENTED",
} as const;

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
