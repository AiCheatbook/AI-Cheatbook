import KeywordChip from "./KeywordChip";
import type { GeneratorGroup } from "./types";

type KeywordGroupProps = {
  group: GeneratorGroup;
  selectedKeywords: string[];
  onToggle: (keywordId: string) => void;
};

export default function KeywordGroup({
  group,
  selectedKeywords,
  onToggle,
}: KeywordGroupProps) {
  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">

      {/* Header */}

      <div className="mb-5">
        <h2 className="text-lg font-semibold text-white">
          {group.category}
        </h2>

        <p className="mt-1 text-sm text-zinc-600">
          Choose the qualities you want in your prompt.
        </p>
      </div>

      {/* Keywords */}

      <div className="flex flex-wrap gap-2">
        {group.keywords.map((keyword) => (
          <KeywordChip
            key={keyword.id}
            keyword={keyword}
            selected={selectedKeywords.includes(
              keyword.id
            )}
            onClick={() =>
              onToggle(keyword.id)
            }
          />
        ))}
      </div>

    </section>
  );
}