"use client";

import Link from "next/link";
import { useState } from "react";
import { supabaseAuthClient as supabase } from "@/lib/supabase/auth-client";

type CategoryRow = {
  id: string;
  name: string;
  slug: string;
  subcategoryCount: number;
  conceptCount: number;
  promptCount: number;
};

export default function TaxonomyDiagnosticPage() {
  const [rows, setRows] = useState<CategoryRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [ran, setRan] = useState(false);

  async function runDiagnostic() {
    setLoading(true);
    setRan(false);

    const [categoriesRes, subcategoriesRes, conceptsRes, itemsRes] =
      await Promise.all([
        supabase.from("prompt_categories").select("id, name, slug"),
        supabase.from("prompt_subcategories").select("id, category_id"),
        supabase.from("prompt_concepts").select("id, subcategory_id"),
        supabase.from("library_items").select("id, concept_id"),
      ]);

    const categories = categoriesRes.data || [];
    const subcategories = subcategoriesRes.data || [];
    const concepts = conceptsRes.data || [];
    const items = itemsRes.data || [];

    const result: CategoryRow[] = categories.map((cat) => {
      const subIds = subcategories
        .filter((s) => s.category_id === cat.id)
        .map((s) => s.id);

      const conceptIds = concepts
        .filter((c) => subIds.includes(c.subcategory_id))
        .map((c) => c.id);

      const promptCount = items.filter(
        (i) => i.concept_id && conceptIds.includes(i.concept_id)
      ).length;

      return {
        id: cat.id,
        name: cat.name,
        slug: cat.slug,
        subcategoryCount: subIds.length,
        conceptCount: conceptIds.length,
        promptCount,
      };
    });

    result.sort((a, b) => a.name.localeCompare(b.name));

    setRows(result);
    setLoading(false);
    setRan(true);
  }

  // Group by name so duplicates (same name, different id) sit
  // next to each other and are impossible to miss.
  const nameCounts = rows.reduce<Record<string, number>>((acc, r) => {
    acc[r.name] = (acc[r.name] || 0) + 1;
    return acc;
  }, {});

  return (
    <main className="min-h-screen bg-white px-6 py-10 text-zinc-900">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/admin/prompts"
          className="text-sm text-zinc-600 hover:text-zinc-900"
        >
          ← Back to Prompt Library
        </Link>

        <h1 className="mt-2 text-2xl font-bold">Taxonomy Diagnostic</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Shows every Main Category and exactly how many prompts are
          actually linked to it. If the same name appears more than once
          below, that&apos;s two separate category records — the source of a
          filter finding zero results even though prompts under that name
          are visible elsewhere.
        </p>

        <button
          type="button"
          disabled={loading}
          onClick={runDiagnostic}
          className="mt-6 rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-zinc-900 disabled:opacity-50"
        >
          {loading ? "Checking..." : "Run Diagnostic"}
        </button>

        {ran && (
          <div className="mt-6 overflow-hidden rounded-2xl border border-zinc-200">
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-50 text-xs uppercase text-zinc-500">
                <tr>
                  <th className="px-3 py-2">Category</th>
                  <th className="px-3 py-2">Subcategories</th>
                  <th className="px-3 py-2">Concepts</th>
                  <th className="px-3 py-2">Prompts Linked</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-t border-zinc-100">
                    <td className="px-3 py-2">
                      {r.name}
                      {nameCounts[r.name] > 1 && (
                        <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-600">
                          DUPLICATE NAME
                        </span>
                      )}
                      <span className="ml-2 text-[10px] text-zinc-400">
                        {r.id}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-zinc-600">
                      {r.subcategoryCount}
                    </td>
                    <td className="px-3 py-2 text-zinc-600">
                      {r.conceptCount}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={
                          r.promptCount === 0
                            ? "font-semibold text-red-600"
                            : "text-zinc-900"
                        }
                      >
                        {r.promptCount}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {ran && rows.length === 0 && (
          <p className="mt-6 text-sm text-zinc-600">
            No categories found at all.
          </p>
        )}
      </div>
    </main>
  );
}
