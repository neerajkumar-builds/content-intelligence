import { db } from "@/db";
import { aiCalls } from "@/db/schema";
import {
  getModelConfig,
  estimateCostCents,
  DEFAULT_MODEL_ID,
  type ModelConfig,
} from "./models";

export interface LLMCallOptions {
  modelId?: string;
  systemPrompt: string;
  userPrompt: string;
  temperature?: number;
  maxTokens?: number;
  workspaceId: string;
  brandId?: string;
  draftId?: string;
  traceId: string;
}

export interface LLMResult {
  text: string;
  model: string;
  provider: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  costCents: number;
  latencyMs: number;
}

export async function callLLM(opts: LLMCallOptions): Promise<LLMResult> {
  const modelId = opts.modelId ?? DEFAULT_MODEL_ID;
  const config = getModelConfig(modelId) ?? getModelConfig(DEFAULT_MODEL_ID)!;
  if (!config) {
    throw new Error(`Unknown model: ${modelId}`);
  }

  const apiKey = process.env[config.envKey];
  if (!apiKey) {
    throw new Error(
      `API key ${config.envKey} not configured for model ${modelId}`,
    );
  }

  const startMs = Date.now();

  let result: LLMResult;
  try {
    switch (config.provider) {
      case "google":
        result = await callGoogleAI(config, apiKey, opts, startMs);
        break;
      case "anthropic":
        result = await callAnthropic(config, apiKey, opts, startMs);
        break;
      case "openrouter":
        result = await callOpenRouter(config, apiKey, opts, startMs);
        break;
      default:
        throw new Error(`Unsupported provider: ${config.provider}`);
    }
  } catch (err) {
    const latencyMs = Date.now() - startMs;
    await logCall(opts, config, {
      status: "error",
      latencyMs,
      promptTokens: 0,
      completionTokens: 0,
      errorCode:
        err instanceof Error ? err.message.slice(0, 100) : "unknown",
    });
    throw err;
  }

  await logCall(opts, config, {
    status: "success",
    latencyMs: result.latencyMs,
    promptTokens: result.promptTokens,
    completionTokens: result.completionTokens,
  });

  return result;
}

async function callGoogleAI(
  config: ModelConfig,
  apiKey: string,
  opts: LLMCallOptions,
  startMs: number,
): Promise<LLMResult> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${config.id}:generateContent`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: opts.systemPrompt }] },
      contents: [{ parts: [{ text: opts.userPrompt }] }],
      generationConfig: {
        temperature: opts.temperature ?? 0.8,
        maxOutputTokens: opts.maxTokens ?? config.maxOutputTokens,
      },
    }),
    signal: AbortSignal.timeout(60_000),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Google AI ${res.status}: ${errText.slice(0, 200)}`);
  }

  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  const usage = data.usageMetadata ?? {};
  const promptTokens = usage.promptTokenCount ?? 0;
  const completionTokens = usage.candidatesTokenCount ?? 0;
  const latencyMs = Date.now() - startMs;

  return {
    text,
    model: config.id,
    provider: "google",
    promptTokens,
    completionTokens,
    totalTokens: promptTokens + completionTokens,
    costCents: estimateCostCents(config, promptTokens, completionTokens),
    latencyMs,
  };
}

async function callAnthropic(
  config: ModelConfig,
  apiKey: string,
  opts: LLMCallOptions,
  startMs: number,
): Promise<LLMResult> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: config.id,
      max_tokens: opts.maxTokens ?? config.maxOutputTokens,
      system: opts.systemPrompt,
      messages: [{ role: "user", content: opts.userPrompt }],
      temperature: opts.temperature ?? 0.8,
    }),
    signal: AbortSignal.timeout(120_000),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Anthropic ${res.status}: ${errText.slice(0, 200)}`);
  }

  const data = await res.json();
  const text =
    data.content?.[0]?.type === "text" ? data.content[0].text : "";
  const promptTokens = data.usage?.input_tokens ?? 0;
  const completionTokens = data.usage?.output_tokens ?? 0;
  const latencyMs = Date.now() - startMs;

  return {
    text,
    model: config.id,
    provider: "anthropic",
    promptTokens,
    completionTokens,
    totalTokens: promptTokens + completionTokens,
    costCents: estimateCostCents(config, promptTokens, completionTokens),
    latencyMs,
  };
}

async function callOpenRouter(
  config: ModelConfig,
  apiKey: string,
  opts: LLMCallOptions,
  startMs: number,
): Promise<LLMResult> {
  const res = await fetch(
    "https://openrouter.ai/api/v1/chat/completions",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer": "https://content-intelligence-eight.vercel.app",
        "X-Title": "Content Intelligence",
      },
      body: JSON.stringify({
        model: config.id,
        messages: [
          { role: "system", content: opts.systemPrompt },
          { role: "user", content: opts.userPrompt },
        ],
        temperature: opts.temperature ?? 0.8,
        max_tokens: opts.maxTokens ?? config.maxOutputTokens,
      }),
      signal: AbortSignal.timeout(120_000),
    },
  );

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`OpenRouter ${res.status}: ${errText.slice(0, 200)}`);
  }

  const data = await res.json();
  const text = data.choices?.[0]?.message?.content ?? "";
  const promptTokens = data.usage?.prompt_tokens ?? 0;
  const completionTokens = data.usage?.completion_tokens ?? 0;
  const latencyMs = Date.now() - startMs;

  return {
    text,
    model: config.id,
    provider: "openrouter",
    promptTokens,
    completionTokens,
    totalTokens: promptTokens + completionTokens,
    costCents: estimateCostCents(config, promptTokens, completionTokens),
    latencyMs,
  };
}

async function logCall(
  opts: LLMCallOptions,
  config: ModelConfig,
  result: {
    status: "success" | "error" | "timeout";
    latencyMs: number;
    promptTokens: number;
    completionTokens: number;
    errorCode?: string;
  },
): Promise<void> {
  const costCents = estimateCostCents(
    config,
    result.promptTokens,
    result.completionTokens,
  );

  await db
    .insert(aiCalls)
    .values({
      workspaceId: opts.workspaceId,
      brandId: opts.brandId ?? null,
      draftId: opts.draftId ?? null,
      taskType: "body",
      model: config.id,
      provider: config.provider,
      promptHash: "",
      promptTokens: result.promptTokens,
      completionTokens: result.completionTokens,
      totalTokens: result.promptTokens + result.completionTokens,
      costCents,
      latencyMs: result.latencyMs,
      status: result.status,
      errorCode: result.errorCode ?? null,
      traceId: opts.traceId,
    })
    .catch(() => {});
}
