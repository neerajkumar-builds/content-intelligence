import { TRPCError } from "@trpc/server";
import { publicProcedure } from "./trpc";
import { scopedDb } from "@/lib/security/scoped-db";
import { createLogger } from "@/lib/logging";

const authMiddleware = publicProcedure.use((opts) => {
  if (!opts.ctx.userId) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Not authenticated",
    });
  }

  return opts.next({
    ctx: {
      userId: opts.ctx.userId,
    },
  });
});

const workspaceScopeMiddleware = authMiddleware.use((opts) => {
  if (!opts.ctx.workspaceId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "No workspace selected",
    });
  }

  const scoped = scopedDb(opts.ctx.workspaceId);

  return opts.next({
    ctx: {
      workspaceId: opts.ctx.workspaceId,
      scoped,
    },
  });
});

const traceMiddleware = workspaceScopeMiddleware.use(async (opts) => {
  const logger = createLogger({
    traceId: opts.ctx.traceId,
    workspaceId: opts.ctx.workspaceId,
  });

  const start = performance.now();
  logger.debug(`tRPC ${opts.type} ${opts.path}`);

  const result = await opts.next({ ctx: { logger } });

  const durationMs = Math.round(performance.now() - start);
  logger.info(`tRPC ${opts.type} ${opts.path}`, { durationMs });

  return result;
});

export const protectedProcedure = traceMiddleware;
