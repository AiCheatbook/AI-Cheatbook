"use client";

import { useEffect, useState } from "react";
import { supabaseAuthClient as supabase } from "@/lib/supabase/auth-client";

type Keyword = {
  id: string;
  label: string;
  category: string | null;
  parent_id: string | null;
  placement: "inline" | "global" | "both";
};

export default function AdminKeywordsPage() {
  const [keywords, setKeywords] = useState<
    Keyword[]
  >([]);
  const [loading, setLoading] =
    useState(true);
  const [error, setError] = useState("");
  const [savingId, setSavingId] = useState<
    string | null
  >(null);

  async function loadKeywords() {
    setLoading(true);
    setError("");

    const { data, error } = await supabase
      .from("library_keywords")
      .select(
        "id, label, category, parent_id, placement"
      )
      .order("label", {
        ascending: true,
      });

    if (error) {
      setError(error.message);
    } else {
      setKeywords(
        (data || []) as Keyword[]
      );
    }

    setLoading(false);
  }

  useEffect(() => {
    loadKeywords();
  }, []);

  async function handleSetParent(
    keywordId: string,
    parentId: string
  ) {
    setSavingId(keywordId);

    const { error } = await supabase
      .from("library_keywords")
      .update({
        parent_id: parentId || null,
      })
      .eq("id", keywordId);

    if (!error) {
      setKeywords((current) =>
        current.map((k) =>
          k.id === keywordId
            ? {
                ...k,
                parent_id:
                  parentId || null,
              }
            : k
        )
      );
    }

    setSavingId(null);
  }

  async function handleSetPlacement(
    keywordId: string,
    placement: "inline" | "global" | "both"
  ) {
    setSavingId(keywordId);

    const { error } = await supabase
      .from("library_keywords")
      .update({ placement })
      .eq("id", keywordId);

    if (!error) {
      setKeywords((current) =>
        current.map((k) =>
          k.id === keywordId
            ? { ...k, placement }
            : k
        )
      );
    }

    setSavingId(null);
  }

  const topLevel = keywords.filter(
    (k) => !k.parent_id
  );

  function childrenOf(
    parentId: string
  ): Keyword[] {
    return keywords.filter(
      (k) => k.parent_id === parentId
    );
  }

  function renderTree(
    parent: Keyword,
    depth: number
  ): React.ReactNode {
    const children = childrenOf(
      parent.id
    );

    return (
      <div key={parent.id}>
        <div
          className="flex items-center justify-between gap-3 border-b border-zinc-200 py-2"
          style={{
            paddingLeft: depth * 24,
          }}
        >
          <div className="min-w-0">
            <span className="text-sm text-zinc-900">
              {parent.label}
            </span>
            {parent.category && (
              <span className="ml-2 text-xs text-zinc-400">
                {parent.category}
              </span>
            )}
          </div>

          <select
            value={
              parent.parent_id || ""
            }
            disabled={
              savingId === parent.id
            }
            onChange={(e) =>
              handleSetParent(
                parent.id,
                e.target.value
              )
            }
            className="shrink-0 rounded-lg border border-zinc-200 bg-white px-2 py-1 text-xs text-zinc-900 outline-none"
          >
            <option value="">
              (top level)
            </option>
            {keywords
              .filter(
                (k) =>
                  k.id !== parent.id
              )
              .map((k) => (
                <option
                  key={k.id}
                  value={k.id}
                >
                  {k.label}
                </option>
              ))}
          </select>

          <button
            type="button"
            disabled={
              savingId === parent.id
            }
            onClick={() =>
              handleSetPlacement(
                parent.id,
                parent.placement ===
                  "inline"
                  ? "global"
                  : parent.placement ===
                      "global"
                    ? "both"
                    : "inline"
              )
            }
            title="Inline: inserted directly into the sentence (e.g. camera/shot). Global: appears in the 'Global Keywords' box, applied to the whole prompt. Both: usable either way."
            className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium transition ${
              parent.placement ===
              "inline"
                ? "bg-brand/15 text-brand"
                : parent.placement ===
                    "global"
                  ? "bg-zinc-100 text-zinc-400"
                  : "bg-blue-500/15 text-blue-400"
            }`}
          >
            {parent.placement ===
            "inline"
              ? "Inline"
              : parent.placement ===
                  "global"
                ? "Global"
                : "Both"}
          </button>
        </div>

        {children.map((child) =>
          renderTree(child, depth + 1)
        )}
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-white px-6 py-10 text-zinc-900">
      <div className="mx-auto max-w-3xl">
        <p className="text-sm font-semibold uppercase tracking-wider text-brand">
          Admin
        </p>

        <h1 className="mt-1 text-3xl font-bold">
          Keyword Hierarchy
        </h1>

        <p className="mt-2 text-zinc-400">
          Organize keywords into a tree
          (e.g. Camera → Camera Movement →
          Dolly Shot) by picking a parent
          for each one. Click the badge to
          cycle through where each keyword
          can appear in the Prompt
          Composer:{" "}
          <span className="text-brand">
            Inline
          </span>{" "}
          (inserted directly into the
          sentence — camera/shot
          instructions),{" "}
          <span className="text-zinc-400">
            Global
          </span>{" "}
          (shown in the &quot;Global
          Keywords&quot; box, applied to
          the whole prompt — style/mood
          qualities), or{" "}
          <span className="text-blue-400">
            Both
          </span>{" "}
          (usable either way — the default
          for new keywords).
        </p>

        {error && (
          <div className="mt-6 rounded-xl border border-red-900/50 bg-white p-4">
            <p className="text-sm text-red-400">
              {error}
            </p>
          </div>
        )}

        {loading && (
          <div className="mt-6 h-64 animate-pulse rounded-2xl bg-white" />
        )}

        {!loading &&
          !error &&
          keywords.length === 0 && (
            <p className="mt-8 text-center text-zinc-400">
              No keywords yet.
            </p>
          )}

        {!loading &&
          !error &&
          keywords.length > 0 && (
            <div className="mt-6 rounded-2xl border border-zinc-200 bg-white p-4">
              {topLevel.map((keyword) =>
                renderTree(keyword, 0)
              )}
            </div>
          )}
      </div>
    </main>
  );
}
