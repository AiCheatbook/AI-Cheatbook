"use client";

import { useState } from "react";
import MiniPromptGenerator from "./MiniPromptGenerator";

/*
 * The Mini/Quick Generator — a genuinely
 * lighter, separate experience from the full
 * /generator page, per spec: no dynamic
 * keyword search/selector, just whatever was
 * already picked while Browsing the
 * Promptbook. This is a static import (not
 * lazy-loaded like the old PromptComposer-
 * reusing version) because MiniPromptGenerator
 * doesn't include TipTap or any other heavy
 * dependency — it's small enough that lazy-
 * loading would add more overhead (an extra
 * network round-trip + loading flash) than it
 * saves.
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

      <div className="max-h-[75vh] overflow-y-auto">
        <MiniPromptGenerator />
      </div>
    </div>
  );
}
