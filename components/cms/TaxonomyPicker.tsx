"use client";

import { useEffect, useState } from "react";
import { supabaseAuthClient as supabase } from "@/lib/supabase/auth-client";

type Category = { id: string; name: string; slug: string };
type Subcategory = { id: string; category_id: string; name: string; slug: string };
type Concept = { id: string; subcategory_id: string; name: string; slug: string };

function generateSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

type TaxonomyPickerProps = {
  /* The currently-assigned concept_id for this prompt, or null. */
  value: string | null;
  onChange: (conceptId: string | null) => void;
};

/*
 * Lets an admin assign a Prompt to a Category → Subcategory →
 * Concept path — either picking an existing one (cascading
 * selects, each level only shows children of the parent already
 * chosen), or defining a brand new path inline without leaving
 * this form. Either way, the three rows genuinely exist in
 * prompt_categories/prompt_subcategories/prompt_concepts by the
 * time this reports a concept_id back — nothing is deferred to
 * Prompt save time, since the Keywords step (a separate
 * component, scoped by concept_id) needs a real row to attach to.
 */
export default function TaxonomyPicker({
  value,
  onChange,
}: TaxonomyPickerProps) {
  const [mode, setMode] = useState<"existing" | "new">(
    value ? "existing" : "existing"
  );

  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [concepts, setConcepts] = useState<Concept[]>([]);
  const [loaded, setLoaded] = useState(false);

  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState("");

  const [addingSubcategory, setAddingSubcategory] = useState(false);
  const [addingConcept, setAddingConcept] = useState(false);
  const [newSubcategoryName, setNewSubcategoryName] = useState("");
  const [newConceptName, setNewConceptName] = useState("");

  const [newCategoryName, setNewCategoryName] = useState("");
  const [newPathSubcategoryName, setNewPathSubcategoryName] = useState("");
  const [newPathConceptName, setNewPathConceptName] = useState("");
  const [creatingPath, setCreatingPath] = useState(false);

  const [error, setError] = useState("");

  async function loadAll() {
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

    setCategories(catsRes.data || []);
    setSubcategories(subsRes.data || []);
    setConcepts(conceptsRes.data || []);
    setLoaded(true);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadAll();
  }, []);

  // If a concept is already assigned (editing an existing prompt),
  // pre-select its category/subcategory once data has loaded.
  useEffect(() => {
    if (!loaded || !value) return;

    const concept = concepts.find((c) => c.id === value);
    if (!concept) return;

    const subcategory = subcategories.find(
      (s) => s.id === concept.subcategory_id
    );
    if (!subcategory) return;

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelectedCategoryId(subcategory.category_id);
    setSelectedSubcategoryId(subcategory.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, value]);

  const visibleSubcategories = subcategories.filter(
    (s) => s.category_id === selectedCategoryId
  );
  const visibleConcepts = concepts.filter(
    (c) => c.subcategory_id === selectedSubcategoryId
  );

  async function handleAddSubcategory() {
    const name = newSubcategoryName.trim();
    if (!name || !selectedCategoryId) return;

    const { data, error: err } = await supabase
      .from("prompt_subcategories")
      .insert({
        category_id: selectedCategoryId,
        name,
        slug: generateSlug(name),
      })
      .select("id, category_id, name, slug")
      .single();

    if (err) {
      setError(err.message);
      return;
    }

    setSubcategories((prev) => [...prev, data]);
    setSelectedSubcategoryId(data.id);
    setNewSubcategoryName("");
    setAddingSubcategory(false);
    setError("");
  }

  async function handleAddConcept() {
    const name = newConceptName.trim();
    if (!name || !selectedSubcategoryId) return;

    const { data, error: err } = await supabase
      .from("prompt_concepts")
      .insert({
        subcategory_id: selectedSubcategoryId,
        name,
        slug: generateSlug(name),
      })
      .select("id, subcategory_id, name, slug")
      .single();

    if (err) {
      setError(err.message);
      return;
    }

    setConcepts((prev) => [...prev, data]);
    onChange(data.id);
    setNewConceptName("");
    setAddingConcept(false);
    setError("");
  }

  async function handleCreateFullPath() {
    const categoryName = newCategoryName.trim();
    const subcategoryName = newPathSubcategoryName.trim();
    const conceptName = newPathConceptName.trim();

    if (!categoryName || !subcategoryName || !conceptName) {
      setError(
        "Main Category, Subcategory, and Concept are all required to create a new path."
      );
      return;
    }

    setCreatingPath(true);
    setError("");

    const { data: category, error: catErr } = await supabase
      .from("prompt_categories")
      .insert({ name: categoryName, slug: generateSlug(categoryName) })
      .select("id, name, slug")
      .single();

    if (catErr) {
      setError(catErr.message);
      setCreatingPath(false);
      return;
    }

    const { data: subcategory, error: subErr } = await supabase
      .from("prompt_subcategories")
      .insert({
        category_id: category.id,
        name: subcategoryName,
        slug: generateSlug(subcategoryName),
      })
      .select("id, category_id, name, slug")
      .single();

    if (subErr) {
      setError(subErr.message);
      setCreatingPath(false);
      return;
    }

    const { data: concept, error: conceptErr } = await supabase
      .from("prompt_concepts")
      .insert({
        subcategory_id: subcategory.id,
        name: conceptName,
        slug: generateSlug(conceptName),
      })
      .select("id, subcategory_id, name, slug")
      .single();

    if (conceptErr) {
      setError(conceptErr.message);
      setCreatingPath(false);
      return;
    }

    setCategories((prev) => [...prev, category]);
    setSubcategories((prev) => [...prev, subcategory]);
    setConcepts((prev) => [...prev, concept]);
    setSelectedCategoryId(category.id);
    setSelectedSubcategoryId(subcategory.id);
    onChange(concept.id);

    setNewCategoryName("");
    setNewPathSubcategoryName("");
    setNewPathConceptName("");
    setCreatingPath(false);
    setMode("existing");
  }

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4">
      <p className="text-sm font-semibold text-zinc-900">Categorization</p>

      <div className="mt-2 flex gap-4 text-sm">
        <label className="flex items-center gap-1.5">
          <input
            type="radio"
            checked={mode === "existing"}
            onChange={() => setMode("existing")}
          />
          Use Existing Category
        </label>
        <label className="flex items-center gap-1.5">
          <input
            type="radio"
            checked={mode === "new"}
            onChange={() => setMode("new")}
          />
          Create New Category
        </label>
      </div>

      {error && (
        <p className="mt-2 text-xs text-red-600">{error}</p>
      )}

      {mode === "existing" ? (
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs text-zinc-600">
              Main Category
            </label>
            <select
              value={selectedCategoryId}
              onChange={(e) => {
                setSelectedCategoryId(e.target.value);
                setSelectedSubcategoryId("");
                onChange(null);
              }}
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-brand"
            >
              <option value="">Select...</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs text-zinc-600">
              Subcategory
            </label>
            {!selectedCategoryId ? (
              <p className="pt-2 text-xs text-zinc-400">
                Select a category first
              </p>
            ) : addingSubcategory ? (
              <div className="flex gap-1">
                <input
                  autoFocus
                  value={newSubcategoryName}
                  onChange={(e) => setNewSubcategoryName(e.target.value)}
                  placeholder="New subcategory..."
                  className="w-full rounded-lg border border-zinc-200 px-2 py-2 text-sm outline-none focus:border-brand"
                />
                <button
                  type="button"
                  onClick={handleAddSubcategory}
                  className="shrink-0 rounded-lg bg-brand px-2 text-xs font-semibold text-zinc-900"
                >
                  Add
                </button>
              </div>
            ) : (
              <select
                value={selectedSubcategoryId}
                onChange={(e) => {
                  if (e.target.value === "__new__") {
                    setAddingSubcategory(true);
                    return;
                  }
                  setSelectedSubcategoryId(e.target.value);
                  onChange(null);
                }}
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-brand"
              >
                <option value="">Select...</option>
                {visibleSubcategories.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
                <option value="__new__">+ Create New Subcategory</option>
              </select>
            )}
          </div>

          <div>
            <label className="mb-1 block text-xs text-zinc-600">
              Concept
            </label>
            {!selectedSubcategoryId ? (
              <p className="pt-2 text-xs text-zinc-400">
                Select a subcategory first
              </p>
            ) : addingConcept ? (
              <div className="flex gap-1">
                <input
                  autoFocus
                  value={newConceptName}
                  onChange={(e) => setNewConceptName(e.target.value)}
                  placeholder="New concept..."
                  className="w-full rounded-lg border border-zinc-200 px-2 py-2 text-sm outline-none focus:border-brand"
                />
                <button
                  type="button"
                  onClick={handleAddConcept}
                  className="shrink-0 rounded-lg bg-brand px-2 text-xs font-semibold text-zinc-900"
                >
                  Add
                </button>
              </div>
            ) : (
              <select
                value={value || ""}
                onChange={(e) => {
                  if (e.target.value === "__new__") {
                    setAddingConcept(true);
                    return;
                  }
                  onChange(e.target.value || null);
                }}
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-brand"
              >
                <option value="">Select...</option>
                {visibleConcepts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
                <option value="__new__">+ Create New Concept</option>
              </select>
            )}
          </div>
        </div>
      ) : (
        <div className="mt-3 space-y-2">
          <input
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            placeholder="Main Category (e.g. AI Filmmaking)"
            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-brand"
          />
          <input
            value={newPathSubcategoryName}
            onChange={(e) => setNewPathSubcategoryName(e.target.value)}
            placeholder="Subcategory (e.g. Camera Movement)"
            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-brand"
          />
          <input
            value={newPathConceptName}
            onChange={(e) => setNewPathConceptName(e.target.value)}
            placeholder="Concept (e.g. Static Shot)"
            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-brand"
          />
          <button
            type="button"
            disabled={creatingPath}
            onClick={handleCreateFullPath}
            className="rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-zinc-900 disabled:opacity-50"
          >
            {creatingPath ? "Creating..." : "Create Category Path"}
          </button>
        </div>
      )}

      {value && (
        <p className="mt-3 text-xs text-zinc-500">
          Assigned to:{" "}
          {(() => {
            const concept = concepts.find((c) => c.id === value);
            const sub = concept
              ? subcategories.find((s) => s.id === concept.subcategory_id)
              : null;
            const cat = sub
              ? categories.find((c) => c.id === sub.category_id)
              : null;
            return concept
              ? `${cat?.name || "?"} → ${sub?.name || "?"} → ${concept.name}`
              : "—";
          })()}
        </p>
      )}
    </div>
  );
}
