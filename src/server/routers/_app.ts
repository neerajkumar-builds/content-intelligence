import { router } from "../trpc";
import { brandRouter } from "./brand";
import { rulesRouter } from "./rules";
import { connectorsRouter } from "./connectors";
import { ideasRouter } from "./ideas";
import { draftsRouter } from "./drafts";
import { scheduleRouter } from "./schedule";
import { auditRouter } from "./audit";

export const appRouter = router({
  brand: brandRouter,
  rules: rulesRouter,
  connectors: connectorsRouter,
  ideas: ideasRouter,
  drafts: draftsRouter,
  schedule: scheduleRouter,
  audit: auditRouter,
});

export type AppRouter = typeof appRouter;
