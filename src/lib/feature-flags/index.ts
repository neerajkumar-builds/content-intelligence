import { eq, and, or, isNull } from "drizzle-orm";
import { db } from "@/db";
import { featureFlags } from "@/db/schema";

export async function isFeatureEnabled(
  key: string,
  context?: { workspaceId?: string; brandId?: string },
): Promise<boolean> {
  const conditions = [eq(featureFlags.key, key)];

  const scopeConditions = [eq(featureFlags.scope, "global")];

  if (context?.workspaceId) {
    scopeConditions.push(
      and(
        eq(featureFlags.scope, "workspace"),
        eq(featureFlags.scopeId, context.workspaceId),
      )!,
    );
  }

  if (context?.brandId) {
    scopeConditions.push(
      and(
        eq(featureFlags.scope, "brand"),
        eq(featureFlags.scopeId, context.brandId),
      )!,
    );
  }

  const flags = await db
    .select()
    .from(featureFlags)
    .where(and(...conditions, or(...scopeConditions)));

  if (flags.length === 0) return false;

  const scopePriority: Record<string, number> = {
    brand: 3,
    workspace: 2,
    global: 1,
  };

  const sorted = flags.sort(
    (a, b) =>
      (scopePriority[b.scope] ?? 0) - (scopePriority[a.scope] ?? 0),
  );

  return sorted[0].enabled;
}

export async function getFeatureMetadata(
  key: string,
  context?: { workspaceId?: string; brandId?: string },
): Promise<Record<string, unknown> | null> {
  const conditions = [eq(featureFlags.key, key)];

  const scopeConditions = [eq(featureFlags.scope, "global")];

  if (context?.workspaceId) {
    scopeConditions.push(
      and(
        eq(featureFlags.scope, "workspace"),
        eq(featureFlags.scopeId, context.workspaceId),
      )!,
    );
  }

  const flags = await db
    .select()
    .from(featureFlags)
    .where(and(...conditions, or(...scopeConditions)));

  if (flags.length === 0) return null;

  const scopePriority: Record<string, number> = {
    brand: 3,
    workspace: 2,
    global: 1,
  };

  const sorted = flags.sort(
    (a, b) =>
      (scopePriority[b.scope] ?? 0) - (scopePriority[a.scope] ?? 0),
  );

  return sorted[0].metadata;
}
