"use client";

import {
  TOGGLEABLE_FIELDS,
  type ToggleableFieldKey,
} from "@/lib/cms/fieldVisibility";

type FieldVisibilityBarProps = {
  disabledFields: string[];
  onToggle: (id: ToggleableFieldKey) => void;
  onSetAll: (disabledFields: string[]) => void;
};

/*
 * A one-glance control panel above the form: every optional
 * field/section as a small pill, so a moderator can dim or
 * restore several at once instead of hunting for each field's
 * own switch further down the page. "Dim all" / "Show all" cover
 * the common case of a moderator who only fills in a handful of
 * fields for most prompts.
 */
export default function FieldVisibilityBar({
  disabledFields,
  onToggle,
  onSetAll,
}: FieldVisibilityBarProps) {
  const allDisabled = TOGGLEABLE_FIELDS.every((f) =>
    disabledFields.includes(f.key)
  );

  return (
    <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-zinc-900">
          Field visibility
        </p>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onSetAll([])}
            className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-600 transition hover:border-brand/50 hover:text-brand-text"
          >
            Show all
          </button>
          <button
            type="button"
            onClick={() =>
              onSetAll(TOGGLEABLE_FIELDS.map((f) => f.key))
            }
            className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-600 transition hover:border-brand/50 hover:text-brand-text"
          >
            Dim all
          </button>
        </div>
      </div>

      <p className="mt-1 text-xs text-zinc-600">
        Dim the fields you don&apos;t need for this prompt — they stay
        saved, just out of the way while you fill in the rest.
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        {TOGGLEABLE_FIELDS.map((field) => {
          const disabled = disabledFields.includes(field.key);

          return (
            <button
              key={field.key}
              type="button"
              onClick={() => onToggle(field.key)}
              aria-pressed={!disabled}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                disabled
                  ? "border-zinc-200 bg-white text-zinc-400 line-through decoration-zinc-300"
                  : "border-brand bg-brand/15 text-brand-text"
              }`}
            >
              {field.label}
            </button>
          );
        })}
      </div>

      {allDisabled && (
        <p className="mt-2 text-xs text-amber-600">
          Every optional field is dimmed — Title, Slug and Prompt
          Content are still always shown.
        </p>
      )}
    </div>
  );
}
