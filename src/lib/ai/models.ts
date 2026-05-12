export interface ModelConfig {
  id: string;
  label: string;
  provider: "google" | "anthropic" | "openrouter";
  tier: "fast" | "balanced" | "best" | "thinking";
  description: string;
  costPer1kInput: number;
  costPer1kOutput: number;
  envKey: string;
  maxOutputTokens: number;
}

export const AVAILABLE_MODELS: ModelConfig[] = [
  {
    id: "gemini-2.0-flash",
    label: "Gemini 3.0 Flash",
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
    id: "openai/gpt-4.1",
    label: "GPT-4.1",
    provider: "openrouter",
    tier: "balanced",
    description: "OpenAI via OpenRouter",
    costPer1kInput: 0.2,
    costPer1kOutput: 0.8,
    envKey: "OPENROUTER_API_KEY",
    maxOutputTokens: 4096,
  },
  {
    id: "google/gemini-2.5-flash-preview-05-20",
    label: "Gemini 2.5 Flash",
    provider: "openrouter",
    tier: "thinking",
    description: "Latest Gemini via OpenRouter",
    costPer1kInput: 0.015,
    costPer1kOutput: 0.06,
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
