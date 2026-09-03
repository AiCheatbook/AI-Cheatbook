"use client";

import { useEffect, useState } from "react";

/*
 * Shared rotation logic for the Poll Section and
 * Question Section widgets.
 *
 * Behavior (per spec):
 * - Each item shows for up to `intervalMs` (default 5 min).
 * - On timeout or explicit skip, we just move to the next
 *   item in the list — the skipped/timed-out item is NOT
 *   removed, so it can come back around next cycle.
 * - When the user actually answers (votes / replies), the
 *   caller removes that item from `items` (parent re-fetches
 *   or filters it out) — that's the only thing that
 *   permanently drops an item. Since we index with modulo,
 *   the list shrinking never produces an out-of-range index.
 * - When `items` becomes empty, `current` is null — the
 *   caller renders nothing, which collapses the section and
 *   lets everything below it shift up naturally (no fixed
 *   height reserved).
 */

const DEFAULT_INTERVAL_MS = 5 * 60 * 1000;

export function useRotatingContent<T extends { id: string }>(
  items: T[],
  intervalMs: number = DEFAULT_INTERVAL_MS
) {
  const [index, setIndex] = useState(0);

  const current = items.length > 0 ? items[index % items.length] : null;

  function advance() {
    setIndex((i) => i + 1);
  }

  // Auto-advance timer — resets whenever the visible item changes.
  useEffect(() => {
    if (!current) return;

    const timer = setTimeout(() => {
      advance();
    }, intervalMs);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id, intervalMs]);

  return { current, skip: advance, advance };
}
