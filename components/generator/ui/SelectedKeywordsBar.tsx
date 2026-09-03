"use client";

type SelectedKeywordsBarProps = {
  keywords: string[];
  onRemove: (keyword: string) => void;
};

export default function SelectedKeywordsBar({
  keywords,
  onRemove,
}: SelectedKeywordsBarProps) {
  if (keywords.length === 0) {
    return (
      <p className="text-sm text-zinc-600">
        No keywords selected yet — type
        above to find some, or add them
        from the Prompt Library.
      </p>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {keywords.map((keyword) => (
        <span
          key={keyword}
          className="flex items-center gap-2 rounded-full border border-brand/40 bg-brand/10 px-3 py-1.5 text-sm text-brand-text"
        >
          {keyword}

          <button
            type="button"
            onClick={() =>
              onRemove(keyword)
            }
            aria-label={`Remove ${keyword}`}
            className="text-brand-text/70 hover:text-white"
          >
            ×
          </button>
        </span>
      ))}
    </div>
  );
}
