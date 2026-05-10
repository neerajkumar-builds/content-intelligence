import { Platform } from "@/lib/platforms";
import { AppError, ErrorCodes } from "./app-error";

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
  limit: number;
  windowMs: number;
  refillRate?: number;
  burstSize?: number;
  scope: "app" | "user";
}

export const RATE_LIMIT_CONFIGS: Record<Platform, RateLimitConfig> = {
  [Platform.LinkedIn]: {
    platform: Platform.LinkedIn,
    limit: 100,
    windowMs: 24 * 60 * 60 * 1000,
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
    limit: 25,
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
    windowMs: 60 * 60 * 1000,
    scope: "app",
  },
  [Platform.TikTok]: {
    platform: Platform.TikTok,
    limit: 6,
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
    windowMs: 60 * 1000,
    scope: "user",
  },
  [Platform.Bluesky]: {
    platform: Platform.Bluesky,
    limit: 5_000,
    windowMs: 60 * 60 * 1000,
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
    limit: 0,
    windowMs: 0,
    scope: "user",
  },
  [Platform.HubSpot]: {
    platform: Platform.HubSpot,
    limit: 100,
    windowMs: 10 * 1000,
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
    windowMs: 5 * 60 * 1000,
    scope: "user",
  },
};

interface RateLimitRow {
  platform: string;
  scope_key: string;
  window_start: Date;
  request_count: number;
  tokens_remaining: number | null;
  last_refill_at: Date | null;
  updated_at: Date;
}

export interface RateLimiterDb {
  getState(
    platform: Platform,
    scopeKey: string,
  ): Promise<RateLimitRow | null>;
  upsertState(
    row: Partial<RateLimitRow> & { platform: string; scope_key: string },
  ): Promise<void>;
  incrementAndGet(
    platform: Platform,
    scopeKey: string,
    windowStartIfNew: Date,
  ): Promise<{ requestCount: number; windowStart: Date }>;
}

export class RateLimiter {
  private readonly db: RateLimiterDb;
  private readonly configOverrides: Map<Platform, Partial<RateLimitConfig>>;

  constructor(
    db: RateLimiterDb,
    overrides?: Map<Platform, Partial<RateLimitConfig>>,
  ) {
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

  async check(
    platform: Platform,
    scopeKey: string,
  ): Promise<RateLimitState> {
    const config = this.getConfig(platform);

    if (config.limit === 0) {
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
    now: Date,
  ): RateLimitState {
    const windowEnd = new Date(row.window_start.getTime() + config.windowMs);

    if (now >= windowEnd) {
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
    const retryAfterMs =
      remaining === 0
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
    now: Date,
  ): RateLimitState {
    const refillRate = config.refillRate!;
    const burstSize = config.burstSize!;
    const lastRefill = row.last_refill_at ?? row.window_start;
    const elapsedMs = now.getTime() - lastRefill.getTime();
    const tokensToAdd = Math.floor((elapsedMs / 1000) * refillRate);
    const currentTokens = Math.min(
      burstSize,
      (row.tokens_remaining ?? burstSize) + tokensToAdd,
    );

    return {
      platform,
      windowType: "token_bucket",
      limit: burstSize,
      remaining: currentTokens,
      resetsAt: new Date(now.getTime() + 1000 / refillRate),
      retryAfterMs: currentTokens === 0 ? Math.ceil(1000 / refillRate) : null,
    };
  }

  async consume(
    platform: Platform,
    scopeKey: string,
  ): Promise<RateLimitState> {
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
    config: RateLimitConfig,
  ): Promise<RateLimitState> {
    const now = new Date();
    const row = await this.db.getState(platform, scopeKey);

    let windowStart: Date;
    if (
      !row ||
      now.getTime() >= row.window_start.getTime() + config.windowMs
    ) {
      windowStart = now;
    } else {
      windowStart = row.window_start;
    }

    if (row && now.getTime() < row.window_start.getTime() + config.windowMs) {
      if (row.request_count >= config.limit) {
        const windowEnd = new Date(
          row.window_start.getTime() + config.windowMs,
        );
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

    const { requestCount, windowStart: actualWindowStart } =
      await this.db.incrementAndGet(platform, scopeKey, windowStart);

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
    config: RateLimitConfig,
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
      currentTokens = Math.min(
        burstSize,
        (row.tokens_remaining ?? burstSize) + tokensToAdd,
      );
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
      resetsAt: new Date(now.getTime() + 1000 / refillRate),
      retryAfterMs: null,
    };
  }

  parseResponseHeaders(
    platform: Platform,
    headers: Record<string, string>,
  ): Partial<RateLimitState> | null {
    const limit =
      headers["x-ratelimit-limit"] ?? headers["x-rate-limit-limit"];
    const remaining =
      headers["x-ratelimit-remaining"] ?? headers["x-rate-limit-remaining"];
    const reset =
      headers["x-ratelimit-reset"] ?? headers["x-rate-limit-reset"];

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
      result.resetsAt =
        resetTimestamp > 1e12
          ? new Date(resetTimestamp)
          : new Date(resetTimestamp * 1000);
    }

    return result;
  }

  async syncFromHeaders(
    platform: Platform,
    scopeKey: string,
    headers: Record<string, string>,
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
      request_count:
        parsed.limit && parsed.remaining != null
          ? parsed.limit - parsed.remaining
          : undefined,
    });
  }
}
