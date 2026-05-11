export interface ModelConfig {
  id: string;
  label: string;
  provider: "google" | "anthropic" | "openrouter";
  tier: "fast" | "balanced" | "best";
  description: string;
  costPer1kInput: number;
  costPer1kOutput: number;
  envKey: string;
  maxOutputTokens: number;
}

export const AVAILABLE_MODELS: ModelConfig[] = [
  {
    id: "gemini-2.0-flash",
    label: "Gemini Flash",
    provider: "google",
    tier: "fast",
    description: "Fast, cost-effective",
    costPer1kInput: 0.0075,
    costPer1kOutput: 0.03,
    envKey: "GOOGLE_AI_API_KEY",
    maxOutputTokens: 2048,
  },
  {
    id: "claude-sonnet-4-20250514",
    label: "Claude Sonnet 4",
    provider: "anthropic",
    tier: "balanced",
    description: "Great quality, good speed",
    costPer1kInput: 0.3,
    costPer1kOutput: 1.5,
    envKey: "ANTHROPIC_API_KEY",
    maxOutputTokens: 4096,
  },
  {
    id: "claude-opus-4-20250514",
    label: "Claude Opus 4",
    provider: "anthropic",
    tier: "best",
    description: "Highest quality output",
    costPer1kInput: 1.5,
    costPer1kOutput: 7.5,
    envKey: "ANTHROPIC_API_KEY",
    maxOutputTokens: 4096,
  },
  {
    id: "openai/gpt-5.4",
    label: "GPT-5.4",
    provider: "openrouter",
    tier: "balanced",
    description: "Latest OpenAI via OpenRouter",
    costPer1kInput: 0.25,
    costPer1kOutput: 1.0,
    envKey: "OPENROUTER_API_KEY",
    maxOutputTokens: 4096,
  },
  {
    id: "google/gemini-3.1-pro",
    label: "Gemini 3.1 Pro",
    provider: "openrouter",
    tier: "thinking",
    description: "Latest Gemini Pro via OpenRouter",
    costPer1kInput: 0.125,
    costPer1kOutput: 0.5,
    envKey: "OPENROUTER_API_KEY",
    maxOutputTokens: 8192,
  },
];

export const DEFAULT_MODEL_ID = "gemini-2.0-flash";

export function getModelConfig(modelId: string): ModelConfig | undefined {
  return AVAILABLE_MODELS.find((m) => m.id === modelId);
}

export function isModelAvailable(model: ModelConfig): boolean {
  return !!process.env[model.envKey];
}

export function getAvailableModels(): ModelConfig[] {
  return AVAILABLE_MODELS.filter((m) => isModelAvailable(m));
}

export function estimateCostCents(
  model: ModelConfig,
  inputTokens: number,
  outputTokens: number,
): number {
  const inputCost = (inputTokens / 1000) * model.costPer1kInput;
  const outputCost = (outputTokens / 1000) * model.costPer1kOutput;
  return Math.ceil((inputCost + outputCost) * 100);
}
