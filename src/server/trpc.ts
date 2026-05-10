import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { Context } from "./context";
import { AppError } from "@/lib/errors/app-error";

const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    const cause = error.cause;
    return {
      ...shape,
      data: {
        ...shape.data,
        appError:
          cause instanceof AppError
            ? {
                code: cause.code,
                errorClass: cause.errorClass,
                retryable: cause.retryable,
                platform: cause.platform,
                httpStatus: cause.httpStatus,
              }
            : null,
      },
    };
  },
});

export const router = t.router;
export const publicProcedure = t.procedure;
export const createCallerFactory = t.createCallerFactory;
