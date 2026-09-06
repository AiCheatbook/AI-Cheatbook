"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseAuthClient as supabase } from "@/lib/supabase/auth-client";

type Category = {
  id: string;
  name: string;
  slug: string;
};

type Subcategory = {
  id: string;
  category_id: string;
  name: string;
  slug: string;
};

type Concept = {
  id: string;
  subcategory_id: string;
  name: string;
  slug: string;
};

function generateSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export default function AdminPromptTaxonomyPage() {
  const router = useRouter();

  const [checking, setChecking] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [concepts, setConcepts] = useState<Concept[]>([]);

  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    null
  );
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState<
    string | null
  >(null);

  const [newCategoryName, setNewCategoryName] = useState("");
  const [newSubcategoryName, setNewSubcategoryName] = useState("");
  const [newConceptName, setNewConceptName] = useState("");

  const [busyId, setBusyId] = useState<string | null>(null);

  async function loadAll() {
    setLoading(true);

    const [catsRes, subsRes, conceptsRes] = await Promise.all([
      supabase
        .from("prompt_categories")
        .select("id, name, slug")
        .order("sort_order", { ascending: true }),
      supabase
        .from("prompt_subcategories")
        .select("id, category_id, name, slug")
        .order("sort_order", { ascending: true }),
      supabase
        .from("prompt_concepts")
        .select("id, subcategory_id, name, slug")
        .order("sort_order", { ascending: true }),
    ]);

    if (catsRes.error) {
      console.error(
        "AdminPromptTaxonomyPage: failed to load categories:",
        catsRes.error.message
      );
    }
    if (subsRes.error) {
      console.error(
        "AdminPromptTaxonomyPage: failed to load subcategories:",
        subsRes.error.message
      );
    }
    if (conceptsRes.error) {
      console.error(
        "AdminPromptTaxonomyPage: failed to load concepts:",
        conceptsRes.error.message
      );
    }

    setCategories(catsRes.data || []);
    setSubcategories(subsRes.data || []);
    setConcepts(conceptsRes.data || []);
    setLoading(false);
  }

  useEffect(() => {
    async function init() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (profile?.role !== "admin") {
        router.push("/");
        return;
      }

      setChecking(false);
      await loadAll();
    }

    init();
  }, [router]);

  /*
   * Turns Postgres's raw foreign-key-violation error (from the
   * ON DELETE RESTRICT constraints) into the exact message the
   * spec asked for, instead of a raw database error.
   */
  function friendlyDeleteError(
    err: { code?: string; message?: string } | null,
    childLabel: string
  ): string {
    if (err?.code === "23503") {
      return `Cannot delete — one or more ${childLabel} still use this. Reassign or delete those first.`;
    }
    return err?.message || "Failed to delete.";
  }

  async function addCategory(e: React.FormEvent) {
    e.preventDefault();
    const name = newCategoryName.trim();
    if (!name) return;

    const { data, error } = await supabase
      .from("prompt_categories")
      .insert({ name, slug: generateSlug(name) })
      .select("id, name, slug")
      .single();

    if (error) {
      setError(error.message);
      return;
    }

    setCategories((prev) => [...prev, data]);
    setNewCategoryName("");
    setError("");
  }

  async function deleteCategory(id: string) {
    if (!confirm("Delete this category?")) return;
    setBusyId(id);

    const { error } = await supabase
      .from("prompt_categories")
      .delete()
      .eq("id", id);

    if (error) {
      setError(friendlyDeleteError(error, "subcategories"));
    } else {
      setCategories((prev) => prev.filter((c) => c.id !== id));
      if (selectedCategoryId === id) setSelectedCategoryId(null);
    }

    setBusyId(null);
  }

  async function addSubcategory(e: React.FormEvent) {
    e.preventDefault();
    const name = newSubcategoryName.trim();
    if (!name || !selectedCategoryId) return;

    const { data, error } = await supabase
      .from("prompt_subcategories")
      .insert({
        category_id: selectedCategoryId,
        name,
        slug: generateSlug(name),
      })
      .select("id, category_id, name, slug")
      .single();

    if (error) {
      setError(error.message);
      return;
    }

    setSubcategories((prev) => [...prev, data]);
    setNewSubcategoryName("");
    setError("");
  }

  async function deleteSubcategory(id: string) {
    if (!confirm("Delete this subcategory?")) return;
    setBusyId(id);

    const { error } = await supabase
      .from("prompt_subcategories")
      .delete()
      .eq("id", id);

    if (error) {
      setError(friendlyDeleteError(error, "concepts"));
    } else {
      setSubcategories((prev) => prev.filter((s) => s.id !== id));
      if (selectedSubcategoryId === id) setSelectedSubcategoryId(null);
    }

    setBusyId(null);
  }

  async function addConcept(e: React.FormEvent) {
    e.preventDefault();
    const name = newConceptName.trim();
    if (!name || !selectedSubcategoryId) return;

    const { data, error } = await supabase
      .from("prompt_concepts")
      .insert({
        subcategory_id: selectedSubcategoryId,
        name,
        slug: generateSlug(name),
      })
      .select("id, subcategory_id, name, slug")
      .single();

    if (error) {
      setError(error.message);
      return;
    }

    setConcepts((prev) => [...prev, data]);
    setNewConceptName("");
    setError("");
  }

  async function deleteConcept(id: string) {
    if (!confirm("Delete this concept?")) return;
    setBusyId(id);

    const { error } = await supabase
      .from("prompt_concepts")
      .delete()
      .eq("id", id);

    if (error) {
      setError(
        friendlyDeleteError(error, "prompts or keywords")
      );
    } else {
      setConcepts((prev) => prev.filter((c) => c.id !== id));
    }

    setBusyId(null);
  }

  if (checking || loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-white text-zinc-900">
        Loading...
      </main>
    );
  }

  const visibleSubcategories = subcategories.filter(
    (s) => s.category_id === selectedCategoryId
  );
  const visibleConcepts = concepts.filter(
    (c) => c.subcategory_id === selectedSubcategoryId
  );

  return (
    <main className="min-h-screen bg-white px-6 py-10 text-zinc-900">
      <div className="mx-auto max-w-6xl">
        <Link
          href="/admin/prompts"
          className="text-sm text-zinc-600 hover:text-zinc-900"
        >
          ← Back to Prompt Library
        </Link>

        <h1 className="mt-2 text-2xl font-bold">Prompt Taxonomy</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Category → Subcategory → Concept. Click a category to see its
          subcategories, then a subcategory to see its concepts.
        </p>

        {error && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
          {/* CATEGORIES */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-4">
            <h2 className="text-sm font-semibold text-zinc-900">
              Main Categories
            </h2>

            <form onSubmit={addCategory} className="mt-3 flex gap-2">
              <input
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="New category..."
                className="flex-1 rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-brand"
              />
              <button
                type="submit"
                disabled={!newCategoryName.trim()}
                className="rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-zinc-900 disabled:opacity-50"
              >
                +
              </button>
            </form>

            <div className="mt-3 space-y-1">
              {categories.length === 0 && (
                <p className="text-xs text-zinc-500">No categories yet.</p>
              )}
              {categories.map((c) => (
                <div
                  key={c.id}
                  className={`flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm ${
                    selectedCategoryId === c.id
                      ? "bg-brand/10 text-brand-text"
                      : "hover:bg-zinc-50"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCategoryId(c.id);
                      setSelectedSubcategoryId(null);
                    }}
                    className="min-w-0 flex-1 truncate text-left"
                  >
                    {c.name}
                  </button>
                  <button
                    type="button"
                    disabled={busyId === c.id}
                    onClick={() => deleteCategory(c.id)}
                    className="shrink-0 text-xs text-zinc-400 hover:text-red-500 disabled:opacity-40"
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* SUBCATEGORIES */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-4">
            <h2 className="text-sm font-semibold text-zinc-900">
              Subcategories
            </h2>

            {!selectedCategoryId ? (
              <p className="mt-3 text-xs text-zinc-500">
                Select a category to see or add its subcategories.
              </p>
            ) : (
              <>
                <form onSubmit={addSubcategory} className="mt-3 flex gap-2">
                  <input
                    value={newSubcategoryName}
                    onChange={(e) => setNewSubcategoryName(e.target.value)}
                    placeholder="New subcategory..."
                    className="flex-1 rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-brand"
                  />
                  <button
                    type="submit"
                    disabled={!newSubcategoryName.trim()}
                    className="rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-zinc-900 disabled:opacity-50"
                  >
                    +
                  </button>
                </form>

                <div className="mt-3 space-y-1">
                  {visibleSubcategories.length === 0 && (
                    <p className="text-xs text-zinc-500">
                      No subcategories yet.
                    </p>
                  )}
                  {visibleSubcategories.map((s) => (
                    <div
                      key={s.id}
                      className={`flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm ${
                        selectedSubcategoryId === s.id
                          ? "bg-brand/10 text-brand-text"
                          : "hover:bg-zinc-50"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => setSelectedSubcategoryId(s.id)}
                        className="min-w-0 flex-1 truncate text-left"
                      >
                        {s.name}
                      </button>
                      <button
                        type="button"
                        disabled={busyId === s.id}
                        onClick={() => deleteSubcategory(s.id)}
                        className="shrink-0 text-xs text-zinc-400 hover:text-red-500 disabled:opacity-40"
                      >
                        Delete
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* CONCEPTS */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-4">
            <h2 className="text-sm font-semibold text-zinc-900">Concepts</h2>

            {!selectedSubcategoryId ? (
              <p className="mt-3 text-xs text-zinc-500">
                Select a subcategory to see or add its concepts.
              </p>
            ) : (
              <>
                <form onSubmit={addConcept} className="mt-3 flex gap-2">
                  <input
                    value={newConceptName}
                    onChange={(e) => setNewConceptName(e.target.value)}
                    placeholder="New concept..."
                    className="flex-1 rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-brand"
                  />
                  <button
                    type="submit"
                    disabled={!newConceptName.trim()}
                    className="rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-zinc-900 disabled:opacity-50"
                  >
                    +
                  </button>
                </form>

                <div className="mt-3 space-y-1">
                  {visibleConcepts.length === 0 && (
                    <p className="text-xs text-zinc-500">No concepts yet.</p>
                  )}
                  {visibleConcepts.map((c) => (
                    <div
                      key={c.id}
                      className="flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm hover:bg-zinc-50"
                    >
                      <span className="min-w-0 flex-1 truncate">
                        {c.name}
                      </span>
                      <button
                        type="button"
                        disabled={busyId === c.id}
                        onClick={() => deleteConcept(c.id)}
                        className="shrink-0 text-xs text-zinc-400 hover:text-red-500 disabled:opacity-40"
                      >
                        Delete
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        <p className="mt-6 text-xs text-zinc-500">
          Deleting a category/subcategory/concept that still has children
          (or prompts/keywords attached to a concept) is blocked by the
          database itself — you&apos;ll see exactly what&apos;s still using it
          instead of a silent failure.
        </p>
      </div>
    </main>
  );
}
