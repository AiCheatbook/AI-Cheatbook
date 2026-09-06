"use client";

import { useEffect, useState } from "react";
import { supabaseAuthClient as supabase } from "@/lib/supabase/auth-client";
import { findOrCreateKeywords, type KeywordRow } from "@/lib/cms/keywordLibrary";

type ConceptKeywordPickerProps = {
  conceptId: string | null;
  value: KeywordRow[];
  onChange: (next: KeywordRow[]) => void;
};

/*
 * Once a Prompt is assigned to a Concept, this shows every
 * keyword already attached to that Concept as a checklist —
 * matching the spec's exact mock — rather than a flat
 * type-ahead search across every keyword in the whole library
 * (that's what KeywordTagInput is for, and it stays untouched;
 * this is a genuinely different interaction for a genuinely
 * different, now concept-scoped, use case).
 *
 * Creating a brand-new keyword here sets its concept_id to the
 * current Concept immediately — it becomes part of that
 * Concept's canonical keyword set for every future Prompt
 * assigned to it, not just this one.
 */
export default function ConceptKeywordPicker({
  conceptId,
  value,
  onChange,
}: ConceptKeywordPickerProps) {
  const [conceptKeywords, setConceptKeywords] = useState<KeywordRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [newKeywordLabel, setNewKeywordLabel] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      if (!conceptId) {
        setConceptKeywords([]);
        return;
      }

      setLoading(true);

      const { data, error: err } = await supabase
        .from("library_keywords")
        .select("id, label")
        .eq("concept_id", conceptId)
        .order("label", { ascending: true });

      if (err) {
        console.error(
          "ConceptKeywordPicker: failed to load keywords:",
          err.message
        );
      }

      setConceptKeywords(data || []);
      setLoading(false);
    }

    load();
  }, [conceptId]);

  function isSelected(id: string) {
    return value.some((k) => k.id === id);
  }

  function toggle(keyword: KeywordRow) {
    if (isSelected(keyword.id)) {
      onChange(value.filter((k) => k.id !== keyword.id));
    } else {
      onChange([...value, keyword]);
    }
  }

  async function createKeyword() {
    const rawLabels = newKeywordLabel
      .split(",")
      .map((l) => l.trim())
      .filter(Boolean);

    if (rawLabels.length === 0 || !conceptId) return;

    setCreating(true);
    setError("");

    try {
      const created = await findOrCreateKeywords(rawLabels, {
        conceptId,
      });

      // Only genuinely-new-to-this-list keywords need adding to
      // the concept's own display set — a reused existing keyword
      // from elsewhere in the library might not have belonged to
      // this concept before, so still surface it here too.
      const newToThisConcept = created.filter(
        (k) => !conceptKeywords.some((existing) => existing.id === k.id)
      );

      setConceptKeywords((prev) => [...prev, ...newToThisConcept]);

      const newToSelection = created.filter(
        (k) => !value.some((existing) => existing.id === k.id)
      );
      onChange([...value, ...newToSelection]);

      setNewKeywordLabel("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create keyword.");
    }

    setCreating(false);
  }

  async function deleteKeyword(keyword: KeywordRow) {
    if (
      !confirm(
        `Delete "${keyword.label}"? This removes it everywhere it's used, not just from this prompt.`
      )
    ) {
      return;
    }

    setError("");

    const { error: err } = await supabase
      .from("library_keywords")
      .delete()
      .eq("id", keyword.id);

    if (err) {
      setError(
        err.code === "23503"
          ? `Couldn't delete "${keyword.label}" — it's still linked to something that requires it.`
          : err.message
      );
      return;
    }

    setConceptKeywords((prev) => prev.filter((k) => k.id !== keyword.id));
    onChange(value.filter((k) => k.id !== keyword.id));
  }

  if (!conceptId) {
    return (
      <p className="text-sm text-zinc-500">
        Assign a Concept above to see and pick its keywords.
      </p>
    );
  }

  return (
    <div>
      <p className="text-xs text-zinc-600">Existing keywords for this Concept:</p>

      {loading ? (
        <p className="mt-2 text-xs text-zinc-400">Loading...</p>
      ) : conceptKeywords.length === 0 ? (
        <p className="mt-2 text-xs text-zinc-400">
          No keywords yet for this Concept — add the first one below.
        </p>
      ) : (
        <div className="mt-2 flex flex-wrap gap-2">
          {conceptKeywords.map((k) => (
            <div
              key={k.id}
              className="flex items-center gap-1.5 rounded-full border border-zinc-200 px-3 py-1.5 text-xs has-[input:checked]:border-brand has-[input:checked]:bg-brand/10 has-[input:checked]:text-brand-text"
            >
              <label className="flex cursor-pointer items-center gap-1.5">
                <input
                  type="checkbox"
                  checked={isSelected(k.id)}
                  onChange={() => toggle(k)}
                  className="sr-only"
                />
                {k.label}
              </label>
              <button
                type="button"
                onClick={() => deleteKeyword(k)}
                title="Delete this keyword everywhere"
                className="text-zinc-400 hover:text-red-500"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="mt-3 flex gap-2">
        <input
          value={newKeywordLabel}
          onChange={(e) => setNewKeywordLabel(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              createKeyword();
            }
          }}
          placeholder="+ Create New Keyword (comma-separate to add several at once)"
          className="flex-1 rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-brand"
        />
        <button
          type="button"
          disabled={creating || !newKeywordLabel.trim()}
          onClick={createKeyword}
          className="rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-zinc-900 disabled:opacity-50"
        >
          Add
        </button>
      </div>

      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
