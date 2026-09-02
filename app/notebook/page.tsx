"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabaseAuthClient } from "@/lib/supabase/auth-client";

type Collection = {
  id: string;
  name: string;
};

type ContentType =
  | "community_thread"
  | "community_poll"
  | "library_item"
  | "learning_card"
  | "note";

type NotebookItem = {
  id: string;
  collection_id: string | null;
  content_type: ContentType;
  content_id: string | null;
  title: string;
  note_text: string | null;
  created_at: string;
};

function linkFor(item: NotebookItem): string | null {
  if (!item.content_id) {
    return null;
  }

  switch (item.content_type) {
    case "community_thread":
      return `/discussions/${item.content_id}`;
    case "community_poll":
      return `/community/polls/${item.content_id}`;
    default:
      return null;
  }
}

const TYPE_LABELS: Record<
  ContentType,
  string
> = {
  community_thread: "Community Post",
  community_poll: "Poll",
  library_item: "Prompt",
  learning_card: "Learning Card",
  note: "Note",
};

export default function NotebookPage() {
  const router = useRouter();

  const [checkingAuth, setCheckingAuth] =
    useState(true);
  const [collections, setCollections] =
    useState<Collection[]>([]);
  const [items, setItems] = useState<
    NotebookItem[]
  >([]);
  const [activeCollection, setActiveCollection] =
    useState<string | "all" | "uncategorized">(
      "all"
    );
  const [loading, setLoading] =
    useState(true);
  const [newNoteText, setNewNoteText] =
    useState("");
  const [newNoteTitle, setNewNoteTitle] =
    useState("");
  const [addingNote, setAddingNote] =
    useState(false);
  const [newCollectionName, setNewCollectionName] =
    useState("");

  async function loadNotebook() {
    setLoading(true);

    const {
      data: { user },
    } =
      await supabaseAuthClient.auth.getUser();

    if (!user) {
      return;
    }

    const [
      collectionsResponse,
      itemsResponse,
    ] = await Promise.all([
      supabaseAuthClient
        .from("notebook_collections")
        .select("id, name")
        .eq("user_id", user.id)
        .order("name", {
          ascending: true,
        }),
      supabaseAuthClient
        .from("notebook_items")
        .select(
          "id, collection_id, content_type, content_id, title, note_text, created_at"
        )
        .eq("user_id", user.id)
        .order("created_at", {
          ascending: false,
        }),
    ]);

    setCollections(
      (collectionsResponse.data ||
        []) as Collection[]
    );
    setItems(
      (itemsResponse.data ||
        []) as NotebookItem[]
    );
    setLoading(false);
  }

  useEffect(() => {
    async function init() {
      const {
        data: { user },
      } =
        await supabaseAuthClient.auth.getUser();

      if (!user) {
        router.push(
          "/login?redirect=/notebook"
        );
        return;
      }

      setCheckingAuth(false);
      await loadNotebook();
    }

    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  async function handleAddNote(
    event: React.FormEvent
  ) {
    event.preventDefault();

    if (!newNoteText.trim()) {
      return;
    }

    setAddingNote(true);

    const {
      data: { user },
    } =
      await supabaseAuthClient.auth.getUser();

    if (!user) {
      setAddingNote(false);
      return;
    }

    const { error } = await supabaseAuthClient
      .from("notebook_items")
      .insert({
        user_id: user.id,
        collection_id:
          activeCollection === "all" ||
          activeCollection ===
            "uncategorized"
            ? null
            : activeCollection,
        content_type: "note",
        content_id: null,
        title:
          newNoteTitle.trim() ||
          "Untitled note",
        note_text: newNoteText.trim(),
      });

    setAddingNote(false);

    if (!error) {
      setNewNoteText("");
      setNewNoteTitle("");
      await loadNotebook();
    }
  }

  async function handleCreateCollection(
    event: React.FormEvent
  ) {
    event.preventDefault();

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

    const { error } = await supabaseAuthClient
      .from("notebook_collections")
      .insert({
        user_id: user.id,
        name: newCollectionName.trim(),
      });

    if (!error) {
      setNewCollectionName("");
      await loadNotebook();
    }
  }

  async function handleRemoveItem(
    id: string
  ) {
    await supabaseAuthClient
      .from("notebook_items")
      .delete()
      .eq("id", id);

    setItems((current) =>
      current.filter((i) => i.id !== id)
    );
  }

  async function handleDeleteCollection(
    id: string
  ) {
    const confirmed = window.confirm(
      "Delete this collection? Items inside will move to Uncategorized, not be deleted."
    );

    if (!confirmed) {
      return;
    }

    await supabaseAuthClient
      .from("notebook_collections")
      .delete()
      .eq("id", id);

    if (activeCollection === id) {
      setActiveCollection("all");
    }

    await loadNotebook();
  }

  if (checkingAuth) {
    return null;
  }

  const filteredItems = items.filter(
    (item) => {
      if (activeCollection === "all") {
        return true;
      }
      if (
        activeCollection ===
        "uncategorized"
      ) {
        return !item.collection_id;
      }
      return (
        item.collection_id ===
        activeCollection
      );
    }
  );

  return (
    <main className="min-h-screen bg-black px-6 py-12 text-white">
      <div className="mx-auto flex max-w-5xl gap-6">
        <aside className="hidden w-56 shrink-0 lg:block">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-600">
            Collections
          </h2>

          <nav className="mt-2 space-y-0.5">
            <button
              type="button"
              onClick={() =>
                setActiveCollection("all")
              }
              className={`block w-full rounded-lg px-3 py-2 text-left text-sm ${
                activeCollection === "all"
                  ? "bg-zinc-800 text-white"
                  : "text-zinc-400 hover:bg-zinc-900"
              }`}
            >
              All Items
            </button>

            <button
              type="button"
              onClick={() =>
                setActiveCollection(
                  "uncategorized"
                )
              }
              className={`block w-full rounded-lg px-3 py-2 text-left text-sm ${
                activeCollection ===
                "uncategorized"
                  ? "bg-zinc-800 text-white"
                  : "text-zinc-400 hover:bg-zinc-900"
              }`}
            >
              Uncategorized
            </button>

            {collections.map(
              (collection) => (
                <div
                  key={collection.id}
                  className="group flex items-center"
                >
                  <button
                    type="button"
                    onClick={() =>
                      setActiveCollection(
                        collection.id
                      )
                    }
                    className={`block flex-1 rounded-lg px-3 py-2 text-left text-sm ${
                      activeCollection ===
                      collection.id
                        ? "bg-zinc-800 text-white"
                        : "text-zinc-400 hover:bg-zinc-900"
                    }`}
                  >
                    {collection.name}
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      handleDeleteCollection(
                        collection.id
                      )
                    }
                    className="hidden px-1 text-xs text-zinc-600 hover:text-red-400 group-hover:block"
                  >
                    ✕
                  </button>
                </div>
              )
            )}
          </nav>

          <form
            onSubmit={
              handleCreateCollection
            }
            className="mt-4"
          >
            <input
              value={newCollectionName}
              onChange={(e) =>
                setNewCollectionName(
                  e.target.value
                )
              }
              placeholder="New collection..."
              className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-white outline-none focus:border-brand"
            />
          </form>
        </aside>

        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold">
            📓 My AI Notebook
          </h1>
          <p className="mt-1 text-zinc-400">
            Save posts, prompts, and
            learning cards you want to
            come back to.
          </p>

          <form
            onSubmit={handleAddNote}
            className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-900 p-4"
          >
            <p className="text-sm font-medium text-zinc-300">
              Add a note
            </p>

            <input
              value={newNoteTitle}
              onChange={(e) =>
                setNewNoteTitle(
                  e.target.value
                )
              }
              placeholder="Title (optional)"
              className="mt-2 w-full rounded-lg border border-zinc-800 bg-black px-3 py-2 text-sm text-white outline-none focus:border-brand"
            />

            <textarea
              value={newNoteText}
              onChange={(e) =>
                setNewNoteText(
                  e.target.value
                )
              }
              rows={2}
              placeholder="Write something..."
              className="mt-2 w-full rounded-lg border border-zinc-800 bg-black px-3 py-2 text-sm text-white outline-none focus:border-brand"
            />

            <button
              type="submit"
              disabled={
                !newNoteText.trim() ||
                addingNote
              }
              className="mt-2 rounded-lg bg-brand px-4 py-1.5 text-xs font-semibold text-white hover:bg-brand-dark disabled:opacity-50"
            >
              {addingNote
                ? "Saving..."
                : "Add Note"}
            </button>
          </form>

          {loading && (
            <div className="mt-6 space-y-3">
              {Array.from({
                length: 3,
              }).map((_, i) => (
                <div
                  key={i}
                  className="h-16 animate-pulse rounded-xl bg-zinc-900"
                />
              ))}
            </div>
          )}

          {!loading &&
            filteredItems.length ===
              0 && (
              <div className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-900 p-8 text-center">
                <p className="text-zinc-400">
                  No saved content.
                </p>
                <p className="mt-1 text-sm text-zinc-600">
                  Save useful ideas to
                  your AI Notebook from
                  anywhere on the site.
                </p>
              </div>
            )}

          {!loading &&
            filteredItems.length > 0 && (
              <div className="mt-6 space-y-3">
                {filteredItems.map(
                  (item) => {
                    const href =
                      linkFor(item);

                    const content = (
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-500">
                            {
                              TYPE_LABELS[
                                item
                                  .content_type
                              ]
                            }
                          </span>

                          <h3 className="mt-1.5 truncate font-medium text-white">
                            {item.title}
                          </h3>

                          {item.note_text && (
                            <p className="mt-1 text-sm text-zinc-400">
                              {
                                item.note_text
                              }
                            </p>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={(
                            e
                          ) => {
                            e.preventDefault();
                            handleRemoveItem(
                              item.id
                            );
                          }}
                          className="shrink-0 text-xs text-zinc-600 hover:text-red-400"
                        >
                          Remove
                        </button>
                      </div>
                    );

                    return href ? (
                      <Link
                        key={item.id}
                        href={href}
                        className="block rounded-2xl border border-zinc-800 bg-zinc-900 p-4 transition hover:border-brand/40"
                      >
                        {content}
                      </Link>
                    ) : (
                      <div
                        key={item.id}
                        className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4"
                      >
                        {content}
                      </div>
                    );
                  }
                )}
              </div>
            )}
        </div>
      </div>
    </main>
  );
}
