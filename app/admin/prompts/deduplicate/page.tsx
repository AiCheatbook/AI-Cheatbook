"use client";

import Link from "next/link";
import { useState } from "react";
import { supabaseAuthClient as supabase } from "@/lib/supabase/auth-client";

type Row = {
  id: string;
  title: string;
  slug: string;
  created_at: string;
  media_url: string | null;
  meta_title: string | null;
  concept_id: string | null;
};

type DuplicateGroup = {
  normalizedTitle: string;
  members: Row[];
  canonical: Row;
  duplicates: Row[];
};

type GroupStatus = "pending" | "merging" | "done" | "error";

function normalize(title: string): string {
  return title.toLowerCase().trim().replace(/\s+/g, " ");
}

/*
 * Picks which row in a duplicate group survives. Prefers the
 * one with the most useful data already filled in (has media,
 * has SEO title, has a taxonomy Concept assigned) so a merge
 * doesn't accidentally keep the least-complete copy; ties break
 * on whichever was created first.
 */
function pickCanonical(members: Row[]): Row {
  return [...members].sort((a, b) => {
    const score = (r: Row) =>
      (r.media_url ? 1 : 0) + (r.meta_title ? 1 : 0) + (r.concept_id ? 1 : 0);
    const scoreDiff = score(b) - score(a);
    if (scoreDiff !== 0) return scoreDiff;
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  })[0];
}

