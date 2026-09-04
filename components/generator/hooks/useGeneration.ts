import { useState } from "react";
import type { AITool } from "../types";
import type { UserPlan } from "../modelConfig";
import type {
  ReferenceImageMode,
  ReferenceAttachment,
  PromptStructureSpec,
} from "../aiProvider";

export type GenerationStatus =
  | "idle"
  | "generating"
  | "success"
  | "error";

export type GenerateParams = {
  task: string;
  keywords?: string[];
  inlineKeywords?: string[];
  globalKeywords?: string[];
  attachments?: ReferenceAttachment[];
  structure?: PromptStructureSpec | null;
  aiTool: AITool;
  plan: UserPlan;
  mode?: "builtin" | "real-ai";
  modelId?: string;
  referenceImageMode?: ReferenceImageMode;
  referenceImageBase64?: string | null;
  referenceImageMimeType?: string | null;
};

export type GenerationResult = {
  prompt: string;
  provider: string;
  model: string;
};

/*
 * The one shared engine both the Main and
 * Mini generators call — this is what makes
 * "same underlying engine, different entry
 * points" actually true in code, not just in
 * intent. Neither generator talks to the API
 * directly; both go through this.
 */

export function useGeneration(options?: {
  onSuccess?: (
    result: GenerationResult
  ) => void;
}) {
  const [status, setStatus] =
    useState<GenerationStatus>("idle");
  const [result, setResult] =
    useState<GenerationResult | null>(
      null
    );
  const [error, setError] = useState<
    string | null
  >(null);
  const [lastParams, setLastParams] =
    useState<GenerateParams | null>(
      null
    );

  async function generate(
    params: GenerateParams
  ) {
    setStatus("generating");
    setError(null);
    setLastParams(params);

    try {
      const response = await fetch(
        "/api/generate",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            task: params.task.trim(),
            keywords: params.keywords || [],
            inlineKeywords:
              params.inlineKeywords || [],
            globalKeywords:
              params.globalKeywords || [],
            attachments:
              params.attachments || [],
            structure:
              params.structure || null,
            aiTool: params.aiTool,
            plan: params.plan,
            mode: params.mode || "real-ai",
            modelId: params.modelId,
            referenceImageMode:
              params.referenceImageMode ||
              "none",
            referenceImageBase64:
              params.referenceImageMode ===
              "upload"
                ? params.referenceImageBase64
                : undefined,
            referenceImageMimeType:
              params.referenceImageMode ===
              "upload"
                ? params.referenceImageMimeType
                : undefined,
          }),
        }
      );

      let data: {
        success?: boolean;
        prompt?: string;
        provider?: string;
        model?: string;
        error?: string;
      };

      try {
        data = await response.json();
      } catch {
        throw new Error(
          "The server sent back something unexpected. Please try again."
        );
      }

      if (!response.ok || !data.success) {
        throw new Error(
          data.error ||
            "Generation failed. Please try again."
        );
      }

      if (!data.prompt) {
        throw new Error(
          "The server didn't return a generated prompt."
        );
      }

      const finalResult: GenerationResult =
        {
          prompt: data.prompt,
          provider: data.provider || "",
          model: data.model || "",
        };

      setResult(finalResult);
      setStatus("success");
      options?.onSuccess?.(finalResult);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again.";

      // A network failure (offline, DNS,
      // server unreachable) throws a
      // generic TypeError from fetch —
      // give a clearer message for that
      // specific, common case.

      const isNetworkError =
        err instanceof TypeError;

      setError(
        isNetworkError
          ? "Couldn't reach the server. Check your connection and try again."
          : message
      );
      setStatus("error");
    }
  }

  function retry() {
    if (lastParams) {
      generate(lastParams);
    }
  }

  function reset() {
    setStatus("idle");
    setResult(null);
    setError(null);
    setLastParams(null);
  }

  return {
    status,
    result,
    error,
    generate,
    retry,
    reset,
    canRetry: Boolean(lastParams),
  };
}
