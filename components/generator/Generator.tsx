"use client";

import { useEffect, useState } from "react";

import GenerateButton from "./GenerateButton";
import KeywordGroup from "./KeywordGroup";
import PromptOutput from "./PromptOutput";

import {
  canGenerate,
  getUsage,
  recordGeneration,
  USAGE_LIMITS,
} from "./usageConfig";

import { getDefaultModel } from "./modelSelector";

import type {
  AITool,
  GeneratorGroup,
  GeneratorKeyword,
} from "./types";

import type { UserPlan } from "./modelConfig";

import { supabase } from "@/lib/supabase/client";
import { supabaseAuthClient } from "@/lib/supabase/auth-client";

const SAVED_KEYWORDS_STORAGE_KEY =
  "ai-cheatbook-saved-keywords";

const KEYWORDS_UPDATED_EVENT =
  "ai-cheatbook-keywords-updated";

const AI_TOOLS: AITool[] = [
  "ChatGPT",
  "Gemini",
  "Claude",
  "Midjourney",
  "Flux",
  "Runway",
  "Veo",
];

export default function Generator() {
  const userPlan: UserPlan = "free";

  const [task, setTask] = useState("");

  const [aiTool, setAITool] =
    useState<AITool>("ChatGPT");

  const [referenceImageMode, setReferenceImageMode] =
    useState<
      | "none"
      | "upload"
      | "one-later"
      | "multiple-later"
    >("none");

  const [referenceImagePreview, setReferenceImagePreview] =
    useState<string | null>(null);

  const [referenceImageBase64, setReferenceImageBase64] =
    useState<string | null>(null);

  const [referenceImageMimeType, setReferenceImageMimeType] =
    useState<string | null>(null);

  function handleReferenceImageFile(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      const result =
        reader.result as string;

      // result looks like:
      // "data:image/png;base64,AAAA..."
      // — only the part after the comma
      // is the actual base64 data.

      const base64 = result.split(
        ","
      )[1];

      setReferenceImageBase64(base64);
      setReferenceImageMimeType(
        file.type
      );
      setReferenceImagePreview(result);
    };

    reader.readAsDataURL(file);
  }

  function clearReferenceImage() {
    setReferenceImagePreview(null);
    setReferenceImageBase64(null);
    setReferenceImageMimeType(null);
  }

  const [generatorKeywords, setGeneratorKeywords] =
    useState<GeneratorKeyword[]>([]);

  const [keywordGroups, setKeywordGroups] =
    useState<GeneratorGroup[]>([]);

  const [selectedKeywords, setSelectedKeywords] =
    useState<string[]>([]);

  const [generatedPrompt, setGeneratedPrompt] =
    useState("");

  const [generationError, setGenerationError] =
    useState("");

  const [savedKeywords, setSavedKeywords] =
    useState<string[]>([]);

  const [isGenerating, setIsGenerating] =
    useState(false);

  const [isLoadingKeywords, setIsLoadingKeywords] =
    useState(true);

  const [modelName, setModelName] =
    useState("");

  const [usage, setUsage] = useState(() => ({
    used: 0,
    limit: USAGE_LIMITS[userPlan],
    remaining: USAGE_LIMITS[userPlan],
  }));

  /*
   * Registered users have their own,
   * server-tracked usage (separate from the
   * localStorage-based anonymous limit
   * above) — this can't be spoofed by
   * clearing browser data, since it lives
   * in their account.
   */

  const REGISTERED_DAILY_LIMIT = 50;

  const [isLoggedIn, setIsLoggedIn] =
    useState(false);

  const [registeredUsage, setRegisteredUsage] =
    useState({
      used: 0,
      limit: REGISTERED_DAILY_LIMIT,
      remaining: REGISTERED_DAILY_LIMIT,
    });

  async function refreshRegisteredUsage() {
    const {
      data: { user },
    } =
      await supabaseAuthClient.auth.getUser();

    if (!user) {
      setIsLoggedIn(false);
      return;
    }

    setIsLoggedIn(true);

    const { data } = await supabaseAuthClient
      .from("profiles")
      .select(
        "real_ai_used_today, real_ai_usage_date"
      )
      .eq("id", user.id)
      .single();

    if (!data) {
      return;
    }

    const today = new Date()
      .toISOString()
      .slice(0, 10);

    const usedToday =
      data.real_ai_usage_date === today
        ? data.real_ai_used_today
        : 0;

    setRegisteredUsage({
      used: usedToday,
      limit: REGISTERED_DAILY_LIMIT,
      remaining: Math.max(
        0,
        REGISTERED_DAILY_LIMIT - usedToday
      ),
    });
  }

  useEffect(() => {
    refreshRegisteredUsage();
  }, []);

  /*
   * Real usage lives in localStorage, which
   * only exists in the browser. Reading it
   * during the initial render would make the
   * server and the browser's first render
   * disagree (a hydration mismatch), so it's
   * synced in here instead, right after the
   * page has already loaded.
   */

  useEffect(() => {
    setUsage(getUsage(userPlan));
  }, [userPlan]);

  /*
   * Whichever usage actually applies to this
   * visitor right now — their real,
   * server-tracked account usage if logged
   * in, or the local anonymous count if not.
   */

  const displayUsage = isLoggedIn
    ? registeredUsage
    : usage;

  const currentModel =
    getDefaultModel(userPlan);

  /*
   * Load keywords from Supabase
   */

  useEffect(() => {
    async function loadKeywords() {
      setIsLoadingKeywords(true);

      const { data, error } = await supabase
        .from("library_keywords")
        .select(
          `
            id,
            label,
            description,
            category
          `
        )
        .order("category", {
          ascending: true,
        })
        .order("label", {
          ascending: true,
        });

      if (error) {
        console.error(
          "Failed to load generator keywords:",
          error
        );

        setGeneratorKeywords([]);
        setKeywordGroups([]);
        setIsLoadingKeywords(false);

        return;
      }

      const keywords: GeneratorKeyword[] =
        (data || [])
          .filter(
            (keyword) =>
              typeof keyword.id === "string" &&
              typeof keyword.label === "string" &&
              typeof keyword.category === "string"
          )
          .map((keyword) => ({
            id: keyword.id,
            label: keyword.label,
            category: keyword.category,
            description:
              keyword.description || undefined,
          }));

      const groups = Array.from(
        new Set(
          keywords.map(
            (keyword) => keyword.category
          )
        )
      ).map((category) => ({
        category,
        keywords: keywords.filter(
          (keyword) =>
            keyword.category === category
        ),
      }));

      setGeneratorKeywords(keywords);
      setKeywordGroups(groups);
      setIsLoadingKeywords(false);
    }

    loadKeywords();
  }, []);

  /*
   * Load saved keywords
   */

  useEffect(() => {
    function loadSavedData() {
      try {
        const storedKeywords = JSON.parse(
          localStorage.getItem(
            SAVED_KEYWORDS_STORAGE_KEY
          ) || "[]"
        );

        if (Array.isArray(storedKeywords)) {
          setSavedKeywords(storedKeywords);

          const savedIds =
            generatorKeywords
              .filter((keyword) =>
                storedKeywords.includes(
                  keyword.label
                )
              )
              .map((keyword) => keyword.id);

          setSelectedKeywords(savedIds);
        } else {
          setSavedKeywords([]);
        }

        setUsage(getUsage(userPlan));
      } catch (error) {
        console.error(
          "Failed to load saved keywords:",
          error
        );

        setSavedKeywords([]);
        setUsage(getUsage(userPlan));
      }
    }

    const timer = window.setTimeout(
      loadSavedData,
      0
    );

    window.addEventListener(
      KEYWORDS_UPDATED_EVENT,
      loadSavedData
    );

    window.addEventListener(
      "storage",
      loadSavedData
    );

    return () => {
      window.clearTimeout(timer);

      window.removeEventListener(
        KEYWORDS_UPDATED_EVENT,
        loadSavedData
      );

      window.removeEventListener(
        "storage",
        loadSavedData
      );
    };
  }, [generatorKeywords]);

  /*
   * Toggle keyword
   */

  function toggleKeyword(keywordId: string) {
    setSelectedKeywords((current) => {
      if (current.includes(keywordId)) {
        return current.filter(
          (id) => id !== keywordId
        );
      }

      return [...current, keywordId];
    });

    setGeneratedPrompt("");
    setGenerationError("");
    setModelName("");
  }

  /*
   * Generate
   */

  async function generatePrompt() {
    setGenerationError("");

    if (!task.trim()) {
      setGenerationError(
        "Please describe what you want to create."
      );

      return;
    }

    if (selectedKeywords.length === 0) {
      setGenerationError(
        "Please select at least one keyword."
      );

      return;
    }

    if (!isLoggedIn && !canGenerate(userPlan)) {
      setUsage(getUsage(userPlan));

      setGenerationError(
        "Your daily generation limit has been reached."
      );

      return;
    }

    setIsGenerating(true);
    setGeneratedPrompt("");
    setModelName("");

    try {
      const selected =
        generatorKeywords.filter((keyword) =>
          selectedKeywords.includes(keyword.id)
        );

      const response = await fetch(
        "/api/generate",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            task: task.trim(),
            keywords: selected.map(
              (keyword) => keyword.label
            ),
            aiTool,
            plan: userPlan,
            referenceImageMode,
            referenceImageBase64:
              referenceImageMode ===
              "upload"
                ? referenceImageBase64
                : undefined,
            referenceImageMimeType:
              referenceImageMode ===
              "upload"
                ? referenceImageMimeType
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
          "The server returned an invalid response."
        );
      }

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Generation failed. Please try again."
        );
      }

      if (!data.prompt) {
        throw new Error(
          "The server did not return a generated prompt."
        );
      }

      if (isLoggedIn) {
        refreshRegisteredUsage();
      } else {
        const updatedUsage =
          recordGeneration(userPlan);

        setUsage(updatedUsage);
      }

      setGeneratedPrompt(data.prompt);
      setModelName(data.model || "");
      setGenerationError("");
    } catch (error) {
      console.error(
        "Prompt generation failed:",
        error
      );

      setGeneratedPrompt("");

      setGenerationError(
        error instanceof Error
          ? error.message
          : "Something went wrong while generating the prompt."
      );
    } finally {
      setIsGenerating(false);
    }
  }

  /*
   * Clear selection
   */

  function clearSelection() {
    setSelectedKeywords([]);
    setGeneratedPrompt("");
    setGenerationError("");
    setModelName("");
  }

  /*
   * Clear saved keywords
   */

  function clearSavedKeywords() {
    localStorage.removeItem(
      SAVED_KEYWORDS_STORAGE_KEY
    );

    setSavedKeywords([]);
    setSelectedKeywords([]);
    setGeneratedPrompt("");
    setGenerationError("");
    setModelName("");

    window.dispatchEvent(
      new Event(KEYWORDS_UPDATED_EVENT)
    );
  }

  return (
    <div className="space-y-8">

      {/* Header */}

      <div>
        <h1 className="text-4xl font-bold text-white sm:text-5xl">
          AI Prompt Generator
        </h1>

        <p className="mt-4 max-w-2xl text-zinc-600">
          Tell us what you want to create, choose
          your AI tool, then select the qualities
          you want.
        </p>
      </div>

      {/* Plan & Usage */}

      <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
        <div className="grid gap-5 sm:grid-cols-3">

          <div>
            <p className="text-sm text-zinc-600">
              Current Plan
            </p>

            <p className="mt-1 font-semibold text-white">
              Free
            </p>
          </div>

          <div>
            <p className="text-sm text-zinc-600">
              Current Model
            </p>

            <p className="mt-1 font-semibold text-brand">
              {currentModel.name}
            </p>
          </div>

          <div>
            <p className="text-sm text-zinc-600">
              Daily Generations
            </p>

            <p className="mt-1 font-semibold text-white">
              {displayUsage.used} / {displayUsage.limit}
            </p>
          </div>

        </div>

        <div className="mt-5">

          <div className="mb-2 flex items-center justify-between text-xs">
            <span className="text-zinc-600">
              Today&apos;s usage
            </span>

            <span className="text-zinc-600">
              {displayUsage.remaining} remaining
            </span>
          </div>

          <div className="h-2 overflow-hidden rounded-full bg-zinc-800">
            <div
              className="h-full rounded-full bg-brand transition-all"
              style={{
                width: `${
                  displayUsage.limit > 0
                    ? Math.min(
                        100,
                        (displayUsage.used /
                          displayUsage.limit) *
                          100
                      )
                    : 0
                }%`,
              }}
            />
          </div>

        </div>

        {displayUsage.remaining === 0 && (
          <div className="mt-5 rounded-xl border border-brand/30 bg-brand/10 p-4">
            <p className="font-semibold text-brand">
              Daily limit reached
            </p>

            <p className="mt-1 text-sm text-zinc-600">
              Free users can generate{" "}
              {displayUsage.limit} prompts per day.
            </p>
          </div>
        )}

      </section>

      {/* AI Tool */}

      <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">

        <h2 className="text-lg font-semibold text-white">
          Choose AI Tool
        </h2>

        <p className="mt-1 text-sm text-zinc-600">
          Choose the tool your prompt is intended for.
        </p>

        <div className="mt-4 flex flex-wrap gap-2">

          {AI_TOOLS.map((tool) => (
            <button
              key={tool}
              type="button"
              onClick={() => {
                setAITool(tool);
                setGeneratedPrompt("");
                setGenerationError("");
                setModelName("");
              }}
              className={`rounded-full border px-4 py-2 text-sm transition ${
                aiTool === tool
                  ? "border-brand bg-brand text-white"
                  : "border-zinc-700 bg-black text-zinc-300 hover:border-brand hover:text-brand"
              }`}
            >
              {tool}
            </button>
          ))}

        </div>

      </section>

      {/* Reference Image */}

      <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">

        <h2 className="text-lg font-semibold text-white">
          Reference Image{" "}
          <span className="text-sm font-normal text-zinc-600">
            (optional)
          </span>
        </h2>

        <p className="mt-1 text-sm text-zinc-600">
          For turning an image into a
          video prompt.
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          {(
            [
              {
                value: "none",
                label: "No reference image",
              },
              {
                value: "upload",
                label: "Upload image now",
              },
              {
                value: "one-later",
                label:
                  "1 reference image later",
              },
              {
                value: "multiple-later",
                label:
                  "Multiple images later",
              },
            ] as const
          ).map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                setReferenceImageMode(
                  option.value
                );

                if (
                  option.value !== "upload"
                ) {
                  clearReferenceImage();
                }
              }}
              className={`rounded-full border px-4 py-2 text-sm transition ${
                referenceImageMode ===
                option.value
                  ? "border-brand bg-brand text-white"
                  : "border-zinc-700 bg-black text-zinc-300 hover:border-brand hover:text-brand"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        {referenceImageMode ===
          "upload" && (
          <div className="mt-4">
            {referenceImagePreview ? (
              <div className="flex items-center gap-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={
                    referenceImagePreview
                  }
                  alt="Reference"
                  className="h-24 w-24 rounded-xl object-cover"
                />

                <button
                  type="button"
                  onClick={
                    clearReferenceImage
                  }
                  className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-white hover:bg-zinc-800"
                >
                  Remove
                </button>
              </div>
            ) : (
              <label className="inline-block cursor-pointer rounded-xl border border-dashed border-zinc-700 px-5 py-3 text-sm text-zinc-600 hover:border-brand hover:text-brand">
                Choose an image...
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={
                    handleReferenceImageFile
                  }
                  className="sr-only"
                />
              </label>
            )}
          </div>
        )}

      </section>

      {/* Task */}

      <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">

        <label
          htmlFor="generator-task"
          className="text-lg font-semibold text-white"
        >
          What do you want to create?
        </label>

        <p className="mt-1 text-sm text-zinc-600">
          Describe your goal in a few words.
        </p>

        <textarea
          id="generator-task"
          value={task}
          onChange={(event) => {
            setTask(event.target.value);
            setGenerationError("");
          }}
          placeholder="Example: Create a YouTube video about AI tools for beginners..."
          rows={4}
          className="mt-4 w-full resize-none rounded-xl border border-zinc-700 bg-black px-4 py-3 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-brand"
        />

      </section>

      {/* Saved Keywords */}

      {savedKeywords.length > 0 && (
        <section className="rounded-2xl border border-green-500/30 bg-green-500/5 p-5">

          <div className="flex flex-wrap items-center justify-between gap-3">

            <div>
              <h2 className="font-semibold text-white">
                Saved Keywords
              </h2>

              <p className="mt-1 text-sm text-zinc-600">
                Added from the Prompt Library
              </p>
            </div>

            <button
              type="button"
              onClick={clearSavedKeywords}
              className="text-sm text-zinc-600 transition hover:text-red-400"
            >
              Clear Saved
            </button>

          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {savedKeywords.map((keyword) => (
              <span
                key={keyword}
                className="rounded-full bg-green-500/20 px-3 py-1.5 text-sm text-green-400"
              >
                ✓ {keyword}
              </span>
            ))}
          </div>

        </section>
      )}

      {/* Selected Keywords */}

      <section className="rounded-2xl border border-brand/30 bg-brand/5 p-5">

        <div className="flex items-center justify-between gap-4">

          <div>
            <h2 className="font-semibold text-white">
              Selected Keywords
            </h2>

            <p className="mt-1 text-sm text-zinc-600">
              {selectedKeywords.length} selected
            </p>
          </div>

          {selectedKeywords.length > 0 && (
            <button
              type="button"
              onClick={clearSelection}
              className="text-sm text-zinc-600 transition hover:text-brand"
            >
              Clear Selection
            </button>
          )}

        </div>

        {selectedKeywords.length > 0 ? (
          <div className="mt-4 flex flex-wrap gap-2">

            {generatorKeywords
              .filter((keyword) =>
                selectedKeywords.includes(
                  keyword.id
                )
              )
              .map((keyword) => (
                <span
                  key={keyword.id}
                  className="rounded-full bg-brand px-3 py-1.5 text-sm text-white"
                >
                  {keyword.label}
                </span>
              ))}

          </div>
        ) : (
          <p className="mt-4 text-sm text-zinc-600">
            Select keywords below to build your prompt.
          </p>
        )}

      </section>

      {/* Keyword Groups */}

      {isLoadingKeywords ? (
        <div className="space-y-5">

          {Array.from({ length: 3 }).map(
            (_, index) => (
              <div
                key={index}
                className="h-32 animate-pulse rounded-2xl border border-zinc-800 bg-zinc-900"
              />
            )
          )}

        </div>
      ) : keywordGroups.length > 0 ? (
        <div className="space-y-5">

          {keywordGroups.map((group) => (
            <KeywordGroup
              key={group.category}
              group={group}
              selectedKeywords={
                selectedKeywords
              }
              onToggle={toggleKeyword}
            />
          ))}

        </div>
      ) : (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-8 text-center">
          <p className="text-zinc-600">
            No generator keywords available yet.
          </p>
        </div>
      )}

      {/* Generate */}

      <GenerateButton
        disabled={
          !task.trim() ||
          selectedKeywords.length === 0 ||
          isGenerating ||
          displayUsage.remaining === 0 ||
          isLoadingKeywords
        }
        loading={isGenerating}
        onClick={generatePrompt}
      />

      {/* Loading */}

      {isGenerating && (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 text-center">
          <p className="text-sm text-zinc-600">
            Building your {aiTool} prompt...
          </p>
        </div>
      )}

      {/* Error */}

      {generationError &&
        !isGenerating && (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/5 p-5">

            <p className="font-semibold text-red-400">
              Generation failed
            </p>

            <p className="mt-1 text-sm text-zinc-600">
              {generationError}
            </p>

          </div>
        )}

      {/* Model */}

      {modelName && !isGenerating && (
        <p className="text-center text-xs text-zinc-600">
          Model: {modelName}
        </p>
      )}

      {/* Output */}

      <PromptOutput
        prompt={generatedPrompt}
        loading={isGenerating}
        error={generationError}
        aiTool={aiTool}
        task={task}
        isLoggedIn={isLoggedIn}
      />

    </div>
  );
}