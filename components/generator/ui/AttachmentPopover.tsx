"use client";

import { useState } from "react";
import type { AttachmentRole } from "../aiProvider";

export type ComposerAttachment = {
  id: string;
  base64: string;
  mimeType: string;
  role: AttachmentRole;
  preview: string;
};

export type AttachmentMode =
  | "none"
  | "upload"
  | "one-later"
  | "multiple-later";

type AttachmentPopoverProps = {
  attachments: ComposerAttachment[];
  onAdd: (
    attachment: ComposerAttachment
  ) => void;
  onRemove: (id: string) => void;
  promptType: string;
  mode: AttachmentMode;
  onModeChange: (
    mode: AttachmentMode
  ) => void;
};

const ROLE_OPTIONS: {
  value: AttachmentRole;
  label: string;
}[] = [
  { value: "character", label: "Character" },
  { value: "face", label: "Face" },
  { value: "clothing", label: "Clothing" },
  { value: "pose", label: "Pose" },
  {
    value: "environment",
    label: "Environment",
  },
  { value: "product", label: "Product" },
  {
    value: "composition",
    label: "Composition",
  },
  { value: "style", label: "Style" },
  { value: "lighting", label: "Lighting" },
  { value: "other", label: "Other" },
];

const MAX_ATTACHMENTS = 5;

export default function AttachmentPopover({
  attachments,
  onAdd,
  onRemove,
  mode,
  onModeChange,
}: AttachmentPopoverProps) {
  const [open, setOpen] = useState(false);
  const [pendingRole, setPendingRole] =
    useState<AttachmentRole>("character");
  const [error, setError] = useState("");

  function handleFile(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    setError("");

    if (
      attachments.length >=
      MAX_ATTACHMENTS
    ) {
      setError(
        `You can attach up to ${MAX_ATTACHMENTS} images.`
      );
      return;
    }

    if (file.size > 4 * 1024 * 1024) {
      setError(
        "Image is too large. Please use one under 4MB."
      );
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      const result =
        reader.result as string;
      const base64 = result.split(
        ","
      )[1];

      onAdd({
        id: crypto.randomUUID(),
        base64,
        mimeType: file.type,
        role: pendingRole,
        preview: result,
      });
    };

    reader.readAsDataURL(file);
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`flex h-9 min-w-9 items-center justify-center rounded-full border px-2 text-lg transition ${
          attachments.length > 0 ||
          mode !== "none"
            ? "border-brand bg-brand/10 text-brand"
            : "border-zinc-300 text-zinc-400 hover:border-zinc-500 hover:text-zinc-900"
        }`}
        aria-label="Add attachment"
      >
        {attachments.length > 0
          ? attachments.length
          : mode === "one-later"
            ? "1"
            : mode === "multiple-later"
              ? "N"
              : "+"}
      </button>

      {open && (
        <div className="absolute bottom-12 left-0 z-30 w-72 rounded-xl border border-zinc-200 bg-white p-3 shadow-xl">
          <p className="text-xs font-medium text-zinc-400">
            Reference images
          </p>

          <div className="mt-2 flex flex-wrap gap-1.5">
            {(
              [
                { value: "none", label: "None" },
                { value: "upload", label: "Upload now" },
                { value: "one-later", label: "1 image later" },
                { value: "multiple-later", label: "Multiple later" },
              ] as const
            ).map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => onModeChange(option.value)}
                className={`rounded-full border px-2.5 py-1 text-xs transition ${
                  mode === option.value
                    ? "border-brand bg-brand/10 text-brand"
                    : "border-zinc-300 text-zinc-400 hover:border-zinc-500"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          {mode === "upload" && (
            <>
              <select
                value={pendingRole}
                onChange={(e) =>
                  setPendingRole(
                    e.target.value as AttachmentRole
                  )
                }
                className="mt-3 w-full rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-xs text-zinc-900 outline-none"
              >
                {ROLE_OPTIONS.map((role) => (
                  <option key={role.value} value={role.value}>
                    Reference for: {role.label}
                  </option>
                ))}
              </select>

              <label className="mt-2 block cursor-pointer rounded-lg border border-dashed border-zinc-300 px-3 py-2 text-center text-xs text-zinc-400 hover:border-brand hover:text-brand">
                Choose image...
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleFile}
                  className="sr-only"
                />
              </label>
            </>
          )}

          {error && (
            <p className="mt-2 text-xs text-red-400">
              {error}
            </p>
          )}

          {attachments.length > 0 && (
            <div className="mt-3 space-y-1.5 border-t border-zinc-200 pt-2">
              {attachments.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center justify-between gap-2"
                >
                  <div className="flex items-center gap-2 overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={a.preview}
                      alt=""
                      className="h-6 w-6 shrink-0 rounded object-cover"
                    />
                    <span className="truncate text-xs text-zinc-400">
                      {
                        ROLE_OPTIONS.find(
                          (r) =>
                            r.value ===
                            a.role
                        )?.label
                      }
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      onRemove(a.id)
                    }
                    className="shrink-0 text-xs text-zinc-400 hover:text-red-400"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={() => setOpen(false)}
            className="mt-3 w-full rounded-lg bg-zinc-100 py-1.5 text-xs font-medium text-zinc-900 hover:bg-zinc-200"
          >
            Done
          </button>
        </div>
      )}
    </div>
  );
}
