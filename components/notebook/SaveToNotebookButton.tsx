"use client";

import { useEffect, useState } from "react";
import { supabaseAuthClient } from "@/lib/supabase/auth-client";

type ContentType =
  | "community_thread"
  | "community_poll"
  | "library_item"
  | "learning_card";

type SaveToNotebookButtonProps = {
  contentType: ContentType;
  contentId: string;
  title: string;
  compact?: boolean;
};

type Collection = {
  id: string;
  name: string;
};

export default function SaveToNotebookButton({
  contentType,
  contentId,
  title,
  compact = false,
}: SaveToNotebookButtonProps) {
  const [saved, setSaved] = useState(false);
  const [checking, setChecking] =
    useState(true);
  const [pickerOpen, setPickerOpen] =
    useState(false);
  const [collections, setCollections] =
    useState<Collection[]>([]);
  const [newCollectionName, setNewCollectionName] =
    useState("");
  const [saving, setSaving] =
    useState(false);

  useEffect(() => {
    async function checkSaved() {
      const {
        data: { user },
      } =
        await supabaseAuthClient.auth.getUser();

      if (!user) {
        setChecking(false);
        return;
      }

      const { data } =
        await supabaseAuthClient
          .from("notebook_items")
          .select("id")
          .eq("user_id", user.id)
          .eq(
            "content_type",
            contentType
          )
          .eq("content_id", contentId)
          .maybeSingle();

      setSaved(Boolean(data));
      setChecking(false);
    }

    checkSaved();
  }, [contentType, contentId]);

  async function loadCollections() {
    const {
      data: { user },
    } =
      await supabaseAuthClient.auth.getUser();

    if (!user) {
      return;
    }

    const { data } = await supabaseAuthClient
      .from("notebook_collections")
      .select("id, name")
      .eq("user_id", user.id)
      .order("name", {
        ascending: true,
      });

    setCollections(
      (data || []) as Collection[]
    );
  }

  async function handleOpenPicker() {
    const {
      data: { user },
    } =
      await supabaseAuthClient.auth.getUser();

    if (!user) {
      window.location.href =
        "/login?redirect=" +
        window.location.pathname;
      return;
    }

    if (saved) {
      await handleUnsave();
      return;
    }

    await loadCollections();
    setPickerOpen(true);
  }

  async function handleSave(
    collectionId: string | null
  ) {
    setSaving(true);

    const {
      data: { user },
    } =
      await supabaseAuthClient.auth.getUser();

    if (!user) {
      setSaving(false);
      return;
    }

    const { error } = await supabaseAuthClient
      .from("notebook_items")
      .insert({
        user_id: user.id,
        collection_id: collectionId,
        content_type: contentType,
        content_id: contentId,
        title,
      });

    setSaving(false);

    if (!error) {
      setSaved(true);
      setPickerOpen(false);
    }
  }

  async function handleCreateCollectionAndSave() {
    if (!newCollectionName.trim()) {
      return;
    }

    const {
      data: { user },
    } =
      await supabaseAuthClient.auth.getUser();

    if (!user) {
      return;
    }

    const { data: newCollection } =
      await supabaseAuthClient
        .from("notebook_collections")
        .insert({
          user_id: user.id,
          name: newCollectionName.trim(),
        })
        .select("id, name")
        .single();

    setNewCollectionName("");

    if (newCollection) {
      setCollections((current) => [
        ...current,
        newCollection,
      ]);
      await handleSave(newCollection.id);
    }
  }

  async function handleUnsave() {
    const {
      data: { user },
    } =
      await supabaseAuthClient.auth.getUser();

    if (!user) {
      return;
    }

    await supabaseAuthClient
      .from("notebook_items")
      .delete()
      .eq("user_id", user.id)
      .eq("content_type", contentType)
      .eq("content_id", contentId);

    setSaved(false);
  }

  if (checking) {
    return null;
  }

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          handleOpenPicker();
        }}
        className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
          saved
            ? "border-orange-500 bg-orange-500/10 text-orange-400"
            : "border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-white"
        } ${compact ? "px-2 py-1" : ""}`}
      >
        {saved
          ? "📓 Saved"
          : "📓 Save"}
      </button>

      {pickerOpen && (
        <div
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          className="absolute right-0 top-9 z-30 w-56 rounded-xl border border-zinc-800 bg-zinc-900 p-3 shadow-xl"
        >
          <p className="text-xs font-medium text-zinc-400">
            Save to...
          </p>

          <button
            type="button"
            disabled={saving}
            onClick={() =>
              handleSave(null)
            }
            className="mt-2 block w-full rounded-lg px-2 py-1.5 text-left text-xs text-zinc-300 hover:bg-zinc-800"
          >
            Uncategorized
          </button>

          {collections.map(
            (collection) => (
              <button
                key={collection.id}
                type="button"
                disabled={saving}
                onClick={() =>
                  handleSave(
                    collection.id
                  )
                }
                className="block w-full rounded-lg px-2 py-1.5 text-left text-xs text-zinc-300 hover:bg-zinc-800"
              >
                {collection.name}
              </button>
            )
          )}

          <div className="mt-2 flex gap-1 border-t border-zinc-800 pt-2">
            <input
              value={newCollectionName}
              onChange={(e) =>
                setNewCollectionName(
                  e.target.value
                )
              }
              placeholder="New collection..."
              className="min-w-0 flex-1 rounded-lg border border-zinc-800 bg-black px-2 py-1 text-xs text-white outline-none"
            />

            <button
              type="button"
              onClick={
                handleCreateCollectionAndSave
              }
              disabled={
                !newCollectionName.trim() ||
                saving
              }
              className="rounded-lg bg-orange-500 px-2 py-1 text-xs font-semibold text-white disabled:opacity-50"
            >
              +
            </button>
          </div>

          <button
            type="button"
            onClick={() =>
              setPickerOpen(false)
            }
            className="mt-2 w-full text-center text-xs text-zinc-600 hover:text-white"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
