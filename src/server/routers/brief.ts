import { z } from "zod";
import { eq, desc, and } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { protectedProcedure } from "../middleware";
import { router } from "../trpc";
import { brandBriefs, brands } from "@/db/schema";
import { callLLM } from "@/lib/ai/llm-router";

export const briefRouter = router({
  create: protectedProcedure
    .input(
      z.object({
        brandId: z.string().uuid(),
        wedge: z.string().min(1),
        icp: z.string().min(1),
        voiceTraits: z.string().min(1),
        antiPositioning: z.string().min(1),
        changelog: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { db, scopeAnd } = ctx.scoped;

      const [brand] = await db
        .select({ id: brands.id })
        .from(brands)
        .where(scopeAnd(brands.workspaceId, eq(brands.id, input.brandId)))
        .limit(1);
      if (!brand) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Brand not found",
        });
      }

      const [latest] = await db
        .select({ version: brandBriefs.version })
        .from(brandBriefs)
        .where(eq(brandBriefs.brandId, input.brandId))
        .orderBy(desc(brandBriefs.version))
        .limit(1);
      const nextVersion = (latest?.version ?? 0) + 1;

      const [brief] = await db
        .insert(brandBriefs)
        .values({
          brandId: input.brandId,
          version: nextVersion,
          wedge: input.wedge,
          icp: input.icp,
          voiceTraits: input.voiceTraits,
          antiPositioning: input.antiPositioning,
          editorClerkId: ctx.userId,
          changelog: input.changelog,
        })
        .returning();
      return brief;
    }),

  get: protectedProcedure
    .input(
      z.object({
        brandId: z.string().uuid(),
        version: z.number().int().positive().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { db, scopeAnd } = ctx.scoped;

      const [brand] = await db
        .select({ id: brands.id })
        .from(brands)
        .where(scopeAnd(brands.workspaceId, eq(brands.id, input.brandId)))
        .limit(1);
      if (!brand) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Brand not found",
        });
      }

      const condition = input.version
        ? and(
            eq(brandBriefs.brandId, input.brandId),
            eq(brandBriefs.version, input.version),
          )
        : eq(brandBriefs.brandId, input.brandId);

      const [brief] = await db
        .select()
        .from(brandBriefs)
        .where(condition)
        .orderBy(desc(brandBriefs.version))
        .limit(1);
      return brief ?? null;
    }),

  list: protectedProcedure
    .input(
      z.object({
        brandId: z.string().uuid(),
        limit: z.number().int().min(1).max(50).default(20),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { db, scopeAnd } = ctx.scoped;

      const [brand] = await db
        .select({ id: brands.id })
        .from(brands)
        .where(scopeAnd(brands.workspaceId, eq(brands.id, input.brandId)))
        .limit(1);
      if (!brand) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Brand not found",
        });
      }

      return db
        .select()
        .from(brandBriefs)
        .where(eq(brandBriefs.brandId, input.brandId))
        .orderBy(desc(brandBriefs.version))
        .limit(input.limit);
    }),

  diff: protectedProcedure
    .input(
      z.object({
        brandId: z.string().uuid(),
        versionA: z.number().int().positive(),
        versionB: z.number().int().positive(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { db, scopeAnd } = ctx.scoped;

      const [brand] = await db
        .select({ id: brands.id })
        .from(brands)
        .where(scopeAnd(brands.workspaceId, eq(brands.id, input.brandId)))
        .limit(1);
      if (!brand) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Brand not found",
        });
      }

      const briefs = await db
        .select()
        .from(brandBriefs)
        .where(eq(brandBriefs.brandId, input.brandId));

      const a = briefs.find((b) => b.version === input.versionA);
      const b = briefs.find((br) => br.version === input.versionB);
      if (!a || !b) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "One or both brief versions not found",
        });
      }

      return { a, b };
    }),

  autoGenerate: protectedProcedure
    .input(
      z.object({
        brandId: z.string().uuid(),
        websiteUrl: z.string().url(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { db, scopeAnd, workspaceId } = ctx.scoped;

      const [brand] = await db
        .select({ id: brands.id, name: brands.name })
        .from(brands)
        .where(scopeAnd(brands.workspaceId, eq(brands.id, input.brandId)))
        .limit(1);
      if (!brand) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Brand not found" });
      }

      let htmlText: string;
      try {
        const res = await fetch(input.websiteUrl, {
          headers: {
            "User-Agent":
              "ContentIntelligence/1.0 (Brand analysis; +https://content-intelligence-eight.vercel.app)",
            Accept: "text/html",
          },
          signal: AbortSignal.timeout(8_000),
          redirect: "follow",
        });
        if (!res.ok) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Website returned HTTP ${res.status}`,
          });
        }
        htmlText = await res.text();
      } catch (err) {
        if (err instanceof TRPCError) throw err;
        const msg = err instanceof Error ? err.message : "Unknown error";
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: msg.includes("abort")
            ? "Website did not respond within 8 seconds"
            : `Could not fetch website: ${msg}`,
        });
      }

      const plainText = htmlText
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
        .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, "")
        .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, "")
        .replace(/<[^>]+>/g, " ")
        .replace(/&[a-zA-Z0-9#]+;/gi, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 5000);

      if (plainText.length < 50) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "Could not extract meaningful text from this website. The page may require JavaScript rendering.",
        });
      }

      const systemPrompt = `You are a brand strategist. Analyze this company's website content and extract:
1. WEDGE: Their unique value proposition (2-3 sentences, what makes them different)
2. ICP: Ideal customer profile (role, company size, industry, pain points)
3. VOICE_TRAITS: Brand voice characteristics (comma-separated, e.g., "authoritative, data-driven, conversational")
4. ANTI_POSITIONING: What they explicitly are NOT (1-2 sentences)

Respond ONLY with valid JSON: {"wedge":"...","icp":"...","voiceTraits":"...","antiPositioning":"..."}`;

      const userPrompt = `Company: ${brand.name}\nWebsite URL: ${input.websiteUrl}\n\nWebsite content:\n${plainText}`;

      const result = await callLLM({
        systemPrompt,
        userPrompt,
        temperature: 0.4,
        maxTokens: 1024,
        workspaceId,
        brandId: input.brandId,
        traceId: ctx.traceId ?? crypto.randomUUID(),
      });

      let parsed: {
        wedge: string;
        icp: string;
        voiceTraits: string;
        antiPositioning: string;
      };
      try {
        let jsonText = result.text.trim();
        if (jsonText.startsWith("```")) {
          jsonText = jsonText
            .replace(/^```(?:json)?\n?/, "")
            .replace(/\n?```$/, "");
        }
        parsed = JSON.parse(jsonText);
      } catch {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "AI returned malformed response — please try again",
        });
      }

      if (
        !parsed.wedge ||
        !parsed.icp ||
        !parsed.voiceTraits ||
        !parsed.antiPositioning
      ) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "AI response missing required fields — please try again",
        });
      }

      return {
        wedge: parsed.wedge,
        icp: parsed.icp,
        voiceTraits: parsed.voiceTraits,
        antiPositioning: parsed.antiPositioning,
        model: result.model,
        tokens: result.totalTokens,
        costCents: result.costCents,
      };
    }),
});