export default function DeduplicatePromptsPage() {
  const [scanning, setScanning] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [groups, setGroups] = useState<DuplicateGroup[]>([]);
  const [statuses, setStatuses] = useState<Record<string, GroupStatus>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [merging, setMerging] = useState(false);

  async function scan() {
    setScanning(true);
    setScanned(false);

    const { data, error } = await supabase
      .from("library_items")
      .select("id, title, slug, created_at, media_url, meta_title, concept_id");

    if (error) {
      alert(`Failed to load prompts: ${error.message}`);
      setScanning(false);
      return;
    }

    const rows = (data || []) as Row[];
    const byTitle = new Map<string, Row[]>();

    for (const row of rows) {
      const key = normalize(row.title);
      const existing = byTitle.get(key) || [];
      existing.push(row);
      byTitle.set(key, existing);
    }

    const duplicateGroups: DuplicateGroup[] = [];
    for (const [normalizedTitle, members] of byTitle) {
      if (members.length < 2) continue;
      const canonical = pickCanonical(members);
      const duplicates = members.filter((m) => m.id !== canonical.id);
      duplicateGroups.push({ normalizedTitle, members, canonical, duplicates });
    }

    duplicateGroups.sort((a, b) => a.normalizedTitle.localeCompare(b.normalizedTitle));

    setGroups(duplicateGroups);
    setScanning(false);
    setScanned(true);
  }

  async function mergeGroup(group: DuplicateGroup) {
    const canonicalId = group.canonical.id;
    const duplicateIds = group.duplicates.map((d) => d.id);

    // Keywords: for each duplicate's keyword links, drop any
    // that the canonical already has (would violate uniqueness),
    // then re-point the rest onto the canonical prompt.
    const { data: dupKeywordLinks } = await supabase
      .from("library_item_keywords")
      .select("id, keyword_id, library_item_id")
      .in("library_item_id", duplicateIds);

    const { data: canonicalKeywordLinks } = await supabase
      .from("library_item_keywords")
      .select("keyword_id")
      .eq("library_item_id", canonicalId);

    const canonicalKeywordIds = new Set(
      (canonicalKeywordLinks || []).map((l) => l.keyword_id)
    );

    for (const link of dupKeywordLinks || []) {
      if (canonicalKeywordIds.has(link.keyword_id)) {
        await supabase.from("library_item_keywords").delete().eq("id", link.id);
      } else {
        await supabase
          .from("library_item_keywords")
          .update({ library_item_id: canonicalId })
          .eq("id", link.id);
        canonicalKeywordIds.add(link.keyword_id);
      }
    }

    // Ratings: one rating per (library_item_id, user_id). Drop a
    // duplicate's rating if that user already rated the canonical
    // prompt; otherwise re-point it.
    const { data: dupRatings } = await supabase
      .from("prompt_ratings")
      .select("id, user_id, library_item_id")
      .in("library_item_id", duplicateIds);

    const { data: canonicalRatings } = await supabase
      .from("prompt_ratings")
      .select("user_id")
      .eq("library_item_id", canonicalId);

    const canonicalRaterIds = new Set((canonicalRatings || []).map((r) => r.user_id));

    for (const rating of dupRatings || []) {
      if (canonicalRaterIds.has(rating.user_id)) {
        await supabase.from("prompt_ratings").delete().eq("id", rating.id);
      } else {
        await supabase
          .from("prompt_ratings")
          .update({ library_item_id: canonicalId })
          .eq("id", rating.id);
        canonicalRaterIds.add(rating.user_id);
      }
    }

    // Comments: no uniqueness constraint — safe to just re-point
    // every duplicate's comments onto the canonical prompt.
    await supabase
      .from("comments")
      .update({ content_id: canonicalId })
      .eq("content_type", "prompt")
      .in("content_id", duplicateIds);

    // Finally, remove the duplicate prompt rows themselves.
    const { error: deleteError } = await supabase
      .from("library_items")
      .delete()
      .in("id", duplicateIds);

    if (deleteError) {
      throw new Error(deleteError.message);
    }
  }

  async function mergeAll() {
    setMerging(true);

    for (const group of groups) {
      setStatuses((prev) => ({ ...prev, [group.normalizedTitle]: "merging" }));

      try {
        await mergeGroup(group);
        setStatuses((prev) => ({ ...prev, [group.normalizedTitle]: "done" }));
      } catch (err) {
        setStatuses((prev) => ({ ...prev, [group.normalizedTitle]: "error" }));
        setErrors((prev) => ({
          ...prev,
          [group.normalizedTitle]: err instanceof Error ? err.message : "Failed",
        }));
      }
    }

    setMerging(false);
  }

  const totalDuplicateRows = groups.reduce((sum, g) => sum + g.duplicates.length, 0);
  const doneCount = Object.values(statuses).filter((s) => s === "done").length;

  return (
    <main className="min-h-screen bg-white px-6 py-10 text-zinc-900">
      <div className="mx-auto max-w-4xl">
        <Link
          href="/admin/prompts"
          className="text-sm text-zinc-600 hover:text-zinc-900"
        >
          ← Back to Prompt Library
        </Link>

        <h1 className="mt-2 text-2xl font-bold">Deduplicate Prompts</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Finds prompts with the exact same title (from an accidental repeat
          import, for example) and shows you exactly what would be merged
          before anything is deleted. For each duplicate found, the version
          with the most complete data (media, SEO, a Concept assigned) is
          kept — its keywords, ratings, and comments absorb whatever the
          removed duplicates had, nothing is silently lost.
        </p>

        <button
          type="button"
          disabled={scanning}
          onClick={scan}
          className="mt-6 rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-zinc-900 disabled:opacity-50"
        >
          {scanning ? "Scanning..." : "Scan for Duplicates"}
        </button>

        {scanned && groups.length === 0 && (
          <p className="mt-6 text-sm text-zinc-600">
            No duplicate titles found.
          </p>
        )}

        {scanned && groups.length > 0 && (
          <>
            <div className="mt-6 flex items-center justify-between">
              <p className="text-sm text-zinc-600">
                {groups.length} duplicate title
                {groups.length === 1 ? "" : "s"} found —{" "}
                {totalDuplicateRows} prompt{totalDuplicateRows === 1 ? "" : "s"}{" "}
                would be removed, keeping one of each.
                {merging || doneCount > 0
                  ? ` (${doneCount}/${groups.length} merged)`
                  : ""}
              </p>
              <button
                type="button"
                disabled={merging}
                onClick={() => {
                  if (
                    confirm(
                      `This will permanently remove ${totalDuplicateRows} duplicate prompt(s), keeping the most complete version of each. This can't be undone. Continue?`
                    )
                  ) {
                    mergeAll();
                  }
                }}
                className="rounded-xl border border-red-300 px-5 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
              >
                {merging ? "Merging..." : "Merge All Duplicates"}
              </button>
            </div>

            <div className="mt-4 space-y-4">
              {groups.map((group) => (
                <div
                  key={group.normalizedTitle}
                  className="rounded-2xl border border-zinc-200 bg-white p-4"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-zinc-900">
                      {group.canonical.title}
                    </p>
                    <span className="text-xs text-zinc-400">
                      {statuses[group.normalizedTitle] === "merging" && "Merging..."}
                      {statuses[group.normalizedTitle] === "done" && (
                        <span className="text-green-600">Merged</span>
                      )}
                      {statuses[group.normalizedTitle] === "error" && (
                        <span
                          className="text-red-600"
                          title={errors[group.normalizedTitle]}
                        >
                          Failed
                        </span>
                      )}
                    </span>
                  </div>

                  <div className="mt-2 space-y-1 text-xs">
                    <p className="text-green-700">
                      ✓ Keep: /{group.canonical.slug} (created{" "}
                      {new Date(group.canonical.created_at).toLocaleDateString()})
                    </p>
                    {group.duplicates.map((d) => (
                      <p key={d.id} className="text-zinc-500">
                        ✕ Remove: /{d.slug} (created{" "}
                        {new Date(d.created_at).toLocaleDateString()})
                      </p>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
