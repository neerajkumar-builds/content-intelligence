import { db } from "@/db";
import { auditLog } from "@/db/schema";
import { createTraceId } from "@/lib/logging";

export interface AuditEntry {
  workspaceId: string;
  actor: string;
  action: string;
  subjectType: string;
  subjectId: string;
  diff?: string;
  traceId?: string;
  errorCode?: string;
  metadata?: Record<string, unknown>;
}

export async function writeAuditLog(entry: AuditEntry): Promise<void> {
  await db.insert(auditLog).values({
    workspaceId: entry.workspaceId,
    actor: entry.actor,
    action: entry.action,
    subjectType: entry.subjectType,
    subjectId: entry.subjectId,
    diff: entry.diff ?? null,
    traceId: entry.traceId ?? createTraceId(),
    errorCode: entry.errorCode ?? null,
    metadata: entry.metadata ?? null,
  });
}

export async function writeAuditBatch(
  entries: AuditEntry[],
): Promise<void> {
  if (entries.length === 0) return;

  const sharedTraceId = entries[0].traceId ?? createTraceId();

  await db.insert(auditLog).values(
    entries.map((entry) => ({
      workspaceId: entry.workspaceId,
      actor: entry.actor,
      action: entry.action,
      subjectType: entry.subjectType,
      subjectId: entry.subjectId,
      diff: entry.diff ?? null,
      traceId: entry.traceId ?? sharedTraceId,
      errorCode: entry.errorCode ?? null,
      metadata: entry.metadata ?? null,
    })),
  );
}
