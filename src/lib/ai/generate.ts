import { db } from "@/db";
import { aiCalls } from "@/db/schema";
import { createTraceId } from "@/lib/logging";

const GEMINI_MODEL = "gemini-2.0-flash";
const GEMINI_PROVIDER = "google";

// Gemini 2.0 Flash pricing (per 1M tokens)
const INPUT_COST_PER_1M = 7.5; // $0.075 → 7.5 cents
const OUTPUT_COST_PER_1M = 30; // $0.30 → 30 cents

export interface GenerateOptions {
  systemPrompt: string;
  userPrompt: string;
  workspaceId: string;
  brandId?: string;
  draftId?: string;
  traceId?: string;
}

export interface GenerateResult {
  text: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  latencyMs: number;
}

interface GeminiGenerateRequest {
  system_instruction: { parts: Array<{ text: string }> };
  contents: Array<{ parts: Array<{ text: string }> }>;
  generationConfig: { temperature: number; maxOutputTokens: number };
}

interface GeminiGenerateResponse {
  candidates?: Array<{
    content: { parts: Array<{ text: string }> };
  }>;
  usageMetadata?: {
    promptTokenCount: number;
    candidatesTokenCount: number;
    totalTokenCount: number;
  };
}

function computeCostCents(promptTokens: number, completionTokens: number): number {
  const inputCost = (promptTokens / 1_000_000) * INPUT_COST_PER_1M;
  const outputCost = (completionTokens / 1_000_000) * OUTPUT_COST_PER_1M;
  // Round to nearest cent
  return Math.round(inputCost + outputCost);
}

export async function generateText(opts: GenerateOptions): Promise<GenerateResult> {
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) throw new Error("GOOGLE_AI_API_KEY not set");

  const traceId = opts.traceId ?? createTraceId();

  const body: GeminiGenerateRequest = {
    system_instruction: { parts: [{ text: opts.systemPrompt }] },
    contents: [{ parts: [{ text: opts.userPrompt }] }],
    generationConfig: { temperature: 0.8, maxOutputTokens: 2048 },
  };

  const start = performance.now();
  let status: "success" | "error" | "timeout" = "success";
  let errorCode: string | null = null;
  let promptTokens = 0;
  let completionTokens = 0;
  let totalTokens = 0;

  try {
    const res = await fetchWithRetry(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
    );

    if (!res.ok) {
      const errText = await res.text().catch(() => "unknown");
      status = "error";
      errorCode = `HTTP_${res.status}`;
      throw new Error(
        `Gemini generate failed (${res.status}): ${errText.slice(0, 200)}`,
      );
    }

    const data: GeminiGenerateResponse = await res.json();

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      status = "error";
      errorCode = "EMPTY_RESPONSE";
      throw new Error("Gemini returned no text content");
    }

    promptTokens = data.usageMetadata?.promptTokenCount ?? 0;
    completionTokens = data.usageMetadata?.candidatesTokenCount ?? 0;
    totalTokens = data.usageMetadata?.totalTokenCount ?? 0;

    const latencyMs = Math.round(performance.now() - start);

    return { text, promptTokens, completionTokens, totalTokens, latencyMs };
  } catch (err) {
    if (status === "success") {
      status = "error";
      errorCode = errorCode ?? "NETWORK_ERROR";
    }
    throw err;
  } finally {
    const latencyMs = Math.round(performance.now() - start);

    // Glass-box: log every AI call
    await db
      .insert(aiCalls)
      .values({
        workspaceId: opts.workspaceId,
        brandId: opts.brandId ?? null,
        draftId: opts.draftId ?? null,
        taskType: "body",
        model: GEMINI_MODEL,
        provider: GEMINI_PROVIDER,
        promptHash: "",
        promptTokens,
        completionTokens,
        totalTokens,
        costCents: computeCostCents(promptTokens, completionTokens),
        latencyMs,
        status,
        errorCode,
        traceId,
      })
      .catch(() => {
        // Swallow logging errors — never fail a generation because of audit
      });
  }
}

async function fetchWithRetry(
  url: string,
  init: RequestInit,
  maxRetries = 3,
): Promise<Response> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const res = await fetch(url, init);
    if (res.ok || res.status < 500) return res;
    if (attempt < maxRetries) {
      const delay = Math.min(1000 * 2 ** attempt, 8000);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  return fetch(url, init);
}
