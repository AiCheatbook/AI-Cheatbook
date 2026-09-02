"use client";

type AddKeywordButtonProps = {
  keyword: string;
};

const SAVED_KEYWORDS_STORAGE_KEY =
  "ai-cheatbook-saved-keywords";

const KEYWORDS_UPDATED_EVENT =
  "ai-cheatbook-keywords-updated";

export default function AddKeywordButton({
  keyword,
}: AddKeywordButtonProps) {
  function addKeyword() {
    try {
      const stored = JSON.parse(
        localStorage.getItem(
          SAVED_KEYWORDS_STORAGE_KEY
        ) || "[]"
      );

      const currentKeywords = Array.isArray(stored)
        ? stored
        : [];

      if (!currentKeywords.includes(keyword)) {
        const updatedKeywords = [
          ...currentKeywords,
          keyword,
        ];

        localStorage.setItem(
          SAVED_KEYWORDS_STORAGE_KEY,
          JSON.stringify(updatedKeywords)
        );
      }

      window.dispatchEvent(
        new Event(KEYWORDS_UPDATED_EVENT)
      );
    } catch (error) {
      console.error(
        "Failed to add keyword:",
        error
      );
    }
  }

  return (
    <button
      type="button"
      onClick={addKeyword}
      className="flex h-7 w-7 items-center justify-center rounded-full text-lg text-brand transition hover:bg-brand hover:text-white"
      aria-label={`Add ${keyword} to Prompt Builder`}
      title={`Add ${keyword} to Prompt Builder`}
    >
      +
    </button>
  );
}