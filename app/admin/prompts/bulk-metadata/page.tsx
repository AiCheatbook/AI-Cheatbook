"use client";

import Link from "next/link";
import { useState } from "react";
import { supabaseAuthClient as supabase } from "@/lib/supabase/auth-client";

type Row = {
  id: string;
  title: string;
  description: string | null;
  media_url: string | null;
  meta_title: string | null;
  meta_description: string | null;
  og_title: string | null;
  og_description: string | null;
  og_image_url: string | null;
};

type Mode = "missing" | "regenerate-all";

const BATCH_SIZE = 10;

export default function BulkMetadataPage() {
  const [mode, setMode] = useState<Mode>("missing");
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(0);
  const [total, setTotal] = useState(0);
  const [successCount, setSuccessCount] = useState(0);
  const [failCount, setFailCount] = useState(0);
  const [finished, setFinished] = useState(false);
  const [error, setError] = useState("");

  async function run(selectedMode: Mode) {
    if (selectedMode === "regenerate-all") {
      const confirmed = confirm(
        "This regenerates SEO/metadata for every published prompt, overwriting anything already set. This can't be undone. Continue?"
      );
      if (!confirmed) return;
    }

    setRunning(true);
    setFinished(false);
    setError("");
    setDone(0);
    setSuccessCount(0);
    setFailCount(0);

    let query = supabase
      .from("library_items")
      .select(
        "id, title, description, media_url, meta_title, meta_description, og_title, og_description, og_image_url"
      );

    if (selectedMode === "missing") {
      query = query.or(
        "meta_title.is.null,meta_description.is.null,og_title.is.null,og_description.is.null,og_image_url.is.null"
      );
    }

    const { data, error: fetchError } = await query;

    if (fetchError) {
      setError(fetchError.message);
      setRunning(false);
      return;
    }

    const rows = (data || []) as Row[];
    setTotal(rows.length);

    if (rows.length === 0) {
      setFinished(true);
      setRunning(false);
      return;
    }

    let successes = 0;
    let failures = 0;

    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE);

      const results = await Promise.all(
        batch.map(async (row) => {
          // Exactly the same fill logic as the individual prompt's
          // Auto Fill button (components/cms/SeoPanel.tsx
          // handleAutoFill): each field keeps whatever it already
          // has unless it's empty — or, in "regenerate all" mode,
          // is always replaced with the prompt's own content.
          const metaTitle =
            selectedMode === "regenerate-all"
              ? row.title || ""
              : row.meta_title || row.title || "";
          const metaDescription =
            selectedMode === "regenerate-all"
              ? row.description || ""
              : row.meta_description || row.description || "";
          const ogTitle =
            selectedMode === "regenerate-all"
              ? row.title || ""
              : row.og_title || row.title || "";
          const ogDescription =
            selectedMode === "regenerate-all"
              ? row.description || ""
              : row.og_description || row.description || "";
          const ogImageUrl =
            selectedMode === "regenerate-all"
              ? row.media_url || ""
              : row.og_image_url || row.media_url || "";

          const { error: updateError } = await supabase
            .from("library_items")
            .update({
              meta_title: metaTitle || null,
              meta_description: metaDescription || null,
              og_title: ogTitle || null,
              og_description: ogDescription || null,
              og_image_url: ogImageUrl || null,
            })
            .eq("id", row.id);

          return !updateError;
        })
      );

      successes += results.filter(Boolean).length;
      failures += results.filter((ok) => !ok).length;

      setDone(Math.min(i + BATCH_SIZE, rows.length));
      setSuccessCount(successes);
      setFailCount(failures);
    }

    setFinished(true);
    setRunning(false);
  }

  return (
    <main className="min-h-screen bg-white px-6 py-10 text-zinc-900">
      <div className="mx-auto max-w-2xl">
        <Link
          href="/admin/prompts"
          className="text-sm text-zinc-600 hover:text-zinc-900"
        >
          ← Back to Prompt Library
        </Link>

        <h1 className="mt-2 text-2xl font-bold">Bulk Metadata</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Fills SEO title, description, and social preview fields from each
          prompt&apos;s own title, description, and media — the same logic
          as the &quot;Auto-fill&quot; button on an individual prompt, applied
          across many at once.
        </p>

        {error && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        <div className="mt-6 space-y-3">
          <div className="rounded-2xl border border-zinc-200 bg-white p-4">
            <p className="text-sm font-semibold text-zinc-900">
              Auto Fill Missing Metadata
            </p>
            <p className="mt-1 text-xs text-zinc-600">
              Only fills fields that are currently empty. Never overwrites
              anything already set.
            </p>
            <button
              type="button"
              disabled={running}
              onClick={() => {
                setMode("missing");
                run("missing");
              }}
              className="mt-3 rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-zinc-900 disabled:opacity-50"
            >
              Run
            </button>
          </div>

          <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
            <p className="text-sm font-semibold text-zinc-900">
              Regenerate All Metadata
            </p>
            <p className="mt-1 text-xs text-zinc-600">
              Overwrites SEO/metadata for every published prompt, even ones
              that already have it set. Requires confirmation.
            </p>
            <button
              type="button"
              disabled={running}
              onClick={() => {
                setMode("regenerate-all");
                run("regenerate-all");
              }}
              className="mt-3 rounded-xl border border-red-300 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-100 disabled:opacity-50"
            >
              Regenerate All
            </button>
          </div>
        </div>

        {(running || finished) && (
          <div className="mt-6 rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
            {running && (
              <>
                <p className="text-sm text-zinc-700">
                  {mode === "regenerate-all"
                    ? "Regenerating"
                    : "Generating"}{" "}
                  metadata... {done} / {total}
                </p>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-zinc-200">
                  <div
                    className="h-full bg-brand transition-all"
                    style={{
                      width: `${total ? (done / total) * 100 : 0}%`,
                    }}
                  />
                </div>
              </>
            )}

            {finished && (
              <p className="text-sm text-zinc-700">
                {total === 0
                  ? "Nothing to do — every prompt already has complete metadata."
                  : `Done. ${successCount} updated${
                      failCount > 0 ? `, ${failCount} failed` : ""
                    }.`}
              </p>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
