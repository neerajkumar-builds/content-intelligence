import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { scopedDb, type ScopedDb } from "@/lib/security/scoped-db";
import { createTraceId } from "@/lib/logging";

export interface Context {
  userId: string | null;
  workspaceId: string | null;
  scoped: ScopedDb | null;
  db: typeof db;
  traceId: string;
}

export async function createTRPCContext(opts: {
  headers: Headers;
}): Promise<Context> {
  const { userId, orgId } = await auth();
  const traceId = createTraceId();

  return {
    userId,
    workspaceId: orgId ?? null,
    scoped: orgId ? scopedDb(orgId) : null,
    db,
    traceId,
  };
}
