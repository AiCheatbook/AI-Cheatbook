"use client";

import type { ToggleableFieldKey } from "@/lib/cms/fieldVisibility";

type ToggleableFieldProps = {
  id: ToggleableFieldKey;
  disabled: boolean;
  onToggle: (id: ToggleableFieldKey) => void;
  children: React.ReactNode;
  className?: string;
};

/*
 * Wraps one optional field or section with a small on/off switch
 * pinned to its top-right corner. Flipping it off dims the block
 * and disables its inputs (via a native <fieldset disabled>) so
 * it's out of the way while filling in the rest of the form —
 * nothing inside is cleared, and it can be turned back on any
 * time. Title/Slug/Prompt actions never get wrapped in this —
 * they're always required.
 */
export default function ToggleableField({
  id,
  disabled,
  onToggle,
  children,
  className = "",
}: ToggleableFieldProps) {
  return (
    <div
      className={`relative rounded-xl transition ${
        disabled ? "opacity-40" : ""
      } ${className}`}
    >
      <button
        type="button"
        onClick={() => onToggle(id)}
        aria-pressed={!disabled}
        title={
          disabled
            ? "Turn this field back on"
            : "Dim this field — nothing is lost, just out of the way"
        }
        className={`absolute -top-2 right-0 z-10 flex h-5 w-9 shrink-0 items-center rounded-full border transition ${
          disabled
            ? "border-zinc-300 bg-zinc-200"
            : "border-brand bg-brand"
        }`}
      >
        <span
          className={`h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${
            disabled ? "translate-x-0.5" : "translate-x-4"
          }`}
        />
      </button>

      <fieldset
        disabled={disabled}
        className={disabled ? "pointer-events-none" : ""}
      >
        {children}
      </fieldset>
    </div>
  );
}
