import { z } from "zod";
import { eq, and, desc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { protectedProcedure } from "../middleware";
import { router } from "../trpc";
import { prompts } from "@/db/schema";
import { getOrSeedPrompt } from "@/lib/prompts/seed";

const variableSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  required: z.boolean().optional(),
});

export const promptsRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const { db, workspaceId } = ctx.scoped;

    await getOrSeedPrompt(workspaceId, "draft-generation");

    return db
      .select()
      .from(prompts)
      .where(
        and(
          eq(prompts.workspaceId, workspaceId),
          eq(prompts.isActive, true),
        ),
      )
      .orderBy(desc(prompts.updatedAt));
  }),

  get: protectedProcedure
    .input(z.object({ promptId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { db, workspaceId } = ctx.scoped;

      const [prompt] = await db
        .select()
        .from(prompts)
        .where(
          and(
            eq(prompts.id, input.promptId),
            eq(prompts.workspaceId, workspaceId),
          ),
        )
        .limit(1);

      if (!prompt) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Prompt not found" });
      }
      return prompt;
    }),

  update: protectedProcedure
    .input(
      z.object({
        promptId: z.string().uuid(),
        systemPrompt: z.string().min(1),
        userPromptTemplate: z.string().min(1),
        variables: z.array(variableSchema).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { db, workspaceId } = ctx.scoped;

      const [existing] = await db
        .select({ id: prompts.id, version: prompts.version, variables: prompts.variables })
        .from(prompts)
        .where(
          and(
            eq(prompts.id, input.promptId),
            eq(prompts.workspaceId, workspaceId),
          ),
        )
        .limit(1);

      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Prompt not found" });
      }

      const currentVars = (existing.variables ?? []) as Array<{
        name: string;
        description?: string;
        required?: boolean;
      }>;

      const updatedVars = input.variables
        ? [
            { name: "user_prompt_template", description: input.userPromptTemplate },
            ...input.variables.filter((v) => v.name !== "user_prompt_template"),
          ]
        : currentVars.map((v) =>
            v.name === "user_prompt_template"
              ? { ...v, description: input.userPromptTemplate }
              : v,
          );

      const [updated] = await db
        .update(prompts)
        .set({
          systemPrompt: input.systemPrompt,
          variables: updatedVars,
          version: existing.version + 1,
        })
        .where(
          and(
            eq(prompts.id, input.promptId),
            eq(prompts.workspaceId, workspaceId),
          ),
        )
        .returning();

      return updated;
    }),
});
