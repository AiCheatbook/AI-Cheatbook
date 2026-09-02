"use client";

import { useState } from "react";
import PromptComposer from "./PromptComposer";

/*
 * The Mini/Quick Generator — a compact
 * floating panel that renders the EXACT
 * SAME PromptComposer as the full /generator
 * page, just inside a smaller container.
 *
 * This guarantees real feature parity, not
 * just similar features: there is only one
 * generator implementation in the whole
 * codebase, so Main and Mini can never
 * silently drift apart again.
 */

export default function MiniGenerator() {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-brand text-2xl text-zinc-900 shadow-lg shadow-brand/30 transition hover:bg-brand-dark"
        aria-label="Open Quick Prompt Builder"
      >
        ✨
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-40 w-[92vw] max-w-md rounded-2xl border border-zinc-200 bg-white shadow-2xl sm:w-[26rem]">
      <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3">
        <h2 className="text-sm font-semibold text-zinc-900">
          Quick Prompt Builder
        </h2>

        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Close"
          className="text-zinc-600 hover:text-zinc-900"
        >
          ✕
        </button>
      </div>

      <div className="max-h-[75vh] overflow-y-auto p-4">
        <PromptComposer compact />
      </div>
    </div>
  );
}
