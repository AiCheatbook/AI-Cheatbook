import type { GeneratorKeyword } from "./types";

type KeywordChipProps = {
  keyword: GeneratorKeyword;
  selected: boolean;
  onClick: () => void;
};

export default function KeywordChip({
  keyword,
  selected,
  onClick,
}: KeywordChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={keyword.description}
      aria-pressed={selected}
      className={`rounded-full border px-4 py-2 text-sm transition ${
        selected
          ? "border-brand bg-brand text-white"
          : "border-zinc-700 bg-zinc-900 text-zinc-300 hover:border-brand hover:text-brand-text"
      }`}
    >
      {selected ? "✓ " : ""}
      {keyword.label}
    </button>
  );
}