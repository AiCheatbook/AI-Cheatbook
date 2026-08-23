import type {
  AITool,
  GeneratorKeyword,
} from "./types";

import { buildPrompt } from "./promptBuilder";

import {
  getDefaultModel,
} from "./modelSelector";

import type {
  UserPlan,
} from "./modelConfig";

export type AIProviderName =
  | "local"
  | "gemini"
  | "openai"
  | "claude"
  | "advanced";

export type AIProviderRequest = {
  task: string;
  keywords: GeneratorKeyword[];
  aiTool: AITool;
  plan: UserPlan;
};

export type AIProviderResponse = {
  prompt: string;
  provider: AIProviderName;
  model: string;
};

export interface AIProvider {
  name: AIProviderName;

  generate(
    request: AIProviderRequest
  ): Promise<AIProviderResponse>;
}

/*
 * Local development provider.
 *
 * No API key required.
 *
 * This provider builds the prompt locally.
 * It allows the complete Generator workflow
 * to work before connecting a real AI API.
 */

export const localProvider: AIProvider = {
  name: "local",

  async generate({
    task,
    keywords,
    aiTool,
    plan,
  }: AIProviderRequest) {
    const model =
      getDefaultModel(plan);

    const prompt = buildPrompt({
      task,
      keywords,
      aiTool,
    });

    return {
      prompt,
      provider: "local",
      model: model.id,
    };
  },
};

/*
 * Provider selection layer.
 *
 * Currently both Free and Paid users use
 * the local development provider.
 *
 * Later this can be changed to:
 *
 * Free  → Gemini/OpenAI/etc.
 * Paid  → Advanced AI provider
 */

export function getAIProvider(
  plan: UserPlan
): AIProvider {
  if (plan === "paid") {
    /*
     * Future:
     *
     * return advancedProvider;
     */

    return localProvider;
  }

  return localProvider;
}