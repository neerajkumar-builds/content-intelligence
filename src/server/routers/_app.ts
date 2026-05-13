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
import { signalsRouter } from "./signals";
import { promptsRouter } from "./prompts";
import { integrationsRouter } from "./integrations";
import { profilesRouter } from "./profiles";

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
  signals: signalsRouter,
  prompts: promptsRouter,
  integrations: integrationsRouter,
  profiles: profilesRouter,
});

export type AppRouter = typeof appRouter;
