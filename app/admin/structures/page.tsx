"use client";

import { useEffect, useState } from "react";
import { supabaseAuthClient as supabase } from "@/lib/supabase/auth-client";

type Structure = {
  id: string;
  name: string;
  description: string | null;
  fields: string[];
  sort_order: number;
};

export default function AdminStructuresPage() {
  const [structures, setStructures] =
    useState<Structure[]>([]);
  const [loading, setLoading] =
    useState(true);
  const [error, setError] = useState("");

  const [name, setName] = useState("");
  const [description, setDescription] =
    useState("");
  const [fieldsText, setFieldsText] =
    useState("");
  const [saving, setSaving] =
    useState(false);

  async function loadStructures() {
    setLoading(true);
    setError("");

    const { data, error } = await supabase
      .from("prompt_structures")
      .select("*")
      .order("sort_order", {
        ascending: true,
      });

    if (error) {
      setError(error.message);
    } else {
      setStructures(
        (data || []) as Structure[]
      );
    }

    setLoading(false);
  }

  useEffect(() => {
    loadStructures();
  }, []);

  async function handleCreate(
    event: React.FormEvent
  ) {
    event.preventDefault();
    setError("");

    if (!name.trim()) {
      setError(
        "Structure name is required."
      );
      return;
    }

    const fields = fieldsText
      .split(",")
      .map((f) => f.trim())
      .filter(Boolean);

    if (fields.length === 0) {
      setError(
        "At least one field is required (comma separated)."
      );
      return;
    }

    setSaving(true);

    const { error: insertError } =
      await supabase
        .from("prompt_structures")
        .insert({
          name: name.trim(),
          description:
            description.trim() || null,
          fields,
          sort_order:
            structures.length + 1,
        });

    setSaving(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    setName("");
    setDescription("");
    setFieldsText("");
    loadStructures();
  }

  async function handleDelete(
    id: string
  ) {
    const confirmed = window.confirm(
      "Delete this prompt structure?"
    );

    if (!confirmed) {
      return;
    }

    const { error } = await supabase
      .from("prompt_structures")
      .delete()
      .eq("id", id);

    if (!error) {
      setStructures((current) =>
        current.filter(
          (s) => s.id !== id
        )
      );
    }
  }

  const inputClass =
    "mt-2 w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-zinc-900 outline-none transition focus:border-brand";

  return (
    <main className="min-h-screen bg-white px-6 py-10 text-zinc-900">
      <div className="mx-auto max-w-2xl">
        <p className="text-sm font-semibold uppercase tracking-wider text-brand">
          Admin
        </p>

        <h1 className="mt-1 text-3xl font-bold">
          Prompt Structures
        </h1>

        <p className="mt-2 text-zinc-600">
          Reusable templates selectable in
          the Prompt Generator (e.g.
          Filmmaking, Audio, Email).
        </p>

        {error && (
          <div className="mt-6 rounded-xl border border-red-900/50 bg-white p-4">
            <p className="text-sm text-red-400">
              {error}
            </p>
          </div>
        )}

        <form
          onSubmit={handleCreate}
          className="mt-6 rounded-2xl border border-zinc-200 bg-white p-5"
        >
          <h2 className="font-semibold text-zinc-900">
            New Structure
          </h2>

          <div className="mt-4">
            <label className="text-sm font-medium text-zinc-600">
              Name
            </label>
            <input
              value={name}
              onChange={(e) =>
                setName(e.target.value)
              }
              placeholder="e.g. Product Photography"
              className={inputClass}
            />
          </div>

          <div className="mt-4">
            <label className="text-sm font-medium text-zinc-600">
              Description{" "}
              <span className="text-zinc-600">
                (optional)
              </span>
            </label>
            <input
              value={description}
              onChange={(e) =>
                setDescription(
                  e.target.value
                )
              }
              className={inputClass}
            />
          </div>

          <div className="mt-4">
            <label className="text-sm font-medium text-zinc-600">
              Fields{" "}
              <span className="text-zinc-600">
                (comma separated, in order)
              </span>
            </label>
            <input
              value={fieldsText}
              onChange={(e) =>
                setFieldsText(
                  e.target.value
                )
              }
              placeholder="Role, Task, Scene, Camera, Lighting, Motion, Style, Negative"
              className={inputClass}
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="mt-5 rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-zinc-900 transition hover:bg-brand-dark disabled:opacity-50"
          >
            {saving
              ? "Saving..."
              : "Create Structure"}
          </button>
        </form>

        {loading && (
          <div className="mt-6 h-40 animate-pulse rounded-2xl bg-white" />
        )}

        {!loading &&
          structures.length > 0 && (
            <div className="mt-6 space-y-3">
              {structures.map(
                (structure) => (
                  <div
                    key={structure.id}
                    className="rounded-xl border border-zinc-200 bg-white p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-medium text-zinc-900">
                          {structure.name}
                        </h3>

                        {structure.description && (
                          <p className="mt-1 text-sm text-zinc-600">
                            {
                              structure.description
                            }
                          </p>
                        )}

                        <p className="mt-2 text-xs text-zinc-600">
                          {structure.fields.join(
                            " → "
                          )}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          handleDelete(
                            structure.id
                          )
                        }
                        className="shrink-0 text-xs text-zinc-600 hover:text-red-400"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                )
              )}
            </div>
          )}
      </div>
    </main>
  );
}
