"use client";

import { useEffect, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import Document from "@tiptap/extension-document";
import Paragraph from "@tiptap/extension-paragraph";
import Text from "@tiptap/extension-text";
import History from "@tiptap/extension-history";
import Placeholder from "@tiptap/extension-placeholder";
import { supabaseAuthClient } from "@/lib/supabase/auth-client";
import type { AITool } from "./types";
import KeywordChip from "./extensions/KeywordChip";
import { getInlineKeywordsFromDoc } from "./getInlineKeywords";
import { useAuthState } from "./hooks/useAuthState";
import { useUsageTracking } from "./hooks/useUsageTracking";
import { useGeneration } from "./hooks/useGeneration";
import ComposerKeywordSearch, {
  type ComposerKeywordMatch,
} from "./ui/ComposerKeywordSearch";
import GlobalKeywordsBar from "./ui/GlobalKeywordsBar";
import AttachmentPopover, {
  type ComposerAttachment,
  type AttachmentMode,
} from "./ui/AttachmentPopover";
import StructurePopover from "./ui/StructurePopover";
import GenerationResult from "./ui/GenerationResult";
import type { PromptStructureSpec } from "./aiProvider";

type PromptType = {
  value: string;
  label: string;
  aiTool: AITool;
};

const PROMPT_TYPES: PromptType[] = [
  {
    value: "image",
    label: "Image Generation",
    aiTool: "Midjourney",
  },
  {
    value: "video",
    label: "Video Generation",
    aiTool: "Veo",
  },
  {
    value: "writing",
    label: "Writing",
    aiTool: "ChatGPT",
  },
  {
    value: "code",
    label: "Coding",
    aiTool: "ChatGPT",
  },
  {
    value: "marketing",
    label: "Marketing",
    aiTool: "ChatGPT",
  },
];

type PromptComposerProps = {
  /*
   * Used when this same component is
   * rendered inside the Mini Generator's
   * compact floating panel — hides the
   * big centered heading (the panel
   * already has its own header) and
   * lets the layout fill a narrower
   * container instead of centering
   * itself on the page.
   */
  compact?: boolean;
};

export default function PromptComposer({
  compact = false,
}: PromptComposerProps) {
  const { isLoggedIn } = useAuthState();
  const {
    usage,
    canGenerateNow,
    recordAnonymousGeneration,
    refreshRegisteredUsage,
  } = useUsageTracking(isLoggedIn);

  const [promptType, setPromptType] =
    useState<PromptType>(PROMPT_TYPES[0]);
  const [typeMenuOpen, setTypeMenuOpen] =
    useState(false);

  const [
    searchQuery,
    setSearchQuery,
  ] = useState("");
  const [searchOpen, setSearchOpen] =
    useState(false);

  const [globalKeywords, setGlobalKeywords] =
    useState<string[]>([]);

  const [attachments, setAttachments] =
    useState<ComposerAttachment[]>([]);
  const [attachmentMode, setAttachmentMode] =
    useState<AttachmentMode>("none");
  const [structure, setStructure] =
    useState<PromptStructureSpec | null>(
      null
    );

  const [generationMode, setGenerationMode] =
    useState<"builtin" | "real-ai">(
      "real-ai"
    );

  const [saving, setSaving] =
    useState(false);
  const [saved, setSaved] = useState(false);
  const [limitNotice, setLimitNotice] =
    useState(false);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      Document,
      Paragraph,
      Text,
      History,
      KeywordChip,
      Placeholder.configure({
        placeholder:
          "generate a girl standing...",
      }),
    ],
    editorProps: {
      attributes: {
        class:
          "min-h-[56px] text-lg text-zinc-900 outline-none",
      },
    },
  });

  const {
    status,
    result,
    error,
    generate,
    retry,
    canRetry,
    reset,
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

  function handleInlineKeywordSelect(
    match: ComposerKeywordMatch
  ) {
    if (editor) {
      /*
       * Replace whatever partial word
       * the person was typing (e.g.
       * "sta") with the actual keyword,
       * rather than leaving it behind
       * next to the inserted chip. The
       * partial word is exactly what's
       * currently in the search query,
       * since that's derived from the
       * text right before the cursor.
       */

      const { from } =
        editor.state.selection;

      const deleteFrom = Math.max(
        0,
        from - searchQuery.length
      );

      editor
        .chain()
        .focus()
        .deleteRange({
          from: deleteFrom,
          to: from,
        })
        .insertKeywordChip(match.label)
        .run();
    }

    setSearchQuery("");
    setSearchOpen(false);
  }

  function addGlobalKeyword(
    label: string
  ) {
    setGlobalKeywords((current) =>
      current.includes(label)
        ? current
        : [...current, label]
    );
  }

  function removeGlobalKeyword(
    label: string
  ) {
    setGlobalKeywords((current) =>
      current.filter((k) => k !== label)
    );
  }

  const taskText = editor
    ? editor.getText()
    : "";

  async function handleGenerate() {
    if (!taskText.trim() || !editor) {
      return;
    }

    if (!canGenerateNow()) {
      setLimitNotice(true);
      return;
    }

    setLimitNotice(false);
    reset();

    await generate({
      task: taskText,
      inlineKeywords:
        getInlineKeywordsFromDoc(
          editor
        ),
      globalKeywords,
      attachments: attachments.map(
        (a) => ({
          base64: a.base64,
          mimeType: a.mimeType,
          role: a.role,
        })
      ),
      structure,
      aiTool: promptType.aiTool,
      plan: "free",
      mode: generationMode,
      referenceImageMode: attachmentMode,
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
            title: taskText.slice(0, 80),
            prompt_text: result.prompt,
            ai_tool: promptType.aiTool,
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

  useEffect(() => {
    if (!editor) {
      return;
    }

    function handleUpdate() {
      const text = editor!.getText();
      const lastWord =
        text.split(/\s+/).pop() || "";
      setSearchQuery(lastWord);
      setSearchOpen(lastWord.length >= 2);
    }

    editor.on("update", handleUpdate);

    return () => {
      editor.off("update", handleUpdate);
    };
  }, [editor]);

  return (
    <div
      className={
        compact
          ? "w-full"
          : "mx-auto w-full max-w-2xl"
      }
    >
      {!compact && (
        <h1 className="text-center text-2xl font-semibold text-zinc-900 sm:text-3xl">
          What do you want to create?
        </h1>
      )}

      <div
        className={
          compact
            ? "mt-2 flex justify-center"
            : "mt-5 flex justify-center"
        }
      >
        <div className="relative">
          <button
            type="button"
            onClick={() =>
              setTypeMenuOpen((v) => !v)
            }
            className="rounded-full border border-zinc-300 bg-white px-4 py-1.5 text-sm text-zinc-600 transition hover:border-brand hover:text-brand-text"
          >
            {promptType.label} ▾
          </button>

          {typeMenuOpen && (
            <div className="absolute left-1/2 z-30 mt-2 w-48 -translate-x-1/2 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-xl">
              {PROMPT_TYPES.map(
                (type) => (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => {
                      setPromptType(
                        type
                      );
                      setTypeMenuOpen(
                        false
                      );
                    }}
                    className="block w-full px-4 py-2 text-left text-sm text-zinc-600 hover:bg-zinc-100"
                  >
                    {type.label}
                  </button>
                )
              )}
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 rounded-3xl border border-zinc-200 bg-white p-5 shadow-lg">
        <div className="relative">
          <EditorContent editor={editor} />

          {searchOpen && (
            <ComposerKeywordSearch
              query={searchQuery}
              onSelect={
                handleInlineKeywordSelect
              }
            />
          )}
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-zinc-200 pt-3">
          <div className="flex items-center gap-2">
            <AttachmentPopover
              attachments={attachments}
              onAdd={(a) =>
                setAttachments(
                  (current) => [
                    ...current,
                    a,
                  ]
                )
              }
              onRemove={(id) =>
                setAttachments(
                  (current) =>
                    current.filter(
                      (a) => a.id !== id
                    )
                )
              }
              promptType={
                promptType.value
              }
              mode={attachmentMode}
              onModeChange={
                setAttachmentMode
              }
            />

            <StructurePopover
              selected={structure}
              onChange={setStructure}
              isLoggedIn={isLoggedIn}
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() =>
                setGenerationMode(
                  (m) =>
                    m === "real-ai"
                      ? "builtin"
                      : "real-ai"
                )
              }
              title={
                generationMode ===
                "real-ai"
                  ? "Using Real AI (Gemini) — click to switch to the free built-in generator"
                  : "Using the free built-in generator — click to switch to Real AI"
              }
              className="rounded-full border border-zinc-300 px-3 py-1.5 text-xs text-zinc-600 transition hover:border-zinc-500 hover:text-zinc-900"
            >
              {generationMode ===
              "real-ai"
                ? "✨ Real AI"
                : "⚙ Built-in"}
            </button>

            <button
              type="button"
              onClick={handleGenerate}
              disabled={
                !taskText.trim() ||
                status === "generating"
              }
              className="flex h-10 w-10 items-center justify-center rounded-full bg-brand text-zinc-900 transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Generate prompt"
          >
            {status === "generating"
              ? "…"
              : "↑"}
          </button>
        </div>
        </div>
      </div>

      <GlobalKeywordsBar
        selected={globalKeywords}
        onAdd={addGlobalKeyword}
        onRemove={removeGlobalKeyword}
      />

      <p className="mt-2 text-center text-xs text-zinc-600">
        {usage.remaining} generations
        remaining today
        {!isLoggedIn &&
          " — log in for more"}
      </p>

      {limitNotice && (
        <p className="mt-2 text-center text-sm text-brand-text">
          You&apos;ve reached today&apos;s
          limit.
        </p>
      )}

      {status !== "idle" && (
        <div className="mt-6">
          <GenerationResult
            status={status}
            result={result}
            error={error}
            isAnalyzingImage={
              attachments.length > 0
            }
            onRetry={retry}
            canRetry={canRetry}
            onSave={handleSave}
            saving={saving}
            saved={saved}
            showSave={isLoggedIn}
          />
        </div>
      )}
    </div>
  );
}
