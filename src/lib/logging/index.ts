import { randomUUID } from "crypto";

export type LogLevel = "debug" | "info" | "warn" | "error";

interface LogEntry {
  level: LogLevel;
  message: string;
  traceId: string;
  timestamp: string;
  workspaceId?: string;
  platform?: string;
  durationMs?: number;
  error?: {
    code: string;
    message: string;
    stack?: string;
  };
  [key: string]: unknown;
}

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const MIN_LEVEL: LogLevel =
  (process.env.LOG_LEVEL as LogLevel) ?? "info";

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[MIN_LEVEL];
}

function emit(entry: LogEntry): void {
  if (!shouldLog(entry.level)) return;

  const output = JSON.stringify(entry);

  switch (entry.level) {
    case "error":
      console.error(output);
      break;
    case "warn":
      console.warn(output);
      break;
    default:
      console.log(output);
  }
}

export function createTraceId(): string {
  return `tr_${randomUUID().replace(/-/g, "").slice(0, 24)}`;
}

export function createLogger(defaults?: {
  traceId?: string;
  workspaceId?: string;
  platform?: string;
}) {
  const traceId = defaults?.traceId ?? createTraceId();

  function log(
    level: LogLevel,
    message: string,
    meta?: Record<string, unknown>,
  ): void {
    emit({
      level,
      message,
      traceId,
      timestamp: new Date().toISOString(),
      workspaceId: defaults?.workspaceId,
      platform: defaults?.platform,
      ...meta,
    });
  }

  return {
    traceId,
    debug: (msg: string, meta?: Record<string, unknown>) =>
      log("debug", msg, meta),
    info: (msg: string, meta?: Record<string, unknown>) =>
      log("info", msg, meta),
    warn: (msg: string, meta?: Record<string, unknown>) =>
      log("warn", msg, meta),
    error: (msg: string, error?: Error, meta?: Record<string, unknown>) =>
      log("error", msg, {
        ...meta,
        error: error
          ? {
              code: (error as any).code ?? "UNKNOWN",
              message: error.message,
              stack:
                process.env.NODE_ENV === "development"
                  ? error.stack
                  : undefined,
            }
          : undefined,
      }),
    child: (childDefaults: Record<string, unknown>) =>
      createLogger({
        traceId,
        workspaceId: defaults?.workspaceId,
        platform: defaults?.platform,
        ...childDefaults,
      } as any),
  };
}

export type Logger = ReturnType<typeof createLogger>;
