import { db } from "@/db";
import { aiCalls } from "@/db/schema";
import { createTraceId } from "@/lib/logging";

const GEMINI_MODEL = "gemini-embedding-001";
const GEMINI_PROVIDER = "google";
const BATCH_LIMIT = 100;
const EMBEDDING_DIMS = 3072;

interface EmbedOptions {
  workspaceId: string;
  brandId?: string;
  traceId?: string;
}

interface GeminiEmbedRequest {
  requests: Array<{
    model: string;
    content: { parts: Array<{ text: string }> };
  }>;
}

interface GeminiEmbedResponse {
  embeddings: Array<{ values: number[] }>;
}

export async function embedTexts(
  texts: string[],
  opts: EmbedOptions,
): Promise<number[][]> {
  if (texts.length === 0) return [];

  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) throw new Error("GOOGLE_AI_API_KEY not set");

  const traceId = opts.traceId ?? createTraceId();
  const results: number[][] = [];

  for (let i = 0; i < texts.length; i += BATCH_LIMIT) {
    const batch = texts.slice(i, i + BATCH_LIMIT);
    const batchResult = await embedBatch(batch, apiKey, {
      ...opts,
      traceId,
    });
    results.push(...batchResult);
  }

  return results;
}

async function embedBatch(
  texts: string[],
  apiKey: string,
  opts: EmbedOptions & { traceId: string },
): Promise<number[][]> {
  const body: GeminiEmbedRequest = {
    requests: texts.map((text) => ({
      model: `models/${GEMINI_MODEL}`,
      content: { parts: [{ text }] },
    })),
  };

  const start = performance.now();
  let status: "success" | "error" | "timeout" = "success";
  let errorCode: string | null = null;

  try {
    const res = await fetchWithRetry(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:batchEmbedContents?key=${apiKey}`,
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
        `Gemini embed failed (${res.status}): ${errText.slice(0, 200)}`,
      );
    }

    const data: GeminiEmbedResponse = await res.json();

    if (!data.embeddings || data.embeddings.length !== texts.length) {
      throw new Error(
        `Expected ${texts.length} embeddings, got ${data.embeddings?.length ?? 0}`,
      );
    }

    for (let i = 0; i < data.embeddings.length; i++) {
      if (data.embeddings[i].values.length !== EMBEDDING_DIMS) {
        throw new Error(
          `Embedding ${i} has ${data.embeddings[i].values.length} dims, expected ${EMBEDDING_DIMS}`,
        );
      }
    }

    return data.embeddings.map((e) => e.values);
  } catch (err) {
    if (status === "success") {
      status = "error";
      errorCode = errorCode ?? "NETWORK_ERROR";
    }
    throw err;
  } finally {
    const latencyMs = Math.round(performance.now() - start);
    const totalChars = texts.reduce((sum, t) => sum + t.length, 0);
    const estimatedTokens = Math.ceil(totalChars / 4);

    await db
      .insert(aiCalls)
      .values({
        workspaceId: opts.workspaceId,
        brandId: opts.brandId ?? null,
        draftId: null,
        taskType: "embedding",
        model: GEMINI_MODEL,
        provider: GEMINI_PROVIDER,
        promptHash: "",
        promptTokens: estimatedTokens,
        completionTokens: 0,
        totalTokens: estimatedTokens,
        costCents: 0,
        latencyMs,
        status,
        errorCode,
        traceId: opts.traceId,
      })
      .catch(() => {});
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
