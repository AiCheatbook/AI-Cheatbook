"use client";

import { useRef, useState } from "react";
import { supabaseAuthClient } from "@/lib/supabase/auth-client";
import type { AITool } from "./types";
import { useAuthState } from "./hooks/useAuthState";
import { useUsageTracking } from "./hooks/useUsageTracking";
import { useReferenceImage } from "./hooks/useReferenceImage";
import { useGeneration } from "./hooks/useGeneration";
import KeywordDiscovery from "./ui/KeywordDiscovery";
import SelectedKeywordsBar from "./ui/SelectedKeywordsBar";
import StructureSelector, {
  type PromptStructure,
} from "./ui/StructureSelector";
import ReferenceImagePicker from "./ui/ReferenceImagePicker";
import GenerationResult from "./ui/GenerationResult";

const AI_TOOLS: AITool[] = [
  "ChatGPT",
  "Gemini",
  "Claude",
  "Midjourney",
  "Flux",
  "Runway",
  "Veo",
];

export default function MainGenerator() {
  const { isLoggedIn } = useAuthState();
  const {
    usage,
    canGenerateNow,
    recordAnonymousGeneration,
    refreshRegisteredUsage,
  } = useUsageTracking(isLoggedIn);
  const referenceImage = useReferenceImage();

  const [task, setTask] = useState("");
  const [selectedKeywords, setSelectedKeywords] =
    useState<string[]>([]);
  const [aiTool, setAiTool] =
    useState<AITool>("ChatGPT");
  const [structure, setStructure] =
    useState<PromptStructure | null>(
      null
    );

  const [discoveryOpen, setDiscoveryOpen] =
    useState(false);
  const inputWrapperRef = useRef<HTMLDivElement>(
    null
  );

  const [saving, setSaving] =
    useState(false);
  const [saved, setSaved] = useState(false);
  const [limitNotice, setLimitNotice] =
    useState(false);

  const {
    status,
    result,
    error,
    generate,
    retry,
    canRetry,
  } = useGeneration({
    onSuccess: () => {
      setSaved(false);

      if (isLoggedIn) {
        refreshRegisteredUsage();
      } else {
        recordAnonymousGeneration();
      }
    },
  });

  function addKeyword(label: string) {
    setSelectedKeywords((current) =>
      current.includes(label)
        ? current
        : [...current, label]
    );
    setDiscoveryOpen(false);
  }

  function removeKeyword(label: string) {
    setSelectedKeywords((current) =>
      current.filter((k) => k !== label)
    );
  }

  function buildTaskWithStructure(): string {
    if (!structure) {
      return task;
    }

    const fieldList = structure.fields
      .map((f) => `- ${f}`)
      .join("\n");

    return `${task}\n\nFollow this structure:\n${fieldList}`;
  }

  async function handleGenerate() {
    if (!task.trim()) {
      return;
    }

    if (!canGenerateNow()) {
      setLimitNotice(true);
      return;
    }

    setLimitNotice(false);

    await generate({
      task: buildTaskWithStructure(),
      keywords: selectedKeywords,
      aiTool,
      plan: "free",
      referenceImageMode:
        referenceImage.mode,
      referenceImageBase64:
        referenceImage.base64,
      referenceImageMimeType:
        referenceImage.mimeType,
    });
  }

  async function handleSave() {
    if (!result?.prompt || saving) {
      return;
    }

    setSaving(true);

    try {
      const {
        data: { user },
      } =
        await supabaseAuthClient.auth.getUser();

      if (!user) {
        return;
      }

      const { error: insertError } =
        await supabaseAuthClient
          .from("saved_prompts")
          .insert({
            user_id: user.id,
            title: task.slice(0, 80),
            prompt_text: result.prompt,
            ai_tool: aiTool,
          });

      if (!insertError) {
        setSaved(true);

        window.setTimeout(
          () => setSaved(false),
          2000
        );
      }
    } finally {
      setSaving(false);
    }
  }

  const isAnalyzingImage =
    referenceImage.mode === "upload" &&
    Boolean(referenceImage.base64);

  return (
    <div className="space-y-6">
      {/* Fixed task input — the spec's
          "always the primary place you
          type" principle. Keyword
          discovery opens contextually
          right under it and never pushes
          it around. */}

      <section className="sticky top-20 z-10 rounded-2xl border border-zinc-800 bg-zinc-900/95 p-5 backdrop-blur sm:p-6">
        <label
          htmlFor="generator-task"
          className="text-lg font-semibold text-white"
        >
          What do you want to create?
        </label>

        <div
          ref={inputWrapperRef}
          className="relative mt-3"
        >
          <textarea
            id="generator-task"
            value={task}
            onChange={(e) => {
              setTask(e.target.value);
              setDiscoveryOpen(true);
            }}
            onFocus={() =>
              setDiscoveryOpen(true)
            }
            rows={3}
            placeholder="e.g. A warrior walking through a burning village. Type a technical term like 'camera' to find related keywords..."
            className="w-full rounded-xl border border-zinc-800 bg-black px-4 py-3 text-white outline-none transition focus:border-brand"
          />

          {discoveryOpen && (
            <KeywordDiscovery
              query={
                task
                  .split(/\s+/)
                  .pop() || ""
              }
              onSelect={addKeyword}
              alreadySelected={
                selectedKeywords
              }
            />
          )}
        </div>

        <div className="mt-3">
          <SelectedKeywordsBar
            keywords={selectedKeywords}
            onRemove={removeKeyword}
          />
        </div>
      </section>

      {/* AI Tool */}

      <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-600">
          AI Tool
        </h2>

        <div className="mt-3 flex flex-wrap gap-2">
          {AI_TOOLS.map((tool) => (
            <button
              key={tool}
              type="button"
              onClick={() =>
                setAiTool(tool)
              }
              className={`rounded-full border px-4 py-2 text-sm transition ${
                aiTool === tool
                  ? "border-brand bg-brand text-white"
                  : "border-zinc-700 bg-black text-zinc-300 hover:border-brand hover:text-brand-text"
              }`}
            >
              {tool}
            </button>
          ))}
        </div>
      </section>

      {/* Prompt Structure */}

      <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-600">
          Prompt Structure
        </h2>

        <div className="mt-3">
          <StructureSelector
            selectedId={
              structure?.id || null
            }
            onChange={setStructure}
          />
        </div>
      </section>

      {/* Reference Image */}

      <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-600">
          Reference Image{" "}
          <span className="normal-case text-zinc-600">
            (optional, for video prompts)
          </span>
        </h2>

        <div className="mt-3">
          <ReferenceImagePicker
            mode={referenceImage.mode}
            onModeChange={
              referenceImage.setMode
            }
            preview={
              referenceImage.preview
            }
            onFileSelected={
              referenceImage.handleFileSelected
            }
            onClear={referenceImage.clear}
          />

          {referenceImage.uploadError && (
            <p className="mt-2 text-xs text-red-400">
              {referenceImage.uploadError}
            </p>
          )}
        </div>
      </section>

      {/* Usage + Generate */}

      <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-zinc-600">
            Today&apos;s usage
          </span>
          <span className="text-zinc-600">
            {usage.remaining} remaining
          </span>
        </div>

        <div className="mt-2 h-2 overflow-hidden rounded-full bg-zinc-800">
          <div
            className="h-full rounded-full bg-brand transition-all"
            style={{
              width: `${
                usage.limit > 0
                  ? Math.min(
                      100,
                      (usage.used /
                        usage.limit) *
                        100
                    )
                  : 0
              }%`,
            }}
          />
        </div>

        {limitNotice && (
          <p className="mt-3 text-sm text-brand-text">
            You&apos;ve reached today&apos;s
            limit.{" "}
            {!isLoggedIn &&
              "Log in for a higher daily limit."}
          </p>
        )}

        <button
          type="button"
          onClick={handleGenerate}
          disabled={
            !task.trim() ||
            status === "generating"
          }
          className="mt-4 w-full rounded-xl bg-brand py-3.5 font-semibold text-white transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-50"
        >
          {status === "generating"
            ? "Generating..."
            : "Generate Prompt"}
        </button>
      </section>

      {/* Result */}

      <GenerationResult
        status={status}
        result={result}
        error={error}
        isAnalyzingImage={
          isAnalyzingImage
        }
        onRetry={retry}
        canRetry={canRetry}
        onSave={handleSave}
        saving={saving}
        saved={saved}
        showSave={isLoggedIn}
      />
    </div>
  );
}
