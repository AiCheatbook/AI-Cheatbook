"use client";

type ContentTypeFilterProps = {
  value: string;
  onChange: (value: string) => void;
};

const TYPES = [
  { value: "all", label: "All" },
  { value: "question", label: "Questions" },
  {
    value: "discussion",
    label: "Discussions",
  },
  { value: "poll", label: "Polls" },
  { value: "prompt", label: "Prompts" },
  {
    value: "learning",
    label: "Learning",
  },
  {
    value: "resource",
    label: "Resources",
  },
  { value: "discovery", label: "Discoveries" },
];

export default function ContentTypeFilter({
  value,
  onChange,
}: ContentTypeFilterProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {TYPES.map((type) => (
        <button
          key={type.value}
          type="button"
          onClick={() =>
            onChange(type.value)
          }
          className={`rounded-full border px-4 py-1.5 text-sm transition ${
            value === type.value
              ? "border-brand bg-brand text-zinc-900"
              : "border-zinc-300 text-zinc-400 hover:border-zinc-500 hover:text-zinc-900"
          }`}
        >
          {type.label}
        </button>
      ))}
    </div>
  );
}
