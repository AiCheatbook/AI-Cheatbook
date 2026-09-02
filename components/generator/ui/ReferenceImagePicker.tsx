"use client";

import type { ReferenceImageMode } from "../aiProvider";

type ReferenceImagePickerProps = {
  mode: ReferenceImageMode;
  onModeChange: (
    mode: ReferenceImageMode
  ) => void;
  preview: string | null;
  onFileSelected: (
    event: React.ChangeEvent<HTMLInputElement>
  ) => void;
  onClear: () => void;
  compact?: boolean;
};

const OPTIONS: {
  value: ReferenceImageMode;
  label: string;
}[] = [
  { value: "none", label: "None" },
  {
    value: "upload",
    label: "Upload now",
  },
  {
    value: "one-later",
    label: "1 image later",
  },
  {
    value: "multiple-later",
    label: "Multiple later",
  },
];

export default function ReferenceImagePicker({
  mode,
  onModeChange,
  preview,
  onFileSelected,
  onClear,
  compact = false,
}: ReferenceImagePickerProps) {
  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => {
              onModeChange(option.value);

              if (
                option.value !== "upload"
              ) {
                onClear();
              }
            }}
            className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition ${
              mode === option.value
                ? "border-brand bg-brand text-white"
                : "border-zinc-700 bg-black text-zinc-600 hover:border-brand hover:text-brand"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {mode === "upload" && (
        <div className="mt-3">
          {preview ? (
            <div className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={preview}
                alt="Reference"
                className={
                  compact
                    ? "h-14 w-14 rounded-lg object-cover"
                    : "h-24 w-24 rounded-xl object-cover"
                }
              />

              <button
                type="button"
                onClick={onClear}
                className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-white hover:bg-zinc-800"
              >
                Remove
              </button>
            </div>
          ) : (
            <label className="inline-block cursor-pointer rounded-xl border border-dashed border-zinc-700 px-4 py-2.5 text-xs text-zinc-600 hover:border-brand hover:text-brand">
              Choose an image...
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={onFileSelected}
                className="sr-only"
              />
            </label>
          )}
        </div>
      )}
    </div>
  );
}
