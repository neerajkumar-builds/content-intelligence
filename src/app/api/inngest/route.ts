import { serve } from "inngest/next";
import { inngest } from "@/server/inngest/client";
import { functions } from "@/server/inngest/functions";

const handler = serve({ client: inngest, functions });

export const { GET, POST, PUT } = handler;
