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
          ? "border-orange-500 bg-orange-500 text-white"
          : "border-zinc-700 bg-zinc-900 text-zinc-300 hover:border-orange-500 hover:text-orange-400"
      }`}
    >
      {selected ? "✓ " : ""}
      {keyword.label}
    </button>
  );
}