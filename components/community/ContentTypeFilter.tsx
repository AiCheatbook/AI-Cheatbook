"use client";

type ContentTypeFilterProps = {
  value: string;
  onChange: (value: string) => void;
};

const TYPES = [
  { value: "all", label: "All" },
  { value: "news", label: "News" },
  { value: "learning_card", label: "Learning" },
  { value: "question", label: "Questions" },
  { value: "poll", label: "Polls" },
  { value: "prompt", label: "Prompts" },
  { value: "work", label: "Shared by Community" },
];

export default function ContentTypeFilter({
  value,
  onChange,
}: ContentTypeFilterProps) {
  return (
    <div className="flex min-w-0 gap-2 overflow-x-auto [scrollbar-width:none] sm:flex-wrap">
      {TYPES.map((type) => (
        <button
          key={type.value}
          type="button"
          onClick={() =>
            onChange(type.value)
          }
          className={`shrink-0 rounded-full border px-4 py-2 text-[15px] transition ${
            value === type.value
              ? "border-zinc-500 bg-zinc-500 text-white"
              : "border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
          }`}
        >
          {type.label}
        </button>
      ))}
    </div>
  );
}
