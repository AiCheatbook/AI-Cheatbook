"use client";

import { TYPE_OPTIONS, type PostType } from "./postTypeOptions";

type PostTypeQuickBarProps = {
  onSelect: (type: PostType) => void;
};

export default function PostTypeQuickBar({
  onSelect,
}: PostTypeQuickBarProps) {
  return (
    <section className="mt-6 rounded-2xl border border-zinc-200 bg-white p-5">
      <p className="text-sm font-semibold text-zinc-900">
        What do you want to share?
      </p>

      <div className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-8">
        {TYPE_OPTIONS.map((option) => {
          const Icon = option.icon;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onSelect(option.value)}
              className="flex flex-col items-center gap-2 rounded-xl border border-zinc-200 px-2 py-3 text-[11px] text-zinc-600 transition hover:border-brand hover:text-brand-text"
            >
              <span
                className={`flex h-10 w-10 items-center justify-center rounded-full ${option.color}`}
              >
                <Icon className="h-5 w-5" strokeWidth={2} />
              </span>
              {option.label}
            </button>
          );
        })}
      </div>
    </section>
  );
}
