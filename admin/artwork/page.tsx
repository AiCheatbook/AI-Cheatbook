"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseAuthClient } from "@/lib/supabase/auth-client";

type ArtworkRow = {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  status: string;
  created_at: string;
  moderation_notes: string | null;
  profiles: {
    display_name: string | null;
    email: string | null;
  } | null;
  media_assets: {
    media_type: string;
    storage_path: string;
    mime_type: string | null;
  } | null;
};

const STATUS_FILTERS = [
  "submitted",
  "under_review",
  "approved",
  "published",
  "rejected",
  "hidden",
  "all",
];

export default function AdminArtworkPage() {
  const router = useRouter();

  const [checking, setChecking] =
    useState(true);
  const [items, setItems] = useState<
    ArtworkRow[]
  >([]);
  const [loading, setLoading] =
    useState(true);
  const [statusFilter, setStatusFilter] =
    useState("submitted");
  const [notesDraft, setNotesDraft] =
    useState<Record<string, string>>({});

  async function loadArtwork() {
    setLoading(true);

    let query = supabaseAuthClient
      .from("community_artwork")
      .select(
        `
          id, title, description, category,
          status, created_at, moderation_notes,
          profiles ( display_name, email ),
          media_assets (
            media_type, storage_path, mime_type
          )
        `
      )
      .order("created_at", {
        ascending: false,
      });

    if (statusFilter !== "all") {
      query = query.eq(
        "status",
        statusFilter
      );
    }

    const { data } = await query;

    setItems(
      (data ||
        []) as unknown as ArtworkRow[]
    );
    setLoading(false);
  }

  useEffect(() => {
    async function checkAccess() {
      const {
        data: { user },
      } =
        await supabaseAuthClient.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      const { data: profile } =
        await supabaseAuthClient
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();

      if (
        profile?.role !== "admin" &&
        profile?.role !== "moderator"
      ) {
        router.push("/");
        return;
      }

      setChecking(false);
      await loadArtwork();
    }

    checkAccess();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, statusFilter]);

  async function handleStatusChange(
    item: ArtworkRow,
    newStatus: string
  ) {
    const {
      data: { user },
    } =
      await supabaseAuthClient.auth.getUser();

    await supabaseAuthClient
      .from("community_artwork")
      .update({
        status: newStatus,
        reviewed_at:
          new Date().toISOString(),
        reviewed_by: user?.id || null,
        moderation_notes:
          notesDraft[item.id] ??
          item.moderation_notes,
      })
      .eq("id", item.id);

    await supabaseAuthClient
      .from("audit_log")
      .insert({
        actor_id: user?.id || null,
        action: `artwork_${newStatus}`,
        target_type: "community_artwork",
        target_id: item.id,
        details: { title: item.title },
      });

    await loadArtwork();
  }

  if (checking) {
    return null;
  }

  return (
    <main className="min-h-screen bg-white px-6 py-12 text-zinc-900">
      <div className="mx-auto max-w-4xl">
        <h1 className="text-2xl font-bold">
          Artwork Moderation
        </h1>

        <div className="mt-4 flex flex-wrap gap-2">
          {STATUS_FILTERS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() =>
                setStatusFilter(s)
              }
              className={`rounded-full border px-3 py-1.5 text-xs capitalize ${
                statusFilter === s
                  ? "border-brand bg-brand text-zinc-900"
                  : "border-zinc-300 text-zinc-600"
              }`}
            >
              {s.replace("_", " ")}
            </button>
          ))}
        </div>

        {loading && (
          <div className="mt-6 space-y-3">
            {Array.from({
              length: 3,
            }).map((_, i) => (
              <div
                key={i}
                className="h-32 animate-pulse rounded-2xl bg-zinc-100"
              />
            ))}
          </div>
        )}

        {!loading &&
          items.length === 0 && (
            <p className="mt-6 text-sm text-zinc-600">
              No artwork matches this
              filter.
            </p>
          )}

        {!loading &&
          items.length > 0 && (
            <div className="mt-6 space-y-4">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm"
                >
                  <div className="flex gap-4">
                    <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-zinc-100">
                      {item.media_assets
                        ?.media_type ===
                      "image" ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={
                            item
                              .media_assets
                              .storage_path
                          }
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : item
                          .media_assets
                          ?.media_type ===
                        "video" ? (
                        <video
                          src={
                            item
                              .media_assets
                              .storage_path
                          }
                          controls
                          className="h-full w-full object-cover"
                        />
                      ) : item
                          .media_assets
                          ?.media_type ===
                        "audio" ? (
                        <span className="text-2xl">
                          🔊
                        </span>
                      ) : (
                        <span className="text-2xl">
                          ▶️
                        </span>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs capitalize text-zinc-600">
                          {item.status.replace(
                            "_",
                            " "
                          )}
                        </span>
                        <span className="text-xs text-zinc-500">
                          {item
                            .media_assets
                            ?.media_type ||
                            "unknown"}
                        </span>
                      </div>

                      <h3 className="mt-1 font-medium text-zinc-900">
                        {item.title}
                      </h3>

                      {item.description && (
                        <p className="mt-1 line-clamp-2 text-sm text-zinc-600">
                          {
                            item.description
                          }
                        </p>
                      )}

                      <p className="mt-1 text-xs text-zinc-400">
                        {item.profiles
                          ?.display_name ||
                          item.profiles
                            ?.email ||
                          "Unknown"}{" "}
                        ·{" "}
                        {new Date(
                          item.created_at
                        ).toLocaleDateString()}
                      </p>

                      {item
                        .media_assets
                        ?.media_type ===
                        "youtube" && (
                        <a
                          href={
                            item
                              .media_assets
                              .storage_path
                          }
                          target="_blank"
                          rel="noreferrer"
                          className="mt-1 inline-block text-xs text-brand-text hover:underline"
                        >
                          Open on YouTube
                          →
                        </a>
                      )}
                    </div>
                  </div>

                  <textarea
                    value={
                      notesDraft[
                        item.id
                      ] ??
                      item.moderation_notes ??
                      ""
                    }
                    onChange={(e) =>
                      setNotesDraft(
                        (current) => ({
                          ...current,
                          [item.id]:
                            e.target
                              .value,
                        })
                      )
                    }
                    placeholder="Moderation notes (optional)"
                    rows={2}
                    className="mt-3 w-full rounded-lg border border-zinc-200 px-3 py-2 text-xs outline-none"
                  />

                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        handleStatusChange(
                          item,
                          "published"
                        )
                      }
                      className="rounded-lg border border-green-300 px-3 py-1.5 text-xs text-green-700 hover:bg-green-50"
                    >
                      Approve &amp;
                      Publish
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        handleStatusChange(
                          item,
                          "rejected"
                        )
                      }
                      className="rounded-lg border border-red-300 px-3 py-1.5 text-xs text-red-700 hover:bg-red-50"
                    >
                      Reject
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        handleStatusChange(
                          item,
                          "hidden"
                        )
                      }
                      className="rounded-lg border border-yellow-300 px-3 py-1.5 text-xs text-yellow-700 hover:bg-yellow-50"
                    >
                      Hide
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
      </div>
    </main>
  );
}
