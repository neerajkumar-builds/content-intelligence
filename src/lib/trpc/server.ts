import "server-only";
import { createTRPCContext } from "@/server/context";
import { appRouter } from "@/server/routers/_app";
import { createCallerFactory } from "@/server/trpc";

const createCaller = createCallerFactory(appRouter);

export async function trpcServer() {
  const ctx = await createTRPCContext({ headers: new Headers() });
  return createCaller(ctx);
}
