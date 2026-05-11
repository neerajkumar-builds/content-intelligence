import { eq, and, type SQL, type Column } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { db } from "@/db";
import { workspaces } from "@/db/schema";

export async function scopedDb(clerkOrgId: string) {
  if (!clerkOrgId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "workspaceId is required for scoped database access",
    });
  }

  const [ws] = await db
    .select({ id: workspaces.id })
    .from(workspaces)
    .where(eq(workspaces.clerkOrgId, clerkOrgId))
    .limit(1);

  if (!ws) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Workspace not found for organization",
    });
  }

  const workspaceId = ws.id;

  return {
    db,
    workspaceId,

    scope(workspaceIdColumn: Column) {
      return eq(workspaceIdColumn, workspaceId);
    },

    scopeAnd(workspaceIdColumn: Column, ...conditions: (SQL | undefined)[]) {
      return and(eq(workspaceIdColumn, workspaceId), ...conditions);
    },
  };
}

export type ScopedDb = Awaited<ReturnType<typeof scopedDb>>;
