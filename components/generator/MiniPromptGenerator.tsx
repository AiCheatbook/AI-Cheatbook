"use client";

import { useEffect, useState } from "react";
import { useAuthState } from "./hooks/useAuthState";
import { useUsageTracking } from "./hooks/useUsageTracking";
import { useGeneration } from "./hooks/useGeneration";
import StructurePopover from "./ui/StructurePopover";
import GenerationResult from "./ui/GenerationResult";
import type { PromptStructureSpec } from "./aiProvider";
import { getAvailableModels } from "./modelSelector";
import { PROMPT_TYPES, type PromptType } from "./promptTypes";

const SAVED_KEYWORDS_STORAGE_KEY = "ai-cheatbook-saved-keywords";
const KEYWORDS_UPDATED_EVENT = "ai-cheatbook-keywords-updated";

/*
 * The Mini/Quick Generator — deliberately a DIFFERENT, lighter
 * experience from the full Prompt Designer, per spec: it assumes
 * keywords were already picked while Browsing the Promptbook
 * (via AddKeywordButton, which writes to the same localStorage
 * key this reads from) and does NOT show the dynamic
 * keyword-search/selector at all. Structure and model choice
 * remain available. Generation itself still goes through the
 * same shared useGeneration → /api/generate → aiProvider chain
 * the full Composer uses, so behavior can't silently diverge
 * even though the UI now does.
 */
export default function MiniPromptGenerator() {
  const { isLoggedIn } = useAuthState();
  const {
    usage,
    canGenerateNow,
    recordAnonymousGeneration,
  } = useUsageTracking(isLoggedIn);

  const [savedKeywords, setSavedKeywords] = useState<string[]>([]);
  const [task, setTask] = useState("");
  const [promptType, setPromptType] = useState<PromptType>(
    PROMPT_TYPES[0]
  );
  const [structure, setStructure] =
    useState<PromptStructureSpec | null>(null);

  const availableModels = getAvailableModels("free");
  const [selectedModelId, setSelectedModelId] = useState(
    availableModels[0]?.id
  );

  const [generationMode, setGenerationMode] = useState<
    "builtin" | "real-ai"
  >("real-ai");
  const effectiveGenerationMode: "builtin" | "real-ai" =
    isLoggedIn ? generationMode : "builtin";

  const [limitNotice, setLimitNotice] = useState(false);
  const [copied, setCopied] = useState(false);

  const { status, result, error, generate, reset } = useGeneration();

  useEffect(() => {
    function loadSavedKeywords() {
      try {
        const stored = JSON.parse(
          window.localStorage.getItem(SAVED_KEYWORDS_STORAGE_KEY) || "[]"
        );
        if (Array.isArray(stored)) {
          setSavedKeywords(stored);
        }
      } catch (err) {
        console.error(
          "MiniPromptGenerator: failed to read saved keywords:",
          err
        );
      }
    }

    loadSavedKeywords();

    window.addEventListener(KEYWORDS_UPDATED_EVENT, loadSavedKeywords);
    return () =>
      window.removeEventListener(KEYWORDS_UPDATED_EVENT, loadSavedKeywords);
  }, []);

  function removeSavedKeyword(label: string) {
    const next = savedKeywords.filter((k) => k !== label);
    setSavedKeywords(next);
    try {
      window.localStorage.setItem(
        SAVED_KEYWORDS_STORAGE_KEY,
        JSON.stringify(next)
      );
    } catch (err) {
      console.error(
        "MiniPromptGenerator: failed to update saved keywords:",
        err
      );
    }
  }

  async function handleGenerate() {
    if (!task.trim()) return;

    if (effectiveGenerationMode === "real-ai" && !canGenerateNow()) {
      setLimitNotice(true);
      return;
    }

    setLimitNotice(false);
    setCopied(false);
    reset();

    await generate({
      task,
      globalKeywords: savedKeywords,
      structure,
      aiTool: promptType.aiTool,
      plan: "free",
      mode: effectiveGenerationMode,
      modelId: selectedModelId,
    });

    if (!isLoggedIn) {
      recordAnonymousGeneration();
    }
  }

  async function handleCopy() {
    if (!result?.prompt) return;
    await navigator.clipboard.writeText(result.prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="p-4">
      {savedKeywords.length > 0 && (
        <div className="mb-3">
          <p className="mb-1.5 text-xs font-medium text-zinc-500">
            Keywords from Promptbook
          </p>
          <div className="flex flex-wrap gap-1.5">
            {savedKeywords.map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => removeSavedKeyword(k)}
                title="Remove"
                className="rounded-full border border-brand/30 bg-brand/10 px-2.5 py-1 text-xs text-brand-text hover:bg-brand/20"
              >
                {k} ✕
              </button>
            ))}
          </div>
        </div>
      )}

      {savedKeywords.length === 0 && (
        <p className="mb-3 text-xs text-zinc-500">
          No keywords selected yet — browse the{" "}
          <a href="/search" className="text-brand-text hover:underline">
            Promptbook
          </a>{" "}
          and add some, or just type your idea below.
        </p>
      )}

      <textarea
        value={task}
        onChange={(e) => setTask(e.target.value)}
        rows={3}
        placeholder="What do you want to create?"
        className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-brand"
      />

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <select
          value={promptType.value}
          onChange={(e) => {
            const next = PROMPT_TYPES.find(
              (t) => t.value === e.target.value
            );
            if (next) setPromptType(next);
          }}
          className="rounded-full border border-zinc-300 bg-white px-2.5 py-1 text-xs text-zinc-600"
        >
          {PROMPT_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>

        <StructurePopover
          selected={structure}
          onChange={setStructure}
          isLoggedIn={isLoggedIn}
        />

        {availableModels.length > 0 && (
          <select
            value={selectedModelId}
            onChange={(e) => setSelectedModelId(e.target.value)}
            className="rounded-full border border-zinc-300 bg-white px-2.5 py-1 text-xs text-zinc-600"
          >
            {availableModels.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        )}

        <button
          type="button"
          disabled={!isLoggedIn}
          onClick={() =>
            setGenerationMode((m) =>
              m === "real-ai" ? "builtin" : "real-ai"
            )
          }
          title={
            !isLoggedIn
              ? "Log in to use Real AI"
              : undefined
          }
          className="ml-auto rounded-full border border-zinc-300 px-2.5 py-1 text-xs text-zinc-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {!isLoggedIn
            ? "⚙ Built-in"
            : effectiveGenerationMode === "real-ai"
              ? "✨ Real AI"
              : "⚙ Built-in"}
        </button>
      </div>

      <button
        type="button"
        onClick={handleGenerate}
        disabled={!task.trim() || status === "generating"}
        className="mt-3 w-full rounded-xl bg-brand py-2 text-sm font-semibold text-zinc-900 transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-50"
      >
        {status === "generating" ? "Generating..." : "Generate"}
      </button>

      {limitNotice && (
        <p className="mt-2 text-center text-xs text-red-500">
          You&apos;ve reached today&apos;s Real AI limit — try the free
          built-in generator instead.
        </p>
      )}

      <GenerationResult
        status={status}
        result={result}
        error={error}
        showSave={false}
      />

      {result?.prompt && (
        <button
          type="button"
          onClick={handleCopy}
          className="mt-2 w-full rounded-xl border border-zinc-300 py-2 text-sm text-zinc-600 hover:border-brand/50"
        >
          {copied ? "Copied!" : "Copy Prompt"}
        </button>
      )}

      <p className="mt-2 text-center text-xs text-zinc-500">
        {usage.remaining} generations remaining today
        {!isLoggedIn && " — log in for more"}
      </p>
    </div>
  );
}
