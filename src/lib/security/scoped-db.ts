import { eq, and, type SQL, type Column } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { db } from "@/db";

export function workspaceScope(
  workspaceIdColumn: Column,
  workspaceId: string,
) {
  return eq(workspaceIdColumn, workspaceId);
}

export function workspaceScopeAnd(
  workspaceIdColumn: Column,
  workspaceId: string,
  ...conditions: (SQL | undefined)[]
) {
  return and(eq(workspaceIdColumn, workspaceId), ...conditions);
}

export function scopedDb(workspaceId: string) {
  if (!workspaceId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "workspaceId is required for scoped database access",
    });
  }

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

export type ScopedDb = ReturnType<typeof scopedDb>;
