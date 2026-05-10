import type { Platform } from "@/lib/platforms";
import { AppError, ErrorCodes } from "./app-error";

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

const DEFAULT_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 5,
  recoveryTimeMs: 30_000,
  halfOpenMaxAttempts: 3,
  monitorWindowMs: 60_000,
};

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

export interface CircuitBreakerDb {
  getState(
    platform: Platform,
    workspaceId: string,
  ): Promise<CircuitBreakerRow | null>;
  upsertState(
    row: Partial<CircuitBreakerRow> & {
      platform: string;
      workspace_id: string;
    },
  ): Promise<void>;
}

export class CircuitBreaker {
  private readonly config: CircuitBreakerConfig;
  private readonly db: CircuitBreakerDb;

  constructor(db: CircuitBreakerDb, config?: Partial<CircuitBreakerConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.db = db;
  }

  async canExecute(
    platform: Platform,
    workspaceId: string,
  ): Promise<{
    allowed: boolean;
    state: CircuitState;
    retryAfterMs: number | null;
  }> {
    const row = await this.db.getState(platform, workspaceId);

    if (!row) {
      return { allowed: true, state: "closed", retryAfterMs: null };
    }

    const state = row.state as CircuitState;

    if (state === "closed") {
      return { allowed: true, state: "closed", retryAfterMs: null };
    }

    if (state === "open") {
      const now = new Date();
      if (row.next_retry_at && now >= row.next_retry_at) {
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

    if (row.half_open_attempts < this.config.halfOpenMaxAttempts) {
      return { allowed: true, state: "half_open", retryAfterMs: null };
    }

    return {
      allowed: false,
      state: "half_open",
      retryAfterMs: this.config.recoveryTimeMs,
    };
  }

  async recordSuccess(
    platform: Platform,
    workspaceId: string,
  ): Promise<void> {
    const row = await this.db.getState(platform, workspaceId);
    const state = (row?.state ?? "closed") as CircuitState;

    if (state === "half_open") {
      const consecutiveSuccesses = (row?.consecutive_successes ?? 0) + 1;
      if (consecutiveSuccesses >= this.config.halfOpenMaxAttempts) {
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
      await this.db.upsertState({
        platform,
        workspace_id: workspaceId,
        last_success_at: new Date(),
        failure_count: 0,
      });
    }
  }

  async recordFailure(
    platform: Platform,
    workspaceId: string,
  ): Promise<void> {
    const row = await this.db.getState(platform, workspaceId);
    const state = (row?.state ?? "closed") as CircuitState;
    const failureCount = (row?.failure_count ?? 0) + 1;
    const now = new Date();

    if (state === "half_open") {
      const backoffMultiplier = Math.min(
        Math.pow(2, failureCount - this.config.failureThreshold),
        32,
      );
      const nextRetryAt = new Date(
        now.getTime() + this.config.recoveryTimeMs * backoffMultiplier,
      );

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
      const nextRetryAt = new Date(
        now.getTime() + this.config.recoveryTimeMs,
      );
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
      await this.db.upsertState({
        platform,
        workspace_id: workspaceId,
        state: "closed",
        failure_count: failureCount,
        last_failure_at: now,
      });
    }
  }

  async getState(
    platform: Platform,
    workspaceId: string,
  ): Promise<CircuitBreakerState> {
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

  async execute<T>(
    platform: Platform,
    workspaceId: string,
    operation: () => Promise<T>,
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
      if (error instanceof AppError && error.errorClass === "permanent") {
        throw error;
      }
      await this.recordFailure(platform, workspaceId);
      throw error;
    }
  }
}
