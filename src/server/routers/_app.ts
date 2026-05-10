import { router } from "../trpc";
import { brandRouter } from "./brand";
import { briefRouter } from "./brief";
import { corpusRouter } from "./corpus";
import { rulesRouter } from "./rules";
import { connectorsRouter } from "./connectors";
import { ideasRouter } from "./ideas";
import { draftsRouter } from "./drafts";
import { scheduleRouter } from "./schedule";
import { auditRouter } from "./audit";
import { onboardingRouter } from "./onboarding";

export const appRouter = router({
  brand: brandRouter,
  brief: briefRouter,
  corpus: corpusRouter,
  rules: rulesRouter,
  connectors: connectorsRouter,
  ideas: ideasRouter,
  drafts: draftsRouter,
  schedule: scheduleRouter,
  audit: auditRouter,
  onboarding: onboardingRouter,
});

export type AppRouter = typeof appRouter;
