import type {
  AITool,
  GeneratorKeyword,
} from "./types";

import { buildPrompt } from "./promptBuilder";

import {
  getModelById,
} from "./modelSelector";

import type {
  UserPlan,
} from "./modelConfig";

import { geminiProvider } from "./geminiProvider";

export type AIProviderName =
  | "local"
  | "gemini"
  | "openai"
  | "claude"
  | "advanced";

export type ReferenceImageMode =
  | "none"
  | "upload"
  | "one-later"
  | "multiple-later";

export type AttachmentRole =
  | "character"
  | "face"
  | "clothing"
  | "pose"
  | "environment"
  | "product"
  | "composition"
  | "style"
  | "lighting"
  | "other";

export type ReferenceAttachment = {
  base64: string;
  mimeType: string;
  role: AttachmentRole;
};

export type PromptStructureSpec = {
  name: string;
  fields: string[];
};

export type AIProviderRequest = {
  task: string;
  keywords: GeneratorKeyword[];
  aiTool: AITool;
  plan: UserPlan;
  modelId?: string;

  /*
   * Richer, semantic fields used by the
   * real AI path. inlineKeywords are
   * things like camera/shot instructions
   * that describe HOW the subject/action
   * is captured; globalKeywords are
   * overall style/mood qualities (Common
   * Properties). Both are optional and
   * fall back gracefully if not provided.
   */

  inlineKeywords?: string[];
  globalKeywords?: string[];
  attachments?: ReferenceAttachment[];

  /*
   * Prompt Structure is a REWRITE pass —
   * the base prompt is generated first,
   * then reorganized into these fields.
   * Only ever applied when isLoggedIn is
   * true (server-enforced, not trusted
   * from the request alone).
   */

  structure?: PromptStructureSpec | null;
  isLoggedIn?: boolean;

  referenceImageMode?: ReferenceImageMode;
  referenceImageBase64?: string;
  referenceImageMimeType?: string;
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
    modelId,
  }: AIProviderRequest) {
    const model =
      getModelById(modelId, plan);

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
 * Free  → Gemini (Google's free tier)
 * Paid  → Gemini for now too, until a
 *         dedicated "advanced" provider
 *         is added later.
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

    return geminiProvider;
  }

  return geminiProvider;
}